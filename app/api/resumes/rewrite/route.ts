import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { AppError, handleApiError, withRetry } from "@/lib/error-handler"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import {
  getOrCreateUser,
  getResumeById,
  getJobAnalysisById,
  createOptimizedResume,
  getUserById,
  ensureUserSyncRecord,
} from "@/lib/db"
import { qdrant, QDRANT_COLLECTION } from "@/lib/qdrant"
import { computeScoreWithAI } from "@/lib/match"

export const runtime = "nodejs"

const RewriteRequest = z.object({
  resume_id: z.string(),
  job_analysis_id: z.string(),
  selected_evidence: z.array(z.object({ evidence_id: z.string() })).min(1),
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

async function getEvidenceTextsFromQdrant(userId: string, evidenceIds: string[]) {
  try {
    // Use scroll API with filter to find points by evidence_id in payload
    // This works with our integer point IDs + evidence_id stored in payload
    const result = await qdrant.scroll(QDRANT_COLLECTION, {
      filter: {
        must: [
          { key: "userId", match: { value: userId } },
          { key: "evidence_id", match: { any: evidenceIds } }
        ]
      },
      limit: Math.min(evidenceIds.length + 10, 100), // Fetch enough to cover all requested
      with_payload: true,
      with_vector: false,
    })

    const map: Record<string, string> = {}
    const points = result.points || []

    for (const p of points) {
      const payload: any = (p as any).payload || {}
      const text: string = payload.text || payload.content || payload.body || ""
      const eid = payload.evidence_id

      // Only add if we have valid text and this evidence_id was requested
      if (eid && evidenceIds.includes(eid) && text && text.trim().length > 0) {
        map[eid] = text
      }
    }

    console.log(`[getEvidenceTextsFromQdrant] Found ${Object.keys(map).length}/${evidenceIds.length} evidence items`)
    return map
  } catch (error: any) {
    console.error('[getEvidenceTextsFromQdrant] Error:', error.message)
    return {}
  }
}

function getEvidenceTextsFromParsedSections(parsed: any, evidenceIds: string[]) {
  const want = new Set(evidenceIds)
  const out: Record<string, string> = {}
  const visit = (node: any) => {
    if (!node || typeof node !== "object") return
    if (node.evidence_id && want.has(String(node.evidence_id))) {
      const t = node.text || node.content || node.title || ""
      if (t && !out[node.evidence_id]) out[node.evidence_id] = String(t)
    }
    for (const k of Object.keys(node)) {
      const v = (node as any)[k]
      if (Array.isArray(v)) v.forEach(visit)
      else if (v && typeof v === "object") visit(v)
    }
  }
  visit(parsed)
  return out
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const limiter = rateLimit(`rewrite:${userId}`, 5, 300000)
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before retrying.", retryAfter: limiter.retryAfter },
        { status: 429, headers: getRateLimitHeaders(limiter) },
      )
    }

    const user = await getOrCreateUser()
    if (!user) throw new AppError("User not found", 404)

    const { resume_id, job_analysis_id, selected_evidence, options } = RewriteRequest.parse(
      await req.json(),
    )

    const resume = await getResumeById(resume_id, user.id)
    if (!resume) throw new AppError("Resume not found", 404)

    const analysis = await getJobAnalysisById(job_analysis_id, user.id)
    if (!analysis) throw new AppError("Job analysis not found", 404)

    const ids = selected_evidence.map((e) => e.evidence_id)
    if (ids.length > 50) throw new AppError("Too many evidence items (max 50)", 400)

    // 1) Try Qdrant by deterministic id `${userId}:${evidence_id}`
    const qMap = await getEvidenceTextsFromQdrant(user.id, ids)
    // 2) Fallback to parsed_sections
    const pMap = resume.parsed_sections ? getEvidenceTextsFromParsedSections(resume.parsed_sections, ids) : {}

    // Hydrate & validate all requested ids
    const texts: string[] = []
    const missing: string[] = []
    for (const eid of ids) {
      const text = qMap[eid] || pMap[eid]
      if (text && text.trim().length > 10) texts.push(text.trim())
      else missing.push(eid)
    }
    if (missing.length) {
      throw new AppError(
        `Unknown or unresolved evidence_id(s): ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`,
        422,
      )
    }

    // Safe arrays from analysis
    const reqSkills = Array.isArray((analysis as any).required_skills) ? (analysis as any).required_skills : []
    const prefSkills = Array.isArray((analysis as any).preferred_skills) ? (analysis as any).preferred_skills : []
    const keywords = Array.isArray((analysis as any).keywords)
      ? (analysis as any).keywords
      : Array.isArray((analysis as any).analysis_result?.keywords)
        ? (analysis as any).analysis_result.keywords
        : []
    const keyReqs = Array.isArray((analysis as any).analysis_result?.key_requirements)
      ? (analysis as any).analysis_result.key_requirements
      : []

    const prompt = `You are an expert resume writer. Rewrite ONLY using the supplied evidence facts. Do not invent claims.

JOB ANALYSIS CONTEXT:
Title: ${analysis.job_title}
Company: ${analysis.company_name || ""}
Required Skills: ${reqSkills.join(", ")}
Preferred Skills: ${prefSkills.join(", ")}
Keywords: ${keywords.join(", ")}
Experience Level: ${analysis.experience_level || (analysis as any).analysis_result?.experience_level || ""}
Key Requirements: ${keyReqs.join(", ")}

OPTIONS:
Tone: ${(options?.tone || "neutral").toUpperCase()}
Length: ${(options?.length || "standard").toUpperCase()}

EVIDENCE FACTS (verbatim; must not be altered beyond paraphrase):
${texts.map((t, i) => `- (${i + 1}) ${t}`).join("\n")}

INSTRUCTIONS:
1) Use only the evidence facts to craft an optimized resume tailored to the job.
2) Do not add any claim that cannot be linked to a provided evidence fact.
3) Prefer clear, impact-focused bullets; maintain ATS-friendly structure.
4) Provide structured output per schema (content + summaries + before/after scores).`

    const { object } = await withRetry(
      async () =>
        generateObject({
          model: openai("gpt-4o"),
          schema: optimizationSchema,
          prompt,
        }),
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

    // Compute accurate match score using dedicated AI scoring function
    let matchScore = (object as any).match_score_after // Fallback to inline estimate
    try {
      const scoreResult = await computeScoreWithAI(
        analysis as any,
        [], // No vector evidence for scoring, use rewritten content
        (object as any).optimized_content
      )
      matchScore = scoreResult.overall
      console.log(`[rewrite] AI Score computed: ${matchScore} (confidence: ${scoreResult.confidence}, method: ${scoreResult.scoringMethod})`)
    } catch (scoreError) {
      console.warn('[rewrite] AI scoring failed, using inline estimate:', scoreError)
    }

    const optimized = await createOptimizedResume({
      user_id: resume.user_id,
      original_resume_id: resume_id,
      job_analysis_id,
      title: `${resume.title} - Evidence Rewrite for ${analysis.job_title}`,
      optimized_content: (object as any).optimized_content,
      optimization_summary: object as any,
      match_score: matchScore,
    })

    return NextResponse.json({ optimized_resume: optimized }, { headers: getRateLimitHeaders(limiter) })
  } catch (err) {
    const e = handleApiError(err)
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode })
  }
}
