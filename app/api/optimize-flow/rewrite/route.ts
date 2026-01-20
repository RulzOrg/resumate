import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, getOrCreateUser } from "@/lib/db"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"
import { buildRewritePrompt, parseRewriteResponse } from "@/lib/prompts/rewrite-experience"
import { RewriteRequestSchema } from "@/lib/schemas/optimize-flow"
import Anthropic from "@anthropic-ai/sdk"

// Allow up to 3 minutes for rewriting
export const maxDuration = 180

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting: 10 requests per 5 minutes
    const rateLimitResult = rateLimit(`rewrite-flow:${userId}`, 10, 300000)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before rewriting again.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      )
    }

    // Get user from database
    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = RewriteRequestSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      throw new AppError(`Validation failed: ${errors}`, 400)
    }

    const {
      resume_id,
      job_description,
      job_title,
      company_name,
      analysis_result,
      resume_text: providedResumeText,
    } = validationResult.data

    console.log("[Rewrite] Request received:", {
      resume_id,
      job_title,
      user_id: user.id,
      has_resume_text: !!providedResumeText,
      missing_keywords: analysis_result.missingKeywords,
    })

    // Get resume text - either from request or from database
    let resumeText = providedResumeText

    if (!resumeText) {
      const resume = await getResumeById(resume_id, user.id)
      if (!resume) {
        throw new AppError("Resume not found", 404)
      }
      if (!resume.content_text || resume.content_text.trim().length < 50) {
        throw new AppError(
          "Resume content is too short or missing. Please re-upload your resume.",
          400
        )
      }
      resumeText = resume.content_text
    }

    // Build the rewrite prompt
    const prompt = buildRewritePrompt({
      resumeText,
      jobDescription: job_description,
      jobTitle: job_title,
      companyName: company_name,
      analysisResult: analysis_result,
    })

    // Call LLM with retry logic
    const rewriteResult = await withRetry(
      async () => {
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new AppError("ANTHROPIC_API_KEY is not configured", 500, "MISSING_API_KEY")
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

        console.log("[Rewrite] Calling Anthropic API...")
        const startTime = Date.now()

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        })

        const duration = Date.now() - startTime
        console.log("[Rewrite] Anthropic API response received:", {
          duration: `${duration}ms`,
          stop_reason: response.stop_reason,
        })

        // Parse response
        if (!response.content || response.content.length === 0) {
          throw new Error("Empty response from Anthropic")
        }

        const content = response.content[0]
        if (content.type !== "text") {
          throw new Error(`Unexpected response format: ${content.type}`)
        }

        const result = parseRewriteResponse(content.text)

        console.log("[Rewrite] Rewrite complete:", {
          summaryLength: result.professionalSummary.length,
          experienceCount: result.workExperiences.length,
          keywordsAdded: result.keywordsAdded.length,
        })

        return result
      },
      3, // 3 retries
      2000 // 2 second delay
    )

    // Return success response
    return NextResponse.json(
      {
        success: true,
        result: {
          professionalSummary: rewriteResult.professionalSummary,
          workExperiences: rewriteResult.workExperiences,
          keywordsAdded: rewriteResult.keywordsAdded,
        },
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error("[Rewrite] Error:", error)
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
