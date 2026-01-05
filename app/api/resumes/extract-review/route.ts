import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  getResumeById,
  getOrCreateUser,
  getCachedStructure,
  saveParsedStructure,
} from "@/lib/db"
import { extractResumeWithLLM } from "@/lib/llm-resume-extractor"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, AppError } from "@/lib/error-handler"

// Allow up to 2 minutes for extraction
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 10 requests per 5 minutes (extraction is cheaper than full optimization)
    const rateLimitResult = rateLimit(`extract-review:${userId}`, 10, 300000)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before making another extraction request.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      )
    }

    // Get or create user in our database
    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Parse and validate request body
    const body = await request.json()
    const { resume_id } = body

    if (!resume_id) {
      throw new AppError("Resume ID is required", 400, "MISSING_RESUME_ID")
    }

    if (typeof resume_id !== "string") {
      throw new AppError("Resume ID must be a string", 400, "INVALID_RESUME_ID")
    }

    console.log("[ExtractReview] Request received:", {
      resume_id,
      user_id: user.id,
    })

    // Get the resume
    const resume = await getResumeById(resume_id, user.id)

    if (!resume) {
      throw new AppError("Resume not found", 404, "RESUME_NOT_FOUND")
    }

    if (!resume.content_text || resume.content_text.trim().length < 50) {
      throw new AppError(
        "Resume content is too short or missing. Please re-upload your resume.",
        400,
        "INVALID_RESUME_CONTENT"
      )
    }

    // Check for cached structure first
    let resumeStructure = await getCachedStructure(resume.id)
    let cacheHit = false

    if (resumeStructure) {
      cacheHit = true
      console.log("[ExtractReview] Cache hit:", {
        resume_id,
        workExperienceCount: resumeStructure.workExperience?.length || 0,
        hasSummary: !!resumeStructure.summary,
      })
    } else {
      console.log("[ExtractReview] Cache miss: extracting via LLM...")

      if (!process.env.ANTHROPIC_API_KEY) {
        throw new AppError(
          "ANTHROPIC_API_KEY is not configured",
          500,
          "MISSING_API_KEY"
        )
      }

      const extractionStartTime = Date.now()
      const extractionResult = await extractResumeWithLLM(
        resume.content_text,
        process.env.ANTHROPIC_API_KEY
      )

      const extractionDuration = Date.now() - extractionStartTime

      if (!extractionResult.success) {
        const errorCode = extractionResult.error?.code || "EXTRACTION_FAILED"
        let errorMessage: string
        let statusCode = 400

        switch (errorCode) {
          case "NOT_A_RESUME":
            errorMessage =
              "This doesn't appear to be a resume. Please upload a resume file."
            break
          case "INCOMPLETE":
            errorMessage =
              "Resume is missing key sections. Please ensure your resume includes work experience, education, or skills."
            break
          case "EXTRACTION_FAILED":
            errorMessage =
              "Failed to parse resume. Please try uploading a different format (DOCX recommended)."
            statusCode = 500
            break
          case "INVALID_INPUT":
            errorMessage = "Resume content is too short or invalid."
            break
          default:
            errorMessage =
              extractionResult.error?.message ||
              "Failed to extract resume structure."
            statusCode = 500
        }

        console.error("[ExtractReview] Extraction failed:", {
          errorCode,
          errorMessage: extractionResult.error?.message,
          documentType: extractionResult.error?.documentType,
          duration: `${extractionDuration}ms`,
        })

        throw new AppError(errorMessage, statusCode, errorCode)
      }

      if (!extractionResult.resume) {
        throw new AppError(
          "Failed to extract resume structure.",
          500,
          "EXTRACTION_FAILED"
        )
      }

      resumeStructure = extractionResult.resume

      console.log("[ExtractReview] Extraction successful:", {
        duration: `${extractionDuration}ms`,
        workExperienceCount: resumeStructure.workExperience.length,
        hasSummary: !!resumeStructure.summary,
        wasTruncated: extractionResult.metadata?.truncated,
      })

      // Cache the structure for future use (non-blocking)
      saveParsedStructure(resume.id, resumeStructure).catch((err) =>
        console.error("[ExtractReview] Failed to cache structure:", err)
      )
    }

    // Return only work_experience and summary for user review
    return NextResponse.json(
      {
        resume_id: resume.id,
        work_experience: resumeStructure.workExperience || [],
        summary: resumeStructure.summary || null,
        cache_hit: cacheHit,
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}

