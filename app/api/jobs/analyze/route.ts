import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createJobAnalysis, getOrCreateUser, createResumeDuplicate } from "@/lib/db"
import type { Resume } from "@/lib/db"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"
import { intelligentTruncate, analyzeContentLength, summarizeContent } from "@/lib/content-processor"

const jobAnalysisSchema = z.object({
  keywords: z.array(z.string()).describe("Important keywords and phrases from the job posting"),
  required_skills: z.array(z.string()).describe("Must-have technical and soft skills"),
  preferred_skills: z.array(z.string()).describe("Nice-to-have skills and qualifications"),
  experience_level: z.union([z.string(), z.null()]).describe(
    "Required experience level (e.g., Entry Level, Mid Level, Senior) or null",
  ),
  salary_range: z.union([z.string(), z.null()]).optional().describe("Salary range if mentioned (string or null)"),
  location: z.union([z.string(), z.null()]).optional().describe("Job location (string or null)"),
  key_requirements: z.array(z.string()).describe("Key job requirements and responsibilities"),
  nice_to_have: z.array(z.string()).describe("Preferred qualifications and bonus skills"),
  company_culture: z.array(z.string()).describe("Company culture and values mentioned"),
  benefits: z.array(z.string()).describe("Benefits and perks mentioned"),
  analysis_quality: z.object({
    confidence: z.number().min(0).max(100).describe("Confidence in analysis quality (0-100)"),
    completeness: z.number().min(0).max(100).describe("How complete the job description was (0-100)"),
    content_processed: z.boolean().describe("Whether content was truncated or summarized")
  }).describe("Quality metrics for the analysis")
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResult = rateLimit(`analyze:${userId}`, 10, 300000) // 10 requests per 5 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before analyzing another job posting.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    // Get or create user in our database with enhanced verification
    let user = await getOrCreateUser()
    if (!user) {
      console.error('Failed to get or create user in analyze API')
      throw new AppError("Unable to verify user account. Please try again in a moment.", 500)
    }

    console.log('User verification successful in analyze API:', { 
      user_id: user.id, 
      clerk_user_id: user.clerk_user_id 
    })

    const { job_title, company_name, job_url, job_description } = await request.json()

    if (!job_title || !job_description) {
      throw new AppError("Job title and description are required", 400)
    }

    if (job_description.trim().length < 100) {
      throw new AppError("Job description is too short. Please provide a more detailed job posting.", 400)
    }

    // Analyze and process content for optimal analysis
    const contentAnalysis = analyzeContentLength(job_description, 'analysis')
    let processedContent = job_description.trim()
    let contentProcessed = false
    let processingNote = ""

    // Handle overly long content
    if (job_description.trim().length > 50000) {
      processedContent = summarizeContent(job_description.trim(), 30000)
      contentProcessed = true
      processingNote = "Content was summarized to focus on key sections due to length."
    } else if (job_description.trim().length > 30000) {
      const truncationResult = intelligentTruncate(job_description.trim(), 25000, true)
      processedContent = truncationResult.truncatedContent
      contentProcessed = truncationResult.wasTruncated
      if (contentProcessed) {
        processingNote = `Content was intelligently truncated, preserving: ${truncationResult.preservedSections.join(', ')}.`
      }
    }

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
• Extract n-grams (1–4 words) from headings like “Requirements,” “Responsibilities,” “Qualifications,” and from the job title. Preserve proper nouns (e.g., “PostgreSQL”, “Snowflake”).
• Normalize skills to canonical names and keep exact phrases separately (e.g., exact: "CI/CD"; canonical: "Continuous Integration/Continuous Delivery"). Include common aliases and acronyms in parentheses in the same string only when useful for ATS (e.g., "JavaScript (JS)").
• Identify seniority terms (“Junior/Intermediate/Senior/Lead/Manager”), clearance/visa constraints, travel %, shift, and work model (onsite/hybrid/remote).
• Mark must-have skills based on explicit cues (“required”, “must”, “minimum”) and title/summary emphasis; nice-to-have from “preferred”, “plus”, “bonus”.
• Keep bullets concise (start with a strong verb), avoid first person, and do not manufacture metrics that are not present.
• Salary: parse exactly as written; if ranges/period/currency are missing, set fields to null and keep the verbatim phrase.

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
5) Salary range (if mentioned) → parse into min, max, currency, and period if present; include the source phrase in a “verbatim” subfield if the schema permits; otherwise nulls.
6) Location (if mentioned) → include city/region and identify work model (onsite/remote/hybrid) in the string if schema doesn’t have a separate field.
7) Key job requirements and responsibilities → 6–12 action-oriented bullets phrased so they can be adapted into resume statements; embed high-priority keywords naturally.
8) Nice-to-have qualifications → 3–8 bullets.
9) Company culture aspects mentioned → short phrases (e.g., “collaborative”, “fast-paced”, “customer-obsessed”).
10) Benefits and perks mentioned → short phrases (e.g., “stock options”, “private healthcare”, “L&D budget”).

