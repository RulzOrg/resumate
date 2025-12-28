import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, createOptimizedResume, getOrCreateUser, getUserById, ensureUserSyncRecord, incrementUsage } from "@/lib/db"
import { canPerformAction } from "@/lib/subscription"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"
import { toJsonSchema, validateSchema } from "@/lib/jsonSchema"

// Allow up to 5 minutes for generation (Pro plan limit)
export const maxDuration = 300;

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

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new AppError("ANTHROPIC_API_KEY is not configured", 500, "MISSING_API_KEY");
    }

    // Generate optimized resume
    const optimization = await withRetry(
      async () => {
        console.log('[Optimize] Starting AI generation...');
        const startTime = Date.now();
        
        try {
          const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY!,
          });

          const messageContent = `You are an expert resume optimization specialist. Optimize the following resume for the specific job posting.

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

Please provide a JSON response with the following fields:
{
  "optimized_content": "The complete optimized resume content in markdown format",
  "changes_made": ["List of specific changes made"],
  "keywords_added": ["Keywords that were added or emphasized"],
  "skills_highlighted": ["Skills that were highlighted"],
  "sections_improved": ["Resume sections that were improved"],
  "match_score_before": 50,
  "match_score_after": 75,
  "recommendations": ["Additional recommendations for the candidate"]
}`;

          console.log('[Optimize] Prepared message, sending to Anthropic...');
          
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: 4096,
            messages: [{
              role: 'user',
              content: messageContent,
            }],
          });

        console.log(`[Optimize] AI generation completed in ${(Date.now() - startTime) / 1000}s`);
          console.log('[Optimize] Response structure:', {
            hasContent: !!response.content,
            contentLength: response.content?.length,
            firstContentType: response.content?.[0]?.type,
          });
          
          // Parse the response - it should be in the content[0].text
          if (!response.content || response.content.length === 0) {
            throw new Error('Empty response from Anthropic');
          }

          const content = response.content[0];
          if (content.type === 'text') {
            try {
              // Strip markdown code blocks if present
              let jsonText = content.text.trim();
              if (jsonText.startsWith('```json')) {
                jsonText = jsonText.slice(7);
              } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.slice(3);
              }
              if (jsonText.endsWith('```')) {
                jsonText = jsonText.slice(0, -3);
              }
              jsonText = jsonText.trim();
              
              const parsed = JSON.parse(jsonText);
              // Validate against the schema to ensure type safety
              return validateSchema(optimizationSchema, parsed);
            } catch (parseError: any) {
              console.error('[Optimize] JSON parse error:', parseError);
              console.error('[Optimize] Response text:', content.text?.substring(0, 500));
              throw new Error(`Failed to parse JSON response: ${parseError.message}`);
            }
          }
          
          console.error('[Optimize] Unexpected content type:', content.type);
          throw new Error(`Unexpected response format from Anthropic: ${content.type}`);
        } catch (error: any) {
          console.error('[Optimize] Anthropic API error:', {
            error: error.message,
            name: error.name,
            status: error.status,
            cause: error.cause,
          });
          
          // Re-throw with more context
          if (error.status === 401) {
            throw new AppError("Invalid Anthropic API key", 500, "INVALID_API_KEY");
          }
          if (error.status === 429) {
            throw new AppError("Anthropic API rate limit exceeded", 429, "RATE_LIMIT");
          }
          if (error.message?.includes('abort') || error.name === 'AbortError') {
            throw new AppError("Request was aborted or timed out", 408, "REQUEST_TIMEOUT");
          }
          
          throw new Error(`Anthropic API error: ${error.message || String(error)}`);
        }
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
