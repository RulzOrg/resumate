import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, getOrCreateUser, getCachedStructure, saveParsedStructure } from "@/lib/db"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"
import { buildAnalysisPrompt, parseAnalysisResponse } from "@/lib/prompts/analyze-resume"
import { AnalyzeRequestSchema } from "@/lib/schemas/optimize-flow"
import { extractResumeWithLLM } from "@/lib/llm-resume-extractor"
import Anthropic from "@anthropic-ai/sdk"

// Allow up to 2 minutes for analysis
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting: 10 requests per 5 minutes
    const rateLimitResult = rateLimit(`analyze-flow:${userId}`, 10, 300000)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before analyzing again.",
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
    const validationResult = AnalyzeRequestSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      throw new AppError(`Validation failed: ${errors}`, 400)
    }

    const { resume_id, job_description, job_title, company_name } = validationResult.data

    console.log("[Analyze] Request received:", {
      resume_id,
      job_title,
      user_id: user.id,
      job_description_length: job_description.length,
    })

    // Get the resume
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

    // Extract and cache parsed resume structure for later use in the flow
    // This uses LLM to intelligently parse the raw text into structured data
    let parsedResume = await getCachedStructure(resume_id)

    if (!parsedResume) {
      console.log("[Analyze] No cached structure found, extracting via LLM...")
      const extractionResult = await extractResumeWithLLM(
        resume.content_text,
        process.env.ANTHROPIC_API_KEY
      )

      if (extractionResult.success && extractionResult.resume) {
        parsedResume = extractionResult.resume
        await saveParsedStructure(resume_id, parsedResume)
        console.log("[Analyze] Resume structure extracted and cached:", {
          hasContact: !!parsedResume.contact?.name,
          workExperienceCount: parsedResume.workExperience?.length || 0,
          educationCount: parsedResume.education?.length || 0,
          skillsCount: parsedResume.skills?.length || 0,
        })
      } else {
        console.warn("[Analyze] Failed to extract resume structure:", extractionResult.error)
        // Continue without parsed structure - will use raw text fallback
      }
    } else {
      console.log("[Analyze] Using cached resume structure:", {
        hasContact: !!parsedResume.contact?.name,
        workExperienceCount: parsedResume.workExperience?.length || 0,
        educationCount: parsedResume.education?.length || 0,
        skillsCount: parsedResume.skills?.length || 0,
      })
    }

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt({
      resumeText: resume.content_text,
      jobDescription: job_description,
      jobTitle: job_title,
      companyName: company_name,
    })

    // Call LLM with retry logic
    const analysisResult = await withRetry(
      async () => {
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new AppError("ANTHROPIC_API_KEY is not configured", 500, "MISSING_API_KEY")
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

        console.log("[Analyze] Calling Anthropic API...")
        const startTime = Date.now()

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        })

        const duration = Date.now() - startTime
        console.log("[Analyze] Anthropic API response received:", {
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

        const result = parseAnalysisResponse(content.text)

        console.log("[Analyze] Analysis complete:", {
          matchScore: result.matchScore,
          strongFitCount: result.strongFitReasons.length,
          holdingBackCount: result.holdingBackReasons.length,
          missingKeywordsCount: result.missingKeywords.length,
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
          matchScore: analysisResult.matchScore,
          strongFitReasons: analysisResult.strongFitReasons,
          holdingBackReasons: analysisResult.holdingBackReasons,
          missingKeywords: analysisResult.missingKeywords,
        },
        resume_text: resume.content_text,
        parsed_resume: parsedResume || null,
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error("[Analyze] Error:", error)
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