ANALYSIS QUALITY
• confidence (0–100): based on clarity and redundancy of the posting.
• completeness (0–100): how detailed the original posting is.
• content_processed: ${contentProcessed}
• If the schema includes notes, add:
  – top 8 high-priority terms that MUST appear for ATS
  – suggested placement hints in parentheses per term, e.g., “Kubernetes (Summary, Skills, 1–2 Experience bullets)”
  – caution flags (e.g., “requires active SC clearance”)

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

    if (analysis.analysis_quality.confidence < 30) {
      throw new AppError(
        `Analysis confidence too low (${analysis.analysis_quality.confidence}%). The job description may be too brief or unclear. Please provide more detailed content.`, 
        400
      )
    }

    // Save the analysis to the database with enhanced verification
    console.log('Saving job analysis with enhanced verification:', {
      user_id: user.id,
      job_title,
      company_name,
      has_analysis_result: !!analysis,
      analysis_keys: analysis ? Object.keys(analysis) : []
    })

    let jobAnalysis
    let generatedResume: Resume
    try {
      jobAnalysis = await createJobAnalysis({
        user_id: user.id,
        job_title,
        company_name,
        job_url,
        job_description, // Save original content, not processed
        analysis_result: {
          ...analysis,
          // Ensure DB type compatibility for consumers expecting strings
          experience_level: analysis.experience_level ?? "",
          salary_range: analysis.salary_range ?? undefined,
          location: analysis.location ?? undefined,
        },
      })
      
      console.log('Job analysis saved successfully:', { 
        analysis_id: jobAnalysis.id,
        user_id: jobAnalysis.user_id 
      })
    } catch (error: any) {
      console.error('Failed to create job analysis:', {
        error: error.message,
        code: error.code,
        user_id: user.id,
        job_title
      })
      
      // Provide user-friendly error messages
      if (error.message.includes('User not found') || error.message.includes('does not exist')) {
        throw new AppError("User account verification failed. Please refresh the page and try again.", 500)
      }
      
      throw error
    }

    // Generate a first-pass resume tailored to this job with error handling
    try {
      const { object: resumeGen } = await generateObject({
        model: openai("gpt-4o"),
        schema: z.object({
          resume_markdown: z.string().describe("A complete, ATS-friendly resume in Markdown"),
        }),
        prompt: `Create a brand-new professional resume tailored to the following job details. The user has not provided a resume yet. Use best practices, quantify achievements plausibly, and keep it ATS-friendly. Do NOT invent confidential company names; use placeholders where needed and keep tone professional.

Job Title: ${job_title}
Company: ${company_name || "Not specified"}
Required Skills: ${analysis.required_skills.join(", ")}
Preferred Skills: ${analysis.preferred_skills.join(", ")}
Keywords: ${analysis.keywords.join(", ")}
Experience Level: ${analysis.experience_level}
Key Requirements: ${analysis.key_requirements.join(", ")}
Nice to Have: ${analysis.nice_to_have.join(", ")}
Company Culture: ${analysis.company_culture.join(", ")}
Benefits: ${analysis.benefits.join(", ")}

Output ONLY the Markdown resume as resume_markdown. Sections to include: Header with name and contact placeholders, Summary aligned to job, Skills mapped to job, Experience (2-3 roles with bullet points), Projects (1-2), Education, and Additional.
`,
      })

      // Persist the generated resume as a text resume for the user
      generatedResume = await createResumeDuplicate(
        user.id,
        `${job_title} — Generated Resume`,
        resumeGen.resume_markdown,
      )
    } catch (resumeError: any) {
      console.error("Resume generation failed:", resumeError)
      
      // Resume generation failed, but job analysis succeeded
      // Return analysis without generated resume rather than failing completely
      console.log("Continuing without generated resume due to:", resumeError.message)
      
      return NextResponse.json(
        { 
          analysis: jobAnalysis, 
          warning: "Job analysis completed successfully, but resume generation failed. You can still use the analysis results.",
          generated_resume_id: null 
        },
        { headers: getRateLimitHeaders(rateLimitResult) },
      )
    }

    return NextResponse.json(
      { analysis: jobAnalysis, generated_resume_id: generatedResume.id },
      { headers: getRateLimitHeaders(rateLimitResult) },
    )
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error, code: errorInfo.code }, { status: errorInfo.statusCode })
  }
}
