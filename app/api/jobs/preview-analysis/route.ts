import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"
import { intelligentTruncate, analyzeContentLength } from "@/lib/content-processor"
import { normalizeSalaryRange } from "@/lib/normalizers"

const salaryRangeSchema = z.union([
  z.string(),
  z.null(),
  z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().optional(),
    verbatim: z.string().optional(),
  }),
])

const previewAnalysisSchema = z.object({
  keywords: z.array(z.string()).describe("Important keywords from the job posting"),
  required_skills: z.array(z.string()).describe("Must-have technical and soft skills"),
  preferred_skills: z.array(z.string()).describe("Nice-to-have skills"),
  experience_level: z.union([z.string(), z.null()]).describe("Required experience level or null if unspecified"),
  salary_range: salaryRangeSchema.optional().describe("Salary range if mentioned"),
  location: z.union([z.string(), z.null()]).optional().describe("Job location if mentioned (string or null)"),
  key_requirements: z.array(z.string()).describe("Key job requirements"),
  company_culture: z.array(z.string()).describe("Company culture aspects mentioned"),
  benefits: z.array(z.string()).describe("Benefits and perks mentioned"),
  analysis_confidence: z.number().min(0).max(100).describe("Confidence score (0-100) in the analysis quality based on content detail"),
  content_info: z.object({
    was_truncated: z.boolean().describe("Whether the content was truncated for analysis"),
    original_length: z.number().describe("Original content length in characters"),
    processed_length: z.number().describe("Processed content length used for analysis")
  }).optional().describe("Information about content processing")
})

// Hard caps for preview payload to keep UI consistent
const PREVIEW_LIMITS = {
  keywords: 8,
  required: 6,
  preferred: 4,
  keyRequirements: 4,
  culture: 3,
  benefits: 4,
} as const

export async function POST(request: NextRequest) {
  try {
    // Preflight configuration checks for clearer errors
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI backend not configured. Please set OPENAI_API_KEY.", code: "OPENAI_CONFIG_ERROR" },
        { status: 500 },
      )
    }
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResult = rateLimit(`preview:${userId}`, 20, 300000) // 20 requests per 5 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before requesting another preview.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    const { job_description, job_title, company_name } = await request.json()

    if (!job_description || job_description.trim().length < 50) {
      throw new AppError("Job description must be at least 50 characters for preview analysis", 400)
    }

    // Analyze content and apply intelligent truncation if needed
    const contentAnalysis = analyzeContentLength(job_description, 'preview')
    let processedContent = job_description.trim()
    let truncationInfo = null

    if (contentAnalysis.suggestedAction === 'truncate' || job_description.trim().length > 4000) {
      const truncationResult = intelligentTruncate(job_description.trim(), 4000, true)
      processedContent = truncationResult.truncatedContent
      truncationInfo = {
        was_truncated: truncationResult.wasTruncated,
        original_length: truncationResult.originalLength,
        processed_length: truncationResult.truncatedLength,
        removed_sections: truncationResult.removedSections,
        preserved_sections: truncationResult.preservedSections
      }
    }

    const analysis = await withRetry(
      async () => {
        const { object } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: previewAnalysisSchema,
          prompt: `You are an expert ATS analyst. Produce a compact, ATS-ready preview strictly matching previewAnalysisSchema. Return JSON only (no prose/markdown). Do not fabricate; use null/[] when unknown.

OBJECTIVE (Preview)
• Prioritize exact, copyable keywords/phrases that should appear in a resume (max 8 per schema).
• Separate REQUIRED vs PREFERRED skills (respect schema max: required 6, preferred 4).
• Convert responsibilities/requirements into crisp, action-oriented bullets (max 4) that could be adapted into resume statements truthfully.
• Capture experience level, location/work model, salary if explicitly present.

INPUT
Job Title: ${job_title || "Not specified"}
Company: ${company_name || "Not specified"}
Job Description:
${processedContent}

${truncationInfo?.was_truncated ? 
  `Note: Content was truncated from ${truncationInfo.original_length} to ${truncationInfo.processed_length} characters (key sections preserved).` : 
  ''
}

CONSTRAINTS
• Obey schema limits: keywords ≤ 8; required_skills ≤ 6; preferred_skills ≤ 4; key_requirements ≤ 4; company_culture ≤ 3; benefits ≤ 4.
• Normalize skills to canonical names; keep exact phrases in keywords.
• No chain-of-thought; JSON output only.

CONFIDENCE
• analysis_confidence: 0–100 based on clarity/completeness.
• content_info.was_truncated should reflect whether truncation occurred.`,
        })
        // Apply defensive caps to avoid schema/consumer overflow
        const capped = {
          ...object,
          salary_range: normalizeSalaryRange(object.salary_range),
          keywords: Array.isArray(object.keywords) ? object.keywords.slice(0, PREVIEW_LIMITS.keywords) : [],
          required_skills: Array.isArray(object.required_skills)
            ? object.required_skills.slice(0, PREVIEW_LIMITS.required)
            : [],
          preferred_skills: Array.isArray(object.preferred_skills)
            ? object.preferred_skills.slice(0, PREVIEW_LIMITS.preferred)
            : [],
          key_requirements: Array.isArray(object.key_requirements)
            ? object.key_requirements.slice(0, PREVIEW_LIMITS.keyRequirements)
            : [],
          company_culture: Array.isArray(object.company_culture)
            ? object.company_culture.slice(0, PREVIEW_LIMITS.culture)
            : [],
          benefits: Array.isArray(object.benefits) ? object.benefits.slice(0, PREVIEW_LIMITS.benefits) : [],
        }
        return capped
      },
      2, // Only 2 retries for preview
      500,
    )

    // Add content processing info to the analysis
    const responseAnalysis = {
      ...analysis,
      content_info: truncationInfo ? {
        was_truncated: truncationInfo.was_truncated,
        original_length: truncationInfo.original_length,
        processed_length: truncationInfo.processed_length
      } : {
        was_truncated: false,
        original_length: processedContent.length,
        processed_length: processedContent.length
      }
    }

    return NextResponse.json(
      { 
        analysis: responseAnalysis,
        truncation_info: truncationInfo // Additional detailed info for frontend
      },
      { headers: getRateLimitHeaders(rateLimitResult) },
    )
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error, code: errorInfo.code }, { status: errorInfo.statusCode })
  }
}
