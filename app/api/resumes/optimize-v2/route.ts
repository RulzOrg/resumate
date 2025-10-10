import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, getJobAnalysisById, getOrCreateUser, getUserById, ensureUserSyncRecord } from "@/lib/db"
import { canPerformAction } from "@/lib/subscription"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"
import { SystemPromptV1OutputSchema, PreferencesSchema, type SystemPromptV1Output } from "@/lib/schemas-v2"
import { buildSystemPromptV1 } from "@/lib/prompts/system-prompt-v1"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResult = rateLimit(`optimize-v2:${userId}`, 5, 300000) // 5 requests per 5 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before making another optimization request.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    // Get or create user in our database
    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Check subscription limits
    const canOptimize = await canPerformAction('resumeOptimizations')
    if (!canOptimize) {
      return NextResponse.json({ 
        error: "You've reached your monthly resume optimization limit. Upgrade to Pro for unlimited optimizations.",
        code: "LIMIT_EXCEEDED"
      }, { status: 403 })
    }

    const body = await request.json()
    const { resume_id, job_analysis_id, preferences: rawPreferences } = body

    if (!resume_id || !job_analysis_id) {
      throw new AppError("Resume ID and Job Analysis ID are required", 400)
    }

    // Validate preferences with Zod if provided
    const preferences = rawPreferences ? PreferencesSchema.parse(rawPreferences) : undefined

    // Get the resume and job analysis
    const resume = await getResumeById(resume_id, user.id)
    if (!resume) {
      throw new AppError("Resume not found", 404)
    }

    const jobAnalysis = await getJobAnalysisById(job_analysis_id, user.id)
    if (!jobAnalysis) {
      throw new AppError("Job analysis not found", 404)
    }

    if (!resume.content_text || resume.content_text.trim().length < 50) {
      throw new AppError(
        "Resume content is too short or missing. Please re-upload your resume or extract content first.",
        400,
      )
    }

    // Build System Prompt v1.1
    const systemPrompt = buildSystemPromptV1({
      masterResume: resume.content_text,
      jobPosting: jobAnalysis.job_description,
      preferences,
    })

    console.log('[optimize-v2] Calling GPT-4o with System Prompt v1.1...')

    // Call GPT-4o with structured output
    const optimization = await withRetry(
      async () => {
        const { object } = await generateObject({
          model: openai("gpt-4o"),
          schema: SystemPromptV1OutputSchema,
          prompt: systemPrompt,
          temperature: 0.7,
        })
        return object as SystemPromptV1Output
      },
      3,
      2000,
    )

    console.log('[optimize-v2] Optimization complete:', {
      hasAnalysis: !!optimization.analysis,
      hasUI: !!optimization.ui,
      hasQA: !!optimization.qa,
      qaScore: optimization.qa.scores.keyword_coverage_0_to_100,
      mustHaveCoverage: optimization.qa.must_have_coverage.length,
    })

    // Ensure user row exists for FK integrity
    const userRow = await getUserById(resume.user_id)
    if (!userRow) {
      await ensureUserSyncRecord({
        id: resume.user_id,
        email: user.email,
        name: user.name,
        clerkUserId: user.clerk_user_id,
        subscription_plan: user.subscription_plan,
        subscription_status: user.subscription_status,
      })
    }

    // Create the optimized resume record with v2 fields
    // For now, we'll store structured_output in optimization_summary as a workaround
    // until we add the database columns
    const optimizedResume = await createOptimizedResumeV2({
      user_id: resume.user_id,
      original_resume_id: resume_id,
      job_analysis_id: job_analysis_id,
      title: `${resume.title} - Optimized for ${jobAnalysis.job_title}`,
      optimized_content: optimization.tailored_resume_text.ats_plain_text,
      optimization_summary: {
        changes_made: optimization.requirement_evidence_map.map(r => `${r.requirement}: ${r.evidence.length} proof points`),
        keywords_added: optimization.analysis.screening_keywords,
        skills_highlighted: [
          ...optimization.skills_block.Domain,
          ...optimization.skills_block.ResearchAndValidation,
          ...optimization.skills_block.ProductAndSystems,
          ...optimization.skills_block.Tools,
        ],
        sections_improved: optimization.ui.include_parts_summary,
        match_score_before: 0, // Not calculated yet
        match_score_after: optimization.qa.scores.keyword_coverage_0_to_100,
        recommendations: optimization.qa.warnings,
      },
      match_score: optimization.qa.scores.keyword_coverage_0_to_100,
      structured_output: optimization,
      qa_metrics: optimization.qa,
    })

    console.log('[optimize-v2] Created optimized resume:', {
      id: optimizedResume.id,
      qaScore: optimization.qa.scores.keyword_coverage_0_to_100,
    })

    return NextResponse.json(
      {
        optimized_resume: optimizedResume,
        structured_output: optimization,
        version: 'v2',
        system_prompt_version: '1.1',
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('[optimize-v2] Error:', error)
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error, code: errorInfo.code }, { status: errorInfo.statusCode })
  }
}

// Temporary helper to create optimized resume with v2 fields
// This will be moved to lib/db.ts once we add the database columns
async function createOptimizedResumeV2(data: {
  user_id: string
  original_resume_id: string
  job_analysis_id: string
  title: string
  optimized_content: string
  optimization_summary: any
  match_score: number
  structured_output: SystemPromptV1Output
  qa_metrics: any
}) {
  const { sql } = await import("@/lib/db")
  
  const [optimizedResume] = await sql`
    INSERT INTO optimized_resumes (
      user_id, original_resume_id, job_analysis_id, title, optimized_content,
      optimization_summary, match_score, improvements_made, keywords_added, 
      skills_highlighted, structured_output, qa_metrics, export_formats,
      created_at, updated_at
    )
    VALUES (
      ${data.user_id}, ${data.original_resume_id}, ${data.job_analysis_id}, 
      ${data.title}, ${data.optimized_content}, ${JSON.stringify(data.optimization_summary)},
      ${data.match_score || null}, ${data.optimization_summary.changes_made}, 
      ${data.optimization_summary.keywords_added}, ${data.optimization_summary.skills_highlighted},
      ${JSON.stringify(data.structured_output)}, ${JSON.stringify(data.qa_metrics)}, NULL,
      NOW(), NOW()
    )
    RETURNING *
  `
  
  return optimizedResume as any
}
