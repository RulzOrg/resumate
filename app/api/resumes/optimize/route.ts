import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, createOptimizedResume, getOrCreateUser, getUserById, ensureUserSyncRecord, incrementUsage, getCachedStructure, saveParsedStructure, createJobAnalysisWithVerification } from "@/lib/db"
import { extractResumeWithLLM } from "@/lib/llm-resume-extractor"
import { canPerformAction } from "@/lib/subscription"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { withRetry, AppError } from "@/lib/error-handler"
import { optimizeResumeStructured } from "@/lib/structured-optimizer"
import { formatResumeToMarkdown } from "@/lib/resume-formatter"
import { countNullValues, sanitizeParsedResume, toStructuredDocument } from "@/lib/optimized-resume-document"
import { errorResponse, fromError } from "@/lib/api-response"
import { redactForLog } from "@/lib/security/redaction"
import { createLogger } from "@/lib/debug-logger"
import { z, ZodError } from "zod"

const log = createLogger("Optimize")

// Allow up to 5 minutes for generation (Pro plan limit)
export const maxDuration = 300;

const WorkExperienceInputSchema = z.object({
  company: z.string().nullish(),
  title: z.string().nullish(),
  location: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  employmentType: z.string().nullish(),
  bullets: z.array(z.string().nullish()).optional(),
}).strict()

