import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { getOrCreateUser, getJobAnalysisById, getResumeById, getUserResumes } from "@/lib/db"
import { searchEvidence, computeScoreWithAI } from "@/lib/match"
import { AppError, handleApiError } from "@/lib/error-handler"

export const runtime = "nodejs"

const ScoreRequest = z.object({
  job_analysis_id: z.string(),
  resume_id: z.string().optional(),
  queries: z.array(z.string()).optional(),
  top_k: z.number().min(1).max(20).default(5),
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await getOrCreateUser()
    if (!user) throw new AppError("User not found", 404)

    const { job_analysis_id, resume_id, queries, top_k } = ScoreRequest.parse(await req.json())

    const analysis = await getJobAnalysisById(job_analysis_id, user.id)
    if (!analysis) throw new AppError("Job analysis not found", 404)

    // Fetch resume for fallback scoring (get content_text for AI analysis)
    // If resume_id is provided, use that specific resume
    // Otherwise, fall back to user's primary resume (or first resume) for scoring
    let resume: any = null
    let usedFallbackResume = false
    
    if (resume_id) {
      resume = await getResumeById(resume_id, user.id)
      if (!resume) throw new AppError("Resume not found", 404)
    } else {
      // No resume_id provided - try to get user's primary/first resume for fallback
      const userResumes = await getUserResumes(user.id)
      if (userResumes && userResumes.length > 0) {
        // getUserResumes returns resumes sorted by is_primary DESC, so first is primary
        resume = userResumes[0]
        usedFallbackResume = true
        console.log(`[score] No resume_id provided, using fallback resume: ${resume.id} (${resume.title})`)
      }
    }

    const derivedQueries = (queries && queries.length ? queries : [
      ...(Array.isArray(analysis.required_skills) ? analysis.required_skills : []),
      ...(Array.isArray(analysis.analysis_result?.key_requirements) ? analysis.analysis_result!.key_requirements : []),
      ...(Array.isArray(analysis.keywords) ? analysis.keywords : []),
      ...(Array.isArray(analysis.analysis_result?.keywords) ? analysis.analysis_result!.keywords : []),
    ])
      .filter((s) => typeof s === "string" && s.trim().length > 0)

    let evidence: any[] = []
    let score = null
    let debugInfo: any = {}
    const resumeText = resume?.content_text || null

    console.log(`[score] Starting scoring:`, {
      jobAnalysisId: job_analysis_id,
      resumeId: resume_id || 'none provided',
      usedFallbackResume,
      fallbackResumeId: usedFallbackResume ? resume?.id : null,
      resumeTextLength: resumeText?.length || 0,
      hasResumeText: !!resumeText && resumeText.trim().length > 50,
    })

    try {
      const searchStartTime = Date.now()
      // Pass resume_id to filter evidence to specific resume if provided
      // If using fallback resume, also pass its ID to filter evidence
      const effectiveResumeId = resume_id || (usedFallbackResume ? resume?.id : undefined)
      evidence = await searchEvidence(user.id, derivedQueries, top_k, effectiveResumeId)
      const searchDuration = Date.now() - searchStartTime

      // Pass resume text as fallback for AI scoring when evidence is limited
      score = await computeScoreWithAI(analysis as any, evidence, resumeText)

      // Build status message for UI
      let status = 'success'
      let statusMessage = ''
      
      if (evidence.length > 0) {
        status = 'success'
        statusMessage = `Scored using ${evidence.length} evidence points from vector search`
      } else if (resumeText && score?.scoringMethod === 'resume_text') {
        status = 'fallback'
        statusMessage = 'Scored using resume text (vector search returned no results)'
      } else if (resumeText && score?.scoringMethod === 'hybrid') {
        status = 'success'
        statusMessage = 'Scored using hybrid method (evidence + resume context)'
      } else {
        status = 'limited'
        statusMessage = 'Limited scoring - check resume selection'
      }

      // Debug information
      debugInfo = {
        status,
        statusMessage,
        queriesUsed: derivedQueries.slice(0, 10), // First 10 queries
        totalQueries: derivedQueries.length,
        evidenceCount: evidence.length,
        searchDurationMs: searchDuration,
        jobAnalysisId: job_analysis_id,
        resumeId: effectiveResumeId || 'all resumes',
        resumeTitle: resume?.title || null,
        usedFallbackResume,
        resumeFiltered: !!effectiveResumeId,
        qdrantAvailable: evidence.length > 0 || derivedQueries.length === 0,
        scoringMethod: score?.scoringMethod || 'unknown',
        confidence: score?.confidence || 0,
        hasResumeTextFallback: !!resumeText,
        resumeTextLength: resumeText?.length || 0,
      }
    } catch (vectorError: any) {
      console.error("Vector search error:", vectorError)

      // Check if it's a Qdrant connection error
      if (vectorError.message?.includes("ECONNREFUSED") ||
        vectorError.message?.includes("fetch failed") ||
        vectorError.code === "ECONNREFUSED") {
        // Graceful degradation: Try scoring with resume text fallback
        console.warn('Qdrant unavailable - attempting resume text fallback scoring')
        evidence = []
        
        // Still try to score using resume text if available
        if (resumeText) {
          try {
            score = await computeScoreWithAI(analysis as any, [], resumeText)
            console.log(`[score] Fallback scoring successful: overall=${score?.overall}, confidence=${score?.confidence}`)
            debugInfo = {
              status: 'fallback',
              statusMessage: 'Vector search unavailable - scored using resume text analysis',
              warning: 'Qdrant unavailable - scored using resume text fallback',
              qdrantAvailable: false,
              scoringMethod: score?.scoringMethod || 'resume_text',
              confidence: score?.confidence || 0,
              hasResumeTextFallback: true,
              resumeTitle: resume?.title || null,
              resumeTextLength: resumeText?.length || 0,
            }
          } catch (scoreError: any) {
            console.error("Fallback scoring error:", scoreError)
            score = null
            debugInfo = {
              status: 'error',
              statusMessage: 'AI scoring failed - please try again',
              warning: 'Both Qdrant and fallback scoring failed',
              error: scoreError.message,
              qdrantAvailable: false,
            }
          }
        } else {
          console.warn('[score] No resume text available for fallback scoring')
          debugInfo = {
            status: 'no_resume',
            statusMessage: 'No resume content available for scoring',
            warning: 'Qdrant unavailable and no resume text for fallback. Please select a resume.',
            qdrantAvailable: false,
            hasResumeTextFallback: false,
            suggestion: 'Try selecting a specific resume from the dropdown',
          }
          score = null
        }
      } else {
        // For other vector errors, throw
        throw new AppError(
          `Vector search failed: ${vectorError.message || "Unknown error"}. Check Qdrant configuration.`,
          500
        )
      }
    }

    return NextResponse.json({ evidence, score, debug: debugInfo })
  } catch (err) {
    const e = handleApiError(err)
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode })
  }
}
