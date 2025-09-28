import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { getOrCreateUser } from "@/lib/db"
import { AppError, handleApiError, withRetry } from "@/lib/error-handler"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { buildEvidenceId, getPointsByIds } from "@/lib/qdrant"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"

export const runtime = "nodejs"

const RephraseRequest = z.object({
  evidence_id: z.string(),
  target_keywords: z.array(z.string()).optional(),
  style: z.enum(["concise", "impactful", "executive"]).default("concise"),
})

const RephraseResponseSchema = z.object({
  text: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResult = rateLimit(`rephrase:${userId}`, 10, 300000)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before rephrasing another bullet.",
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

    const parsed = RephraseRequest.safeParse(await req.json())
    if (!parsed.success) {
      throw new AppError("Invalid request payload", 400, "INVALID_BODY")
    }

    const { evidence_id, target_keywords, style } = parsed.data
    const [point] = await getPointsByIds([buildEvidenceId(user.id, evidence_id)])

    if (!point || !point.payload) {
      throw new AppError("Evidence not found", 404)
    }

    const payload = point.payload as Record<string, any>
    const bulletText = typeof payload.text === "string" ? payload.text : payload.content
    if (!bulletText) {
      throw new AppError("Evidence is missing text content", 400)
    }

    const keywordsList = (target_keywords || []).filter((keyword) => keyword.trim().length > 0)

    const rephrased = await withRetry(
      async () => {
        const { object } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: RephraseResponseSchema,
          prompt: buildRephrasePrompt({
            original: bulletText,
            keywords: keywordsList,
            style,
          }),
        })
        return object
      },
      3,
      1000,
    )

    return NextResponse.json({ text: rephrased.text }, { headers: getRateLimitHeaders(rateLimitResult) })
  } catch (error) {
    const e = handleApiError(error)
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode })
  }
}

function buildRephrasePrompt(params: { original: string; keywords: string[]; style: string }) {
  const { original, keywords, style } = params
  const keywordLine = keywords.length ? `
Target keywords: ${keywords.join(", ")}
` : ""

  return `You are rewriting a resume bullet. Preserve every factual detail from the original text while improving clarity.

Original bullet:
"""
${original}
"""
${keywordLine}
Style guide: ${style} tone, ATS-friendly, 1 sentence max.

Requirements:
- Do not add new accomplishments or metrics.
- Incorporate target keywords naturally only when they fit without fabricating facts.
- Keep the bullet action-oriented.
- Return only the rewritten sentence.`
}
