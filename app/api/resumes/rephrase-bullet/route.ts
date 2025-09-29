import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { AppError, handleApiError, withRetry } from "@/lib/error-handler"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { getOrCreateUser, getUserResumes } from "@/lib/db"
import { qdrant, QDRANT_COLLECTION } from "@/lib/qdrant"

export const runtime = "nodejs"

const RephraseRequest = z.object({
  evidence_id: z.string(),
  target_keywords: z.array(z.string()).optional(),
  style: z.enum(["concise", "impactful", "executive"]).default("concise"),
})

function extractFromParsedSections(parsed: any, evidenceId: string): string | null {
  let found: string | null = null
  const visit = (node: any) => {
    if (!node || typeof node !== "object" || found) return
    if (node.evidence_id && String(node.evidence_id) === String(evidenceId)) {
      const t = node.text || node.content || node.title
      if (t && String(t).trim().length > 0) {
        found = String(t)
        return
      }
    }
    for (const k of Object.keys(node)) {
      const v = (node as any)[k]
      if (Array.isArray(v)) v.forEach(visit)
      else if (v && typeof v === "object") visit(v)
    }
  }
  visit(parsed)
  return found
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const limiter = rateLimit(`rephrase:${userId}`, 10, 300000)
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before retrying.", retryAfter: limiter.retryAfter },
        { status: 429, headers: getRateLimitHeaders(limiter) },
      )
    }

    const user = await getOrCreateUser()
    if (!user) throw new AppError("User not found", 404)

    const { evidence_id, target_keywords, style } = RephraseRequest.parse(await req.json())

    // 1) Try Qdrant by deterministic id `${user.id}:${evidence_id}`
    let sourceText = ""
    try {
      const results = await qdrant.retrieve(QDRANT_COLLECTION, {
        ids: [`${user.id}:${evidence_id}`],
        with_payload: true,
        with_vector: false,
      })
      const p = results?.[0]
      const payload: any = p?.payload || {}
      if (payload.userId && String(payload.userId) !== String(user.id)) {
        throw new AppError("Evidence not found", 404)
      }
      sourceText = payload.text || payload.content || payload.body || ""
    } catch {
      // ignore and try fallback
    }

    // 2) Fallback: scan parsed_sections across user's resumes
    if (!sourceText) {
      const resumes = await getUserResumes(user.id).catch(() => [])
      for (const r of resumes) {
        if (!r?.parsed_sections) continue
        const hit = extractFromParsedSections(r.parsed_sections, evidence_id)
        if (hit) {
          sourceText = hit
          break
        }
      }
    }

    if (!sourceText || sourceText.trim().length < 5) {
      throw new AppError("Evidence not found", 404)
    }

    const styleInstr =
      style === "concise"
        ? "short and direct"
        : style === "impactful"
          ? "impact-focused with measurable results"
          : "executive tone (senior, outcome-oriented)"

    const prompt = `Paraphrase the following resume bullet while strictly preserving factual content.\n\nSTYLE: ${styleInstr}\nTARGET KEYWORDS: ${(target_keywords || []).join(", ") || "(none)"}\n\nSOURCE BULLET:\n${sourceText}\n\nRULES:\n- Do NOT add any claims not present in the source.\n- Only include target keywords if they fit naturally and remain truthful.\n- Output a single bullet line only.\n\nOUTPUT: one bullet line (no extra text).`

    const { text } = await withRetry(
      async () => generateText({ model: openai("gpt-4o-mini"), prompt }),
      3,
      2000,
    )

    const cleaned = (text || "").trim().replace(/^[-•\s]+/, "")
    return NextResponse.json({ text: cleaned }, { headers: getRateLimitHeaders(limiter) })
  } catch (err) {
    const e = handleApiError(err)
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode })
  }
}
