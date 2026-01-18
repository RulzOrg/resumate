import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser } from "@/lib/db"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"
import { buildATSScanPrompt, parseATSScanResponse } from "@/lib/prompts/ats-scan"
import { ATSScanRequestSchema } from "@/lib/schemas/optimize-flow"
import Anthropic from "@anthropic-ai/sdk"

// Allow up to 2 minutes for ATS scanning
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting: 15 requests per 5 minutes
    const rateLimitResult = rateLimit(`ats-scan-flow:${userId}`, 15, 300000)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before scanning again.",
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
    const validationResult = ATSScanRequestSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      throw new AppError(`Validation failed: ${errors}`, 400)
    }

    const { edited_content, job_description } = validationResult.data

    console.log("[ATS Scan] Request received:", {
      user_id: user.id,
      experienceCount: edited_content.workExperiences.length,
      hasJobDescription: !!job_description,
    })

    // Build the ATS scan prompt
    const prompt = buildATSScanPrompt({
      editedContent: edited_content,
      jobDescription: job_description,
    })

    // Call LLM with retry logic
    const scanResult = await withRetry(
      async () => {
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new AppError("ANTHROPIC_API_KEY is not configured", 500, "MISSING_API_KEY")
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

        console.log("[ATS Scan] Calling Anthropic API...")
        const startTime = Date.now()

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250514",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        })

        const duration = Date.now() - startTime
        console.log("[ATS Scan] Anthropic API response received:", {
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

        const result = parseATSScanResponse(content.text)

        console.log("[ATS Scan] Scan complete:", {
          overallScore: result.overallScore,
          sectionCount: result.sections.length,
          criticalIssues: result.criticalIssues.length,
          warnings: result.warnings.length,
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
          overallScore: scanResult.overallScore,
          sections: scanResult.sections,
          criticalIssues: scanResult.criticalIssues,
          warnings: scanResult.warnings,
          recommendations: scanResult.recommendations,
        },
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error("[ATS Scan] Error:", error)
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
