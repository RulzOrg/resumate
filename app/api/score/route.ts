import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { getOrCreateUser, getJobAnalysisById, getResumeById } from "@/lib/db"
import { searchEvidence, computeScore } from "@/lib/match"
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

    if (resume_id) {
      const resume = await getResumeById(resume_id, user.id)
      if (!resume) throw new AppError("Resume not found", 404)
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

    try {
      const searchStartTime = Date.now()
      // Pass resume_id to filter evidence to specific resume if provided
      evidence = await searchEvidence(user.id, derivedQueries, top_k, resume_id)
      const searchDuration = Date.now() - searchStartTime

      score = computeScore(analysis as any, evidence)

      // Debug information
      debugInfo = {
        queriesUsed: derivedQueries.slice(0, 10), // First 10 queries
        totalQueries: derivedQueries.length,
        evidenceCount: evidence.length,
        searchDurationMs: searchDuration,
        jobAnalysisId: job_analysis_id,
        resumeId: resume_id || 'all resumes',
        resumeFiltered: !!resume_id,
        qdrantAvailable: evidence.length > 0 || derivedQueries.length === 0,
        scoreWeighting: {
          note: 'Weights adjusted based on seniority level and role type'
        }
      }
    } catch (vectorError: any) {
      console.error("Vector search error:", vectorError)

      // Check if it's a Qdrant connection error
      if (vectorError.message?.includes("ECONNREFUSED") ||
          vectorError.message?.includes("fetch failed") ||
          vectorError.code === "ECONNREFUSED") {
        // Graceful degradation: return empty results with warning
        debugInfo = {
          warning: 'Qdrant vector search unavailable - returning empty evidence',
          error: vectorError.message,
          queriesAttempted: derivedQueries.length,
          qdrantAvailable: false
        }
        evidence = []
        score = null
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
