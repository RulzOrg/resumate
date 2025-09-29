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

    const evidence = await searchEvidence(user.id, derivedQueries, top_k)
    const score = computeScore(analysis as any, evidence)

    return NextResponse.json({ evidence, score })
  } catch (err) {
    const e = handleApiError(err)
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode })
  }
}
