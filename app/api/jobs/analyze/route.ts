import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { AppError, withErrorHandler } from "@/lib/error-handler"
import { sql } from "@/lib/db"

const MAX_CONTENT_LENGTH = 25000 // Generous content limit for job descriptions

// Zod schema for AI job analysis output
const jobAnalysisSchema = z.object({
  keywords: z.array(z.string()).describe("Important keywords and exact phrases from the job posting"),
  required_skills: z.array(z.string()).describe("Must-have technical and soft skills"),
  preferred_skills: z.array(z.string()).describe("Nice-to-have skills"),
  experience_level: z.string().optional().describe("Required experience level (e.g., 'Senior (5-7 years)')"),
  salary_range: z.union([z.string(), z.null()]).optional().describe("Salary range if mentioned (string or null)"),
  location: z.string().optional().describe("Location and work model if mentioned"),
  key_requirements: z.array(z.string()).describe("Key job requirements and responsibilities"),
  nice_to_have: z.array(z.string()).describe("Nice-to-have qualifications"),
  company_culture: z.array(z.string()).describe("Company culture aspects mentioned"),
  benefits: z.array(z.string()).describe("Benefits and perks mentioned"),
  analysis_quality: z.object({
    confidence: z.number().min(0).max(100).describe("Analysis confidence score"),
    completeness: z.number().min(0).max(100).describe("Job posting completeness score"),
    content_processed: z.boolean().describe("Whether content was truncated/processed")
  }).describe("Analysis quality metrics")
})

// Helper functions
function truncateContent(content: string, maxLength: number = MAX_CONTENT_LENGTH): { 
  content: string
  truncated: boolean 
  originalLength: number 
} {
  const originalLength = content.length
  if (originalLength <= maxLength) {
    return { content, truncated: false, originalLength }
  }
  
  // Smart truncation: prefer complete sentences and sections
  const truncated = content.substring(0, maxLength)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
    truncated.lastIndexOf('\n\n')
  )
  
  const finalContent = lastSentenceEnd > maxLength * 0.8 
    ? truncated.substring(0, lastSentenceEnd + 1)
    : truncated
  
  return { 
    content: finalContent, 
    truncated: true, 
    originalLength 
  }
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError!
}

