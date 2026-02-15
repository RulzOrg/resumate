import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { parseJobFromUrl } from "@/lib/job-parser"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimitResult = rateLimit(`parse-job:${userId}`, 10, 60000)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before trying again.", retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  let url: string
  try {
    const body = await request.json()
    url = body.url
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  // Validate URL format
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Only HTTP/HTTPS URLs are supported" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
  }

  try {
    const result = await parseJobFromUrl(url)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse job posting"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
