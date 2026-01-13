import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, createOptimizedResume, getOrCreateUser, getUserById, ensureUserSyncRecord, incrementUsage, getCachedStructure, saveParsedStructure, createJobAnalysisWithVerification } from "@/lib/db"
import { extractResumeWithLLM } from "@/lib/llm-resume-extractor"
import { canPerformAction } from "@/lib/subscription"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"
import { optimizeResumeStructured } from "@/lib/structured-optimizer"
import { formatResumeToMarkdown } from "@/lib/resume-formatter"

// Allow up to 5 minutes for generation (Pro plan limit)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResult = rateLimit(`optimize:${userId}`, 5, 300000) // 5 requests per 5 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before making another optimization request.",
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
      return NextResponse.json({
        error: "You've reached your monthly resume optimization limit. Upgrade to Pro for unlimited optimizations.",
        code: "LIMIT_EXCEEDED"
      }, { status: 403 })
    }

    const { 
      resume_id, 
      job_title, 
      company_name, 
      job_description,
      // Optional: pre-confirmed content from review step
      work_experience,
      summary: confirmed_summary
    } = await request.json()

    console.log('[Optimize] Request received:', {
      resume_id,
      job_title,
      user_id: user.id,
      clerk_user_id: user.clerk_user_id,
      has_confirmed_content: !!(work_experience || confirmed_summary),
      work_experience_count: work_experience?.length,
    })

    if (!resume_id) {
      throw new AppError("Resume ID is required", 400)
    }

    if (!job_title || !job_description) {
      throw new AppError("Job title and job description are required", 400)
    }

    if (job_description.trim().length < 50) {
      throw new AppError("Job description is too short. Please provide more details about the position.", 400)
    }

    // Get the resume
    console.log('[Optimize] Looking up resume:', { resume_id, user_id: user.id })
    const resume = await getResumeById(resume_id, user.id)

    if (!resume) {
      // Debug: Check if resume exists at all (without user filter)
      const { sql } = await import("@/lib/db")
      const [anyResume] = await sql`SELECT id, user_id, title, deleted_at FROM resumes WHERE id = ${resume_id}`
      console.log('[Optimize] Resume lookup failed. Debug info:', {
        resume_id,
        requested_user_id: user.id,
        found_resume: anyResume ? {
          id: anyResume.id,
          user_id: anyResume.user_id,
          title: anyResume.title,
          deleted: !!anyResume.deleted_at,
          user_mismatch: anyResume.user_id !== user.id,
        } : 'NOT_FOUND_AT_ALL'
      })
      throw new AppError("Resume not found", 404)
    }

    console.log('[Optimize] Resume found:', {
      id: resume.id,
      user_id: resume.user_id,
      title: resume.title,
      content_length: resume.content_text?.length || 0,
      content_preview: resume.content_text?.substring(0, 200) || 'EMPTY',
      has_content: !!resume.content_text,
    })

    if (!resume.content_text || resume.content_text.trim().length < 50) {
      throw new AppError(
        "Resume content is too short or missing. Please re-upload your resume.",
        400,
      )
    }

    // Generate optimized resume
    const optimization = await withRetry(
      async () => {
        console.log('[Optimize] Starting structured optimization...')
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
            console.log('[Optimize] Cache miss: extracting structure via LLM...')
            const extractionResult = await extractResumeWithLLM(resume.content_text!, process.env.ANTHROPIC_API_KEY)

            if (!extractionResult.success) {
              // If we have confirmed content from the review dialog, use it with a minimal structure
              // Otherwise, fail with an error
              if (work_experience && work_experience.length > 0) {
                console.warn('[Optimize] Extraction failed but we have confirmed content from review dialog. Creating minimal structure.')
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

                console.error('[Optimize] LLM extraction failed:', {
                  errorCode,
                  errorMessage: extractionResult.error?.message,
                  documentType: extractionResult.error?.documentType,
                })

                throw new AppError(errorMessage, statusCode, errorCode)
              }
            } else if (!extractionResult.resume) {
              // Same fallback: use confirmed content if available
              if (work_experience && work_experience.length > 0) {
                console.warn('[Optimize] Extraction returned no structure but we have confirmed content. Creating minimal structure.')
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
            console.log('[Optimize] Extraction successful:', {
              duration: `${extractionDuration}ms`,
              workExperienceCount: resumeStructure.workExperience.length,
              educationCount: resumeStructure.education.length,
              skillsCount: resumeStructure.skills.length,
              wasTruncated: extractionResult.metadata?.truncated,
            })

            // Cache the structure (non-blocking)
            saveParsedStructure(resume.id, resumeStructure).catch(err =>
              console.error('[Optimize] Failed to cache structure:', err)
            )
          } else {
            cacheHit = true
            const cacheCheckDuration = Date.now() - extractionStartTime
            console.log('[Optimize] Cache hit: using stored resume structure', {
              duration: `${cacheCheckDuration}ms`,
              workExperienceCount: resumeStructure.workExperience.length,
              educationCount: resumeStructure.education.length,
              skillsCount: resumeStructure.skills.length,
            })
          }

          // Merge confirmed content if provided (from review step)
          // This preserves contact, education, skills, etc. while using user-confirmed work experience and summary
          if (work_experience || confirmed_summary) {
            console.log('[Optimize] Merging confirmed content with cached structure:', {
              has_work_experience: !!work_experience,
              work_experience_count: work_experience?.length,
              has_summary: !!confirmed_summary,
            })
            
            resumeStructure = {
              ...resumeStructure,
              // Override work experience if provided
              ...(work_experience && { workExperience: work_experience }),
              // Override summary if provided
              ...(confirmed_summary !== undefined && { summary: confirmed_summary }),
            }
            
            console.log('[Optimize] Merged structure:', {
              workExperienceCount: resumeStructure.workExperience.length,
              educationCount: resumeStructure.education.length,
              skillsCount: resumeStructure.skills.length,
              hasSummary: !!resumeStructure.summary,
            })
          }

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
          console.log('[Optimize] Structured optimization completed:', {
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
          })
          console.log('[Optimize] Optimized resume data before formatting:', {
            education: result.optimizedResume.education.map(e => ({ institution: e.institution, degree: e.degree })),
            skills: result.optimizedResume.skills.slice(0, 5),
            workExperience: result.optimizedResume.workExperience.map(e => ({ company: e.company, title: e.title, bulletsCount: e.bullets.length })),
          })

          // Convert optimized structured data to markdown
          const optimizedContent = formatResumeToMarkdown(result.optimizedResume)

          console.log('[Optimize] Generated markdown preview:', {
            length: optimizedContent.length,
            educationSectionExists: optimizedContent.includes('## Education'),
            skillsSectionExists: optimizedContent.includes('## Skills'),
            educationSectionPreview: optimizedContent.match(/## Education[\s\S]{0,300}/)?.[0],
            skillsSectionPreview: optimizedContent.match(/## Skills[\s\S]{0,200}/)?.[0],
          })

          return {
            optimized_content: optimizedContent,
            changes_made: result.optimizationDetails.changes_made,
            keywords_added: result.optimizationDetails.keywords_added,
            skills_highlighted: [], // Skills are preserved, not modified
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
          console.error('[Optimize] Structured optimization error:', error)

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
      optimization_summary: optimization,
      match_score: optimization.match_score_after,
    })

    // Increment usage tracking for this successful optimization
    await incrementUsage(user.id, 'resume_optimization', user.subscription_plan || 'free')

    return NextResponse.json({
      optimized_resume: optimizedResume,
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
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error, code: errorInfo.code }, { status: errorInfo.statusCode })
  }
}
