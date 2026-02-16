import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 30

const client = new Anthropic()
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimitResult = await rateLimit(`improve-bullet:${userId}`, 20, 60000)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before trying again.", retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  const { bullet, company, title, jobTitle, companyName } = await request.json()

  if (!bullet || typeof bullet !== "string" || bullet.trim().length === 0) {
    return NextResponse.json({ error: "Bullet text is required" }, { status: 400 })
  }

  const contextLines = [
    company && `Company: ${company}`,
    title && `Role: ${title}`,
    jobTitle && `Target job: ${jobTitle}`,
    companyName && `Target company: ${companyName}`,
  ].filter(Boolean).join("\n")

  const stream = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 200,
    stream: true,
    messages: [
      {
        role: "user",
        content: `You are a professional resume writer. Improve the following resume bullet point to be more impactful and ATS-friendly.

Rules:
- Start with a strong action verb (Led, Delivered, Architected, Spearheaded, etc.)
- Include quantified results and metrics where possible (%, $, time saved, team size)
- Use the STAR method: Situation/Task → Action → Result
- Keep it concise — one to two lines maximum
- Match the tone and terminology relevant to the target role
- Do NOT add bullet markers, dashes, or prefixes — return only the improved text
- Return ONLY the improved bullet text, nothing else

${contextLines ? `Context:\n${contextLines}\n` : ""}Original bullet:
${bullet.trim()}

Improved bullet:`,
      },
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
