import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { getJobAnalysisById, getOrCreateUser, getResumeById, type JobAnalysis } from "@/lib/db"
import { AppError, handleApiError } from "@/lib/error-handler"
import { computeScore, searchEvidence } from "@/lib/match"

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
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    const parsed = ScoreRequest.safeParse(await req.json())
    if (!parsed.success) {
      throw new AppError("Invalid request payload", 400, "INVALID_BODY")
    }

    const { job_analysis_id, resume_id, queries, top_k } = parsed.data

    const analysis = await getJobAnalysisById(job_analysis_id, user.id)
    if (!analysis) {
      throw new AppError("Job analysis not found", 404)
    }

    if (resume_id) {
      const resume = await getResumeById(resume_id, user.id)
      if (!resume) {
        throw new AppError("Resume not found", 404)
      }
    }

    const derivedQueries = (queries && queries.length > 0 ? queries : deriveQueriesFromAnalysis(analysis)).filter(
      (query) => query.trim().length > 0,
    )

    if (!derivedQueries.length) {
      throw new AppError("Unable to derive search queries from analysis", 400, "NO_QUERIES")
    }

    const evidence = await searchEvidence(user.id, derivedQueries, top_k)
    const score = computeScore(analysis, evidence)

    return NextResponse.json({ evidence, score })
  } catch (error) {
    const e = handleApiError(error)
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode })
  }
}

function deriveQueriesFromAnalysis(analysis: JobAnalysis | undefined) {
  if (!analysis) return []

  const requiredSkills = Array.isArray(analysis.required_skills) ? analysis.required_skills : []
  const keyRequirements = Array.isArray(analysis.analysis_result?.key_requirements)
    ? analysis.analysis_result?.key_requirements
    : []
  const keywords = Array.isArray(analysis.keywords) ? analysis.keywords : []

  return [...requiredSkills, ...keyRequirements, ...keywords]
}
