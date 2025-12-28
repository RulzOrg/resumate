import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, createOptimizedResume, getOrCreateUser, getUserById, ensureUserSyncRecord, incrementUsage } from "@/lib/db"
import { canPerformAction } from "@/lib/subscription"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"

const optimizationSchema = z.object({
  optimized_content: z.string().describe("The optimized resume content in markdown format"),
  changes_made: z.array(z.string()).describe("List of specific changes made to the resume"),
  keywords_added: z.array(z.string()).describe("Keywords that were added or emphasized"),
  skills_highlighted: z.array(z.string()).describe("Skills that were highlighted or repositioned"),
  sections_improved: z.array(z.string()).describe("Resume sections that were improved"),
  match_score_before: z.number().min(0).max(100).describe("Estimated match score before optimization"),
  match_score_after: z.number().min(0).max(100).describe("Estimated match score after optimization"),
  recommendations: z.array(z.string()).describe("Additional recommendations for the candidate"),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResult = rateLimit(`optimize:${userId}`, 5, 300000) // 5 requests per 5 minutes
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

    const { resume_id, job_title, company_name, job_description } = await request.json()

    console.log('[Optimize] Request received:', {
      resume_id,
      job_title,
      user_id: user.id,
      clerk_user_id: user.clerk_user_id,
    })

    if (!resume_id) {
      throw new AppError("Resume ID is required", 400)
    }

    if (!job_title || !job_description) {
      throw new AppError("Job title and job description are required", 400)
    }

    if (job_description.trim().length < 50) {
      throw new AppError("Job description is too short. Please provide more details about the position.", 400)
    }

    // Get the resume
    console.log('[Optimize] Looking up resume:', { resume_id, user_id: user.id })
    const resume = await getResumeById(resume_id, user.id)
    
    if (!resume) {
      // Debug: Check if resume exists at all (without user filter)
      const { sql } = await import("@/lib/db")
      const [anyResume] = await sql`SELECT id, user_id, title, deleted_at FROM resumes WHERE id = ${resume_id}`
      console.log('[Optimize] Resume lookup failed. Debug info:', {
        resume_id,
        requested_user_id: user.id,
        found_resume: anyResume ? {
          id: anyResume.id,
          user_id: anyResume.user_id,
          title: anyResume.title,
          deleted: !!anyResume.deleted_at,
          user_mismatch: anyResume.user_id !== user.id,
        } : 'NOT_FOUND_AT_ALL'
      })
      throw new AppError("Resume not found", 404)
    }
    
    console.log('[Optimize] Resume found:', { 
      id: resume.id, 
      user_id: resume.user_id,
      title: resume.title,
      content_length: resume.content_text?.length || 0 
    })

    if (!resume.content_text || resume.content_text.trim().length < 50) {
      throw new AppError(
        "Resume content is too short or missing. Please re-upload your resume.",
        400,
      )
    }

    // Generate optimized resume
    const optimization = await withRetry(
      async () => {
        const { object } = await generateObject({
          model: openai("gpt-4o"),
          schema: optimizationSchema,
          prompt: `You are an expert resume optimization specialist. Optimize the following resume for the specific job posting.

ORIGINAL RESUME CONTENT:
${resume.content_text}

TARGET JOB:
Job Title: ${job_title}
Company: ${company_name || "Not specified"}

JOB DESCRIPTION:
${job_description}

OPTIMIZATION INSTRUCTIONS:
1. Rewrite the resume to better match the job requirements
2. Incorporate relevant keywords naturally throughout the content
3. Highlight skills that match the job requirements
4. Adjust the professional summary to align with the role
5. Reorder or emphasize experience that's most relevant
6. Use action verbs and quantifiable achievements
7. Ensure ATS compatibility and keep a clean markdown layout

Please provide:
- The complete optimized resume content in markdown format
- Specific changes made
- Keywords added or emphasized
- Skills highlighted
- Sections improved
- Before/after match scores (0-100)
- Additional recommendations

Focus on making the resume highly relevant to this specific job while maintaining authenticity.`,
        })
        return object
      },
      3,
      2000,
    )

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

    // Create the optimized resume record
    const optimizedResume = await createOptimizedResume({
      user_id: resume.user_id,
      original_resume_id: resume_id,
      job_title,
      company_name: company_name || null,
      job_description,
      title: `${resume.title} - Optimized for ${job_title}`,
      optimized_content: optimization.optimized_content,
      optimization_summary: optimization,
      match_score: optimization.match_score_after,
    })

    // Increment usage tracking for this successful optimization
    await incrementUsage(user.id, 'resume_optimization', user.subscription_plan || 'free')

    return NextResponse.json({ 
      optimized_resume: optimizedResume,
      optimization_details: {
        changes_made: optimization.changes_made,
        keywords_added: optimization.keywords_added,
        skills_highlighted: optimization.skills_highlighted,
        match_score_before: optimization.match_score_before,
        match_score_after: optimization.match_score_after,
        recommendations: optimization.recommendations,
      }
    }, { headers: getRateLimitHeaders(rateLimitResult) })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error, code: errorInfo.code }, { status: errorInfo.statusCode })
  }
}
