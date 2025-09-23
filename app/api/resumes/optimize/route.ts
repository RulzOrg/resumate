import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, getJobAnalysisById, createOptimizedResume, getOrCreateUser } from "@/lib/db"
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

    const { resume_id, job_analysis_id } = await request.json()

    if (!resume_id || !job_analysis_id) {
      throw new AppError("Resume ID and Job Analysis ID are required", 400)
    }

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

    const optimization = await withRetry(
      async () => {
        const { object } = await generateObject({
          model: openai("gpt-4o"),
          schema: optimizationSchema,
          prompt: `You are an expert resume optimization specialist. Optimize the following resume for the specific job posting.

ORIGINAL RESUME CONTENT:
${resume.content_text}

JOB POSTING ANALYSIS:
Job Title: ${jobAnalysis.job_title}
Company: ${jobAnalysis.company_name || "Not specified"}
Required Skills: ${jobAnalysis.required_skills.join(", ")}
Preferred Skills: ${jobAnalysis.preferred_skills.join(", ")}
Keywords: ${jobAnalysis.keywords.join(", ")}
Experience Level: ${jobAnalysis.experience_level}
Key Requirements: ${jobAnalysis.analysis_result.key_requirements.join(", ")}

OPTIMIZATION INSTRUCTIONS:
1. Rewrite the resume to better match the job requirements
2. Incorporate relevant keywords naturally throughout the content
3. Highlight skills that match the job requirements
4. Adjust the professional summary to align with the role
5. Reorder or emphasize experience that's most relevant
6. Use action verbs and quantifiable achievements
7. Ensure ATS compatibility
8. Maintain professional formatting and readability

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

    // Create the optimized resume record
    const optimizedResume = await createOptimizedResume({
      user_id: user.id,
      original_resume_id: resume_id,
      job_analysis_id: job_analysis_id,
      title: `${resume.title} - Optimized for ${jobAnalysis.job_title}`,
      optimized_content: optimization.optimized_content,
      optimization_summary: optimization,
      match_score: optimization.match_score_after,
    })

    return NextResponse.json({ optimized_resume: optimizedResume }, { headers: getRateLimitHeaders(rateLimitResult) })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error, code: errorInfo.code }, { status: errorInfo.statusCode })
  }
}