const OptimizeRequestSchema = z.object({
  resume_id: z.string().min(1),
  job_title: z.string().min(1),
  company_name: z.string().nullish(),
  job_description: z.string().min(50),
  work_experience: z.array(WorkExperienceInputSchema).nullish(),
  summary: z.string().nullish(),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return errorResponse(401, "UNAUTHORIZED", "Unauthorized", { retryable: false })
    }

    const rateLimitResult = await rateLimit(`optimize:${userId}`, 5, 300000) // 5 requests per 5 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded. Please wait before making another optimization request.",
          error: "Rate limit exceeded. Please wait before making another optimization request.",
          retryable: true,
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

    // Check subscription limits
    const canOptimize = await canPerformAction('resumeOptimizations')
    if (!canOptimize) {
      return errorResponse(
        403,
        "LIMIT_EXCEEDED",
        "You've reached your monthly resume optimization limit. Upgrade to Pro for unlimited optimizations.",
        { retryable: false }
      )
    }

    const parsedBody = OptimizeRequestSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return errorResponse(400, "INVALID_REQUEST", "Invalid optimize payload", {
        retryable: false,
        details: parsedBody.error.flatten(),
      })
    }

    const {
      resume_id,
      job_title,
      company_name,
      job_description,
      work_experience,
      summary: confirmed_summary,
    } = parsedBody.data

    const incomingNullCount = countNullValues({
      work_experience,
      summary: confirmed_summary,
    })

    log.log('[Optimize] Request received:', redactForLog({
      resume_id,
      job_title,
      user_id: user.id,
      clerk_user_id: user.clerk_user_id,
      has_confirmed_content: !!(work_experience || confirmed_summary),
      work_experience_count: work_experience?.length,
      incoming_null_fields: incomingNullCount,
    }))

    // Get the resume
    log.log('[Optimize] Looking up resume:', redactForLog({ resume_id, user_id: user.id }))
    const resume = await getResumeById(resume_id, user.id)

    if (!resume) {
      // Debug: Check if resume exists at all (without user filter)
      const { sql } = await import("@/lib/db")
      const [anyResume] = await sql`SELECT id, user_id, title, deleted_at FROM resumes WHERE id = ${resume_id}`
      log.log('[Optimize] Resume lookup failed. Debug info:', redactForLog({
        resume_id,
        requested_user_id: user.id,
        found_resume: anyResume ? {
          id: anyResume.id,
          user_id: anyResume.user_id,
          title: anyResume.title,
          deleted: !!anyResume.deleted_at,
          user_mismatch: anyResume.user_id !== user.id,
        } : 'NOT_FOUND_AT_ALL'
      }))
      throw new AppError("Resume not found", 404)
    }

    log.log('[Optimize] Resume found:', redactForLog({
      id: resume.id,
      user_id: resume.user_id,
      title: resume.title,
      content_length: resume.content_text?.length || 0,
      has_content: !!resume.content_text,
    }))

    if (!resume.content_text || resume.content_text.trim().length < 50) {
      throw new AppError(
        "Resume content is too short or missing. Please re-upload your resume.",
        400,
      )
    }

    // Generate optimized resume
    const optimization = await withRetry(
      async () => {
        log.log('[Optimize] Starting structured optimization...')
        const startTime = Date.now()

        if (!process.env.ANTHROPIC_API_KEY) {
          throw new AppError("ANTHROPIC_API_KEY is not configured", 500, "MISSING_API_KEY")
        }

        try {
          // Check for cached structure or extract new one
          const extractionStartTime = Date.now()
          let resumeStructure = await getCachedStructure(resume.id)
          let cacheHit = false

          if (!resumeStructure) {
            log.log('[Optimize] Cache miss: extracting structure via LLM...')
            const extractionResult = await extractResumeWithLLM(resume.content_text!, process.env.ANTHROPIC_API_KEY)

            if (!extractionResult.success) {
              // If we have confirmed content from the review dialog, use it with a minimal structure
              // Otherwise, fail with an error
              if (work_experience && work_experience.length > 0) {
                log.warn('[Optimize] Extraction failed but we have confirmed content from review dialog. Creating minimal structure.')
                resumeStructure = {
                  contact: { name: '' },
                  workExperience: work_experience,
                  summary: confirmed_summary || '',
                  education: [],
                  skills: [],
                  interests: [],
                  certifications: [],
                  awards: [],
                  projects: [],
                  volunteering: [],
                  publications: [],
                }
              } else {
                // Map extraction error codes to user-friendly messages
                const errorCode = extractionResult.error?.code || 'EXTRACTION_FAILED'
                let errorMessage: string
                let statusCode = 400

                switch (errorCode) {
                  case 'NOT_A_RESUME':
                    errorMessage = "This doesn't appear to be a resume. Please upload a resume file."
                    break
                  case 'INCOMPLETE':
                    errorMessage = "Resume is missing key sections. Please ensure your resume includes work experience, education, or skills."
                    break
                  case 'EXTRACTION_FAILED':
                    errorMessage = "Failed to parse resume. Please try uploading a different format (DOCX recommended)."
                    statusCode = 500
                    break
                  case 'INVALID_INPUT':
                    errorMessage = "Resume content is too short or invalid."
                    break
                  default:
                    errorMessage = extractionResult.error?.message || "Failed to extract resume structure. Please try uploading a different format."
                    statusCode = 500
                }

                log.error('[Optimize] LLM extraction failed:', redactForLog({
                  errorCode,
                  errorMessage: extractionResult.error?.message,
                  documentType: extractionResult.error?.documentType,
                }))

                throw new AppError(errorMessage, statusCode, errorCode)
              }
            } else if (!extractionResult.resume) {
              // Same fallback: use confirmed content if available
              if (work_experience && work_experience.length > 0) {
                log.warn('[Optimize] Extraction returned no structure but we have confirmed content. Creating minimal structure.')
                resumeStructure = {
                  contact: { name: '' },
                  workExperience: work_experience,
                  summary: confirmed_summary || '',
                  education: [],
                  skills: [],
                  interests: [],
                  certifications: [],
                  awards: [],
                  projects: [],
                  volunteering: [],
                  publications: [],
                }
              } else {
                throw new AppError("Failed to extract resume structure. Please try uploading a different format.", 500, "EXTRACTION_FAILED")
              }
            } else {
              resumeStructure = extractionResult.resume
            }
            const extractionDuration = Date.now() - extractionStartTime
            log.log('[Optimize] Extraction successful:', redactForLog({
              duration: `${extractionDuration}ms`,
              workExperienceCount: resumeStructure.workExperience.length,
              educationCount: resumeStructure.education.length,
              skillsCount: resumeStructure.skills.length,
              wasTruncated: extractionResult.metadata?.truncated,
            }))

            // Cache the structure (non-blocking)
            saveParsedStructure(resume.id, resumeStructure).catch(err =>
              log.error('[Optimize] Failed to cache structure:', err)
            )
          } else {
            cacheHit = true
            const cacheCheckDuration = Date.now() - extractionStartTime
            log.log('[Optimize] Cache hit: using stored resume structure', redactForLog({
              duration: `${cacheCheckDuration}ms`,
              workExperienceCount: resumeStructure.workExperience.length,
              educationCount: resumeStructure.education.length,
              skillsCount: resumeStructure.skills.length,
            }))
          }

          // Merge confirmed content if provided (from review step)
          // This preserves contact, education, skills, etc. while using user-confirmed work experience and summary
          if (work_experience !== undefined || confirmed_summary !== undefined) {
            log.log('[Optimize] Merging confirmed content with cached structure:', redactForLog({
              has_work_experience: work_experience !== undefined && work_experience !== null,
              work_experience_count: work_experience?.length,
              has_summary: confirmed_summary !== undefined,
            }))
            
            resumeStructure = {
              ...resumeStructure,
              // Override work experience if provided
              ...(work_experience !== undefined && work_experience !== null && { workExperience: work_experience }),
              // Override summary if provided
              ...(confirmed_summary !== undefined && { summary: confirmed_summary }),
            }
            
            log.log('[Optimize] Merged structure:', redactForLog({
              workExperienceCount: resumeStructure.workExperience.length,
              educationCount: resumeStructure.education.length,
              skillsCount: resumeStructure.skills.length,
              hasSummary: !!resumeStructure.summary,
            }))
          }

          // Canonical null-safe normalization before optimization.
          resumeStructure = sanitizeParsedResume(resumeStructure)
          log.log("[Optimize] Normalized merged structure:", {
            normalized_null_fields_remaining: countNullValues(resumeStructure),
            workExperienceCount: resumeStructure.workExperience.length,
            educationCount: resumeStructure.education.length,
            skillsCount: resumeStructure.skills.length,
          })

          // Optimize with structured data (mandatory - no fallback to string parsing)
          const result = await optimizeResumeStructured(
            resumeStructure,
            job_title,
            company_name || null,
            job_description,
            process.env.ANTHROPIC_API_KEY
          )

          const optimizationDuration = Date.now() - startTime
          const totalDuration = Date.now() - startTime
          log.log('[Optimize] Structured optimization completed:', redactForLog({
            totalDuration: `${totalDuration}ms`,
            optimizationDuration: `${optimizationDuration}ms`,
            cacheHit,
            summary_was_created: result.optimizationDetails.summary_was_created,
            target_title_was_created: result.optimizationDetails.target_title_was_created,
            skills_preserved: result.optimizedResume.skills.length,
            education_preserved: result.optimizedResume.education.length,
            workExperience_preserved: result.optimizedResume.workExperience.length,
            certifications_preserved: result.optimizedResume.certifications.length,
            match_score_before: result.optimizationDetails.match_score_before,
            match_score_after: result.optimizationDetails.match_score_after,
          }))

          // Convert optimized structured data to markdown
          const optimizedContent = formatResumeToMarkdown(result.optimizedResume)

          // Derive skills_highlighted by matching resume skills against job description and keywords.
          const jobDescLower = job_description.toLowerCase()
          const relevantSkills = (resumeStructure?.skills || [])
            .map((s) => s.replace(/\*\*/g, "").trim())
            .filter((skill) => {
              const skillLower = skill.toLowerCase()
              return (
                jobDescLower.includes(skillLower) ||
                result.optimizationDetails.keywords_added.some(
                  (kw) => kw.toLowerCase().includes(skillLower) || skillLower.includes(kw.toLowerCase()),
                )
              )
            })
          return {
            optimized_content: optimizedContent,
            optimized_resume: result.optimizedResume,
            summary_was_created: result.optimizationDetails.summary_was_created,
            target_title_was_created: result.optimizationDetails.target_title_was_created,
            changes_made: result.optimizationDetails.changes_made,
            keywords_added: result.optimizationDetails.keywords_added,
            skills_highlighted: relevantSkills,
            sections_improved: [
              ...(result.optimizationDetails.summary_was_created ? ["Professional Summary (created)"] : ["Professional Summary (optimized)"]),
              "Work Experience",
              ...(result.optimizationDetails.target_title_was_created ? ["Target Title (created)"] : ["Target Title (preserved)"]),
            ],
            match_score_before: result.optimizationDetails.match_score_before,
            match_score_after: result.optimizationDetails.match_score_after,
            recommendations: result.optimizationDetails.recommendations,
          }
        } catch (error: any) {
          log.error('[Optimize] Structured optimization error:', error)

          if (error.status === 401) {
            throw new AppError("Invalid Anthropic API key", 500, "INVALID_API_KEY")
          }
          if (error.status === 429) {
            throw new AppError("Anthropic API rate limit exceeded", 429, "RATE_LIMIT")
          }

          throw new Error(`Structured optimization failed: ${error.message || String(error)}`)
        }
      },
      3,
      2000,
    )

    // Ensure user row exists for FK integrity
    const userRow = await getUserById(resume.user_id)
    if (!userRow) {
      await ensureUserSyncRecord({
        id: resume.user_id,
        email: user.email,
        name: user.name,
        clerkUserId: user.clerk_user_id,
        subscription_plan: user.subscription_plan,
        subscription_status: user.subscription_status,
      })
    }

    // Create or update job analysis record (increments usage only for new jobs)
    const jobAnalysis = await createJobAnalysisWithVerification({
      user_id: resume.user_id,
      job_title,
      company_name: company_name || undefined,
      job_description,
      analysis_result: {
        keywords: optimization.keywords_added || [],
        required_skills: [],
        preferred_skills: [],
        experience_level: '',
        key_requirements: [],
        nice_to_have: [],
        company_culture: [],
        benefits: [],
      }
    })

    let structuredOutput
    try {
      structuredOutput = toStructuredDocument(optimization.optimized_resume, {
        provenanceDefault: "extracted",
        fieldProvenance: {
          summary: optimization.summary_was_created ? "ai_generated" : "user_edited",
          target: optimization.target_title_was_created ? "ai_generated" : "extracted",
          experience: "ai_generated",
        },
        lastEditor: user.id,
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse(
          400,
          "INVALID_STRUCTURED_DOCUMENT",
          "Optimized resume structure is invalid",
          {
            retryable: false,
            details: error.issues,
          }
        )
      }
      throw error
    }

    // Create the optimized resume record
    const optimizedResume = await createOptimizedResume({
      user_id: resume.user_id,
      original_resume_id: resume_id,
      job_analysis_id: jobAnalysis.id,
      job_title,
      company_name: company_name || null,
      job_description,
      title: `${resume.title} - Optimized for ${job_title}`,
      optimized_content: optimization.optimized_content,
      optimization_summary: {
        changes_made: optimization.changes_made,
        keywords_added: optimization.keywords_added,
        skills_highlighted: optimization.skills_highlighted,
        sections_improved: optimization.sections_improved,
        match_score_before: optimization.match_score_before,
        match_score_after: optimization.match_score_after,
        recommendations: optimization.recommendations,
      },
      match_score: optimization.match_score_after,
      structured_output: structuredOutput,
    })

    // Increment usage tracking for this successful optimization
    await incrementUsage(user.id, 'resume_optimization', user.subscription_plan || 'free')

    return NextResponse.json({
      optimized_resume: optimizedResume,
      structured_output_summary: {
        schema_version: structuredOutput.schema_version,
        section_counts: {
          experience: structuredOutput.document.workExperience.length,
          education: structuredOutput.document.education.length,
          skills: structuredOutput.document.skills.length,
          projects: structuredOutput.document.projects.length,
        },
        metadata: structuredOutput.metadata,
      },
      optimization_details: {
        changes_made: optimization.changes_made,
        keywords_added: optimization.keywords_added,
        skills_highlighted: optimization.skills_highlighted,
        match_score_before: optimization.match_score_before,
        match_score_after: optimization.match_score_after,
        recommendations: optimization.recommendations,
      }
    }, { headers: getRateLimitHeaders(rateLimitResult) })
  } catch (error) {
    return fromError(error)
  }
}