async function analyzeJobWithAI(
  job_title: string,
  company_name: string | undefined,
  job_description: string,
): Promise<z.infer<typeof jobAnalysisSchema>> {
  
  // Validate and process content
  if (!job_description?.trim()) {
    throw new AppError("Job description is required", 400)
  }

  if (job_description.trim().length < 100) {
    throw new AppError("Job description is too short for analysis", 400)
  }

  // Truncate content if necessary
  const { content: processedContent, truncated: contentProcessed, originalLength } = truncateContent(job_description.trim())
  const processingNote = contentProcessed 
    ? `Content intelligently truncated from ${originalLength} to ${processedContent.length} characters for optimal analysis.`
    : "Content processed in full."

  try {
    const analysis = await withRetry(
      async () => {
        const { object } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: jobAnalysisSchema,
          prompt: `You are an expert ATS analyst and resume optimization specialist. Analyze the provided job posting text to extract structured, ATS-ready data and actionable guidance to update a resume with the required keywords. Do not fabricate experience, credentials, or salary figures. If information is not present, return null or an empty list. Output must strictly conform to the provided jobAnalysisSchema and contain JSON only (no prose or markdown).

OBJECTIVE
• Identify exact, copyable keywords/phrases from the posting and normalize them (aliases, acronyms, US/UK spellings) to improve ATS matching.
• Separate REQUIRED vs PREFERRED/NICE-TO-HAVE skills.
• Convert responsibilities/requirements into crisp, action-oriented bullets that could be reused in a resume (while staying truthful).
• Capture seniority/experience level, location/work model, benefits, culture signals, and salary (only if explicitly stated).

METHOD
• Extract n-grams (1–4 words) from headings like "Requirements," "Responsibilities," "Qualifications," and from the job title. Preserve proper nouns (e.g., "PostgreSQL", "Snowflake").
• Normalize skills to canonical names and keep exact phrases separately (e.g., exact: "CI/CD"; canonical: "Continuous Integration/Continuous Delivery"). Include common aliases and acronyms in parentheses in the same string only when useful for ATS (e.g., "JavaScript (JS)").
• Identify seniority terms ("Junior/Intermediate/Senior/Lead/Manager"), clearance/visa constraints, travel %, shift, and work model (onsite/hybrid/remote).
• Mark must-have skills based on explicit cues ("required", "must", "minimum") and title/summary emphasis; nice-to-have from "preferred", "plus", "bonus".
• Keep bullets concise (start with a strong verb), avoid first person, and do not manufacture metrics that are not present.
• Salary: extract the exact salary range as written in the job posting as a single string; if no salary is mentioned, return null.

INPUT
Job Title: ${job_title}
Company: ${company_name || "Not specified"}
Job Description:
${processedContent}

${contentProcessed ? `Processing Note: ${processingNote}` : ''}

OUTPUT FIELDS (must match jobAnalysisSchema)
1) Important keywords that should appear in a resume → return a prioritized array of exact phrases (10–25 items, most critical first). Prefer specificity over broad terms.
2) Required technical and soft skills → arrays of canonical skill names (no duplicates).
3) Preferred/nice-to-have skills → arrays of canonical skill names.
4) Experience level required → a short string (e.g., "Senior (5–7 years)") or null if unspecified.
5) Salary range (if mentioned) → extract the exact salary text as written in the job posting as a string; return null if no salary information is provided.
6) Location (if mentioned) → include city/region and identify work model (onsite/remote/hybrid) in the string if schema doesn't have a separate field.
7) Key job requirements and responsibilities → 6–12 action-oriented bullets phrased so they can be adapted into resume statements; embed high-priority keywords naturally.
8) Nice-to-have qualifications → 3–8 bullets.
9) Company culture aspects mentioned → short phrases (e.g., "collaborative", "fast-paced", "customer-obsessed").
10) Benefits and perks mentioned → short phrases (e.g., "stock options", "private healthcare", "L&D budget").

ANALYSIS QUALITY
• confidence (0–100): based on clarity and redundancy of the posting.
• completeness (0–100): how detailed the original posting is.
• content_processed: ${contentProcessed}
• If the schema includes notes, add:
  – top 8 high-priority terms that MUST appear for ATS
  – suggested placement hints in parentheses per term, e.g., "Kubernetes (Summary, Skills, 1–2 Experience bullets)"
  – caution flags (e.g., "requires active SC clearance")

CONSTRAINTS
• Return valid JSON only, matching jobAnalysisSchema exactly.
• Use null/[] when unknown; never guess quantities, dates, or salaries.
• No chain-of-thought; provide results only.`,
        })
        return object
      },
      3,
      1000,
    )

    // Validate analysis quality before saving
    if (!analysis) {
      throw new AppError("Analysis validation failed - no analysis result", 500)
    }

    // Log analysis structure for debugging
    console.log('Analysis structure:', {
      hasAnalysisQuality: !!analysis.analysis_quality,
      keys: Object.keys(analysis),
      confidence: analysis.analysis_quality?.confidence
    })

    if (!analysis.analysis_quality) {
      throw new AppError("Analysis validation failed - missing analysis_quality field", 500)
    }

    if (analysis.analysis_quality.confidence < 60) {
      throw new AppError(
        `Analysis confidence too low (${analysis.analysis_quality.confidence}%). Please provide a more detailed job description.`,
        400
      )
    }

    return analysis
  } catch (error: any) {
    console.error("AI analysis failed:", error)
    
    // Re-throw validation errors from the AI
    if (error.message?.includes("validation failed") || error.message?.includes("confidence too low")) {
      throw error
    }
    
    // Generic fallback for other AI errors
    throw new AppError("AI analysis service temporarily unavailable", 503)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const user = await getAuthenticatedUser()
    if (!user) {
      throw new AppError("Authentication required", 401)
    }

    const body = await request.json()
    const { job_title, company_name, job_url, job_description } = body

    // Validate required fields
    if (!job_title?.trim()) {
      throw new AppError("Job title is required", 400)
    }

    if (!job_description?.trim()) {
      throw new AppError("Job description is required", 400)
    }

    if (job_description.trim().length < 100) {
      throw new AppError("Job description is too short for analysis", 400)
    }

    // Perform AI analysis
    const analysis = await analyzeJobWithAI(
      job_title.trim(),
      company_name?.trim(),
      job_description.trim(),
    )

    // Save to database
    const jobAnalysisId = generateUUID()
    
    const analysisResult = {
      keywords: analysis.keywords || [],
      required_skills: analysis.required_skills || [],
      preferred_skills: analysis.preferred_skills || [],
      experience_level: analysis.experience_level || null,
      salary_range: analysis.salary_range || null,
      location: analysis.location || null,
      key_requirements: analysis.key_requirements || [],
      nice_to_have: analysis.nice_to_have || [],
      company_culture: analysis.company_culture || [],
      benefits: analysis.benefits || [],
      analysis_quality: analysis.analysis_quality
    }

    try {
      await sql`
        INSERT INTO job_analysis (
          id, user_id, job_title, company_name, job_url, job_description,
          analysis_result, keywords, required_skills, preferred_skills,
          experience_level, salary_range, location, created_at, updated_at
        ) VALUES (
          ${jobAnalysisId}, ${user.id}, ${job_title.trim()}, ${company_name?.trim() || null},
          ${job_url?.trim() || null}, ${job_description.trim()}, ${JSON.stringify(analysisResult)},
          ${analysis.keywords || []}, ${analysis.required_skills || []}, ${analysis.preferred_skills || []},
          ${analysis.experience_level || null}, ${analysis.salary_range || null}, ${analysis.location || null},
          NOW(), NOW()
        )
      `
    } catch (dbError: any) {
      console.error("Database insertion failed:", dbError)
      throw new AppError("Failed to save job analysis", 500)
    }

    return NextResponse.json({
      success: true,
      analysis: {
        id: jobAnalysisId,
        ...analysisResult
      }
    })
  })
}