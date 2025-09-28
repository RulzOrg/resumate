import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import {
  createOptimizedResume,
  ensureUserSyncRecord,
  getJobAnalysisById,
  getOrCreateUser,
  getResumeById,
  getUserById,
} from "@/lib/db"
import { AppError, handleApiError, withRetry } from "@/lib/error-handler"
import { canPerformAction } from "@/lib/subscription"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { buildEvidenceId, getPointsByIds } from "@/lib/qdrant"

export const runtime = "nodejs"

const RewriteRequest = z.object({
  resume_id: z.string(),
  job_analysis_id: z.string(),
  selected_evidence: z
    .array(
      z.object({
        evidence_id: z.string(),
      }),
    )
    .min(1),
  options: z
    .object({
      tone: z.enum(["neutral", "impactful", "executive"]).default("neutral"),
      length: z.enum(["short", "standard", "detailed"]).default("standard"),
    })
    .optional(),
})

const optimizationSchema = z.object({
  optimized_content: z.string(),
  changes_made: z.array(z.string()),
  keywords_added: z.array(z.string()),
  skills_highlighted: z.array(z.string()),
  sections_improved: z.array(z.string()),
  match_score_before: z.number().min(0).max(100),
  match_score_after: z.number().min(0).max(100),
  recommendations: z.array(z.string()),
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResult = rateLimit(`rewrite:${userId}`, 5, 300000)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before requesting another rewrite.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    const canRewrite = await canPerformAction("resumeOptimizations")
    if (!canRewrite) {
      return NextResponse.json(
        {
          error: "You've reached your monthly optimization limit. Upgrade to continue rewriting resumes.",
          code: "LIMIT_EXCEEDED",
        },
        { status: 403, headers: getRateLimitHeaders(rateLimitResult) },
      )
    }

    const payload = RewriteRequest.safeParse(await req.json())
    if (!payload.success) {
      throw new AppError("Invalid request payload", 400, "INVALID_BODY")
    }

    const { resume_id, job_analysis_id, selected_evidence, options } = payload.data

    const resume = await getResumeById(resume_id, user.id)
    if (!resume) {
      throw new AppError("Resume not found", 404)
    }

    if (!resume.content_text || resume.content_text.trim().length === 0) {
      throw new AppError("Resume has no parsed content. Extract content before rewriting.", 400)
    }

    const analysis = await getJobAnalysisById(job_analysis_id, user.id)
    if (!analysis) {
      throw new AppError("Job analysis not found", 404)
    }

    const uniqueEvidenceIds = Array.from(new Set(selected_evidence.map((e) => e.evidence_id)))
    if (uniqueEvidenceIds.length !== selected_evidence.length) {
      throw new AppError("Duplicate evidence entries detected", 400)
    }

    const qdrantIds = uniqueEvidenceIds.map((id) => buildEvidenceId(user.id, id))
    const points = await getPointsByIds(qdrantIds)

    const evidenceMap = new Map<string, string>()
    points.forEach((point) => {
      const payload = (point.payload ?? {}) as Record<string, any>
      const text = typeof payload.text === "string" ? payload.text : payload.content
      if (text) {
        const rawId = typeof point.id === "string" ? point.id : String(point.id)
        const parts = rawId.split(":")
        const evidenceId = parts.length > 1 ? parts[1] : rawId
        evidenceMap.set(evidenceId, text)
      }
    })

    const missingEvidence = uniqueEvidenceIds.filter((id) => !evidenceMap.has(id))
    if (missingEvidence.length) {
      throw new AppError(`Unknown evidence ids: ${missingEvidence.join(", ")}`, 400, "MISSING_EVIDENCE")
    }

    const evidenceTexts = uniqueEvidenceIds.map((id) => ({ id, text: evidenceMap.get(id) as string }))

    const rewrite = await withRetry(
      async () => {
        const { object } = await generateObject({
          model: openai("gpt-4o"),
          schema: optimizationSchema,
          prompt: buildRewritePrompt({
            resumeTitle: resume.title,
            jobTitle: analysis.job_title,
            company: analysis.company_name,
            evidence: evidenceTexts,
            options,
          }),
        })
        return object
      },
      3,
      2000,
    )

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

    const optimizedResume = await createOptimizedResume({
      user_id: resume.user_id,
      original_resume_id: resume_id,
      job_analysis_id: job_analysis_id,
      title: `${resume.title} — Rewrite for ${analysis.job_title}`,
      optimized_content: rewrite.optimized_content,
      optimization_summary: rewrite,
      match_score: rewrite.match_score_after,
    })

    return NextResponse.json(
      { optimized_resume: optimizedResume },
      { headers: getRateLimitHeaders(rateLimitResult) },
    )
  } catch (error) {
    const e = handleApiError(error)
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode })
  }
}

function buildRewritePrompt(params: {
  resumeTitle: string
  jobTitle: string
  company?: string
  evidence: { id: string; text: string }[]
  options?: { tone: string; length: string }
}) {
  const { resumeTitle, jobTitle, company, evidence, options } = params
  const tone = options?.tone ?? "neutral"
  const length = options?.length ?? "standard"
  const jobLabel = company ? `${jobTitle} at ${company}` : jobTitle

  const evidenceBlock = evidence
    .map((item) => `- [${item.id}] ${item.text}`)
    .join("\n")

  return `You are an expert resume writer. Rewrite the resume "${resumeTitle}" for the role ${jobLabel} using ONLY the evidence provided. Each bullet must represent information present in the supplied evidence.

Selected evidence:
${evidenceBlock}

Constraints:
1. Do not invent or infer achievements beyond the text above.
2. Maintain factual integrity; every statement must be supported by the evidence list.
3. Adopt a ${tone} tone and aim for ${length} level of detail.
4. Keep the resume ATS-friendly and structured in Markdown.
5. Highlight measurable outcomes when present in the evidence.

Output a JSON object matching the schema with the rewritten resume and supporting metadata.`
}
