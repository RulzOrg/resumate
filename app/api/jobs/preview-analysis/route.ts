import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"
import { intelligentTruncate, analyzeContentLength } from "@/lib/content-processor"

const previewAnalysisSchema = z.object({
  keywords: z.array(z.string()).max(8).describe("Top 8 most important keywords from the job posting"),
  required_skills: z.array(z.string()).max(6).describe("Top 6 must-have technical and soft skills"),
  preferred_skills: z.array(z.string()).max(4).describe("Top 4 nice-to-have skills"),
  experience_level: z.string().describe("Required experience level (e.g., Entry Level, Mid Level, Senior)"),
  salary_range: z.string().optional().describe("Salary range if mentioned"),
  location: z.string().optional().describe("Job location"),
  key_requirements: z.array(z.string()).max(4).describe("Top 4 key job requirements"),
  company_culture: z.array(z.string()).max(3).describe("Top 3 company culture aspects mentioned"),
  benefits: z.array(z.string()).max(4).describe("Top 4 benefits and perks mentioned"),
  analysis_confidence: z.number().min(0).max(100).describe("Confidence score (0-100) in the analysis quality based on content detail"),
  content_info: z.object({
    was_truncated: z.boolean().describe("Whether the content was truncated for analysis"),
    original_length: z.number().describe("Original content length in characters"),
    processed_length: z.number().describe("Processed content length used for analysis")
  }).optional().describe("Information about content processing")
})

export async function POST(request: NextRequest) {
  try {
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
          prompt: `Provide a quick preview analysis of this job posting. Focus on the most important elements for resume optimization:

Job Title: ${job_title || "Not specified"}
Company: ${company_name || "Not specified"}
Job Description:
${processedContent}

${truncationInfo?.was_truncated ? 
  `Note: Content was intelligently truncated from ${truncationInfo.original_length} to ${truncationInfo.processed_length} characters, preserving key sections: ${truncationInfo.preserved_sections.join(', ')}.` : 
  ''
}

Extract the top keywords, skills, and requirements that would be most important for ATS optimization and resume tailoring. Be selective and prioritize the most relevant items.

Rate your confidence in the analysis quality based on how detailed and complete the job description is (0-100 scale). ${truncationInfo?.was_truncated ? 'Consider that some content was truncated.' : ''}`,
        })
        return object
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