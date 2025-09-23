import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createJobAnalysis, getOrCreateUser, createResumeDuplicate } from "@/lib/db"
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
  experience_level: z.string().describe("Required experience level (e.g., Entry Level, Mid Level, Senior)"),
  salary_range: z.string().optional().describe("Salary range if mentioned"),
  location: z.string().optional().describe("Job location"),
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
          prompt: `Analyze this job posting and extract structured information:

Job Title: ${job_title}
Company: ${company_name || "Not specified"}
Job Description:
${processedContent}

${contentProcessed ? `Processing Note: ${processingNote}` : ''}

Please extract:
1. Important keywords that should appear in a resume
2. Required technical and soft skills
3. Preferred/nice-to-have skills
4. Experience level required
5. Salary range (if mentioned)
6. Location (if mentioned)
7. Key job requirements and responsibilities
8. Nice-to-have qualifications
9. Company culture aspects mentioned
10. Benefits and perks mentioned

Focus on actionable insights that can help optimize a resume for this position. 

In the analysis_quality section, provide:
- confidence: Your confidence in the analysis (0-100) based on content detail and clarity
- completeness: How complete the original job description was (0-100)
- content_processed: ${contentProcessed} (whether content was modified for analysis)

${contentProcessed ? 'Note: Content was processed for optimal analysis. Consider that some details may have been condensed.' : ''}`,
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
    try {
      jobAnalysis = await createJobAnalysis({
        user_id: user.id,
        job_title,
        company_name,
        job_url,
        job_description, // Save original content, not processed
        analysis_result: analysis,
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
