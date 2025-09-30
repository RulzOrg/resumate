/**
 * POST /api/paragraph-to-bullet
 * Convert paragraph text to bullet points
 *
 * Features:
 * - Accepts paragraph text
 * - Uses LLM to convert to resume bullet points
 * - Rate limiting
 * - Returns improved bullets with suggestions
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { convertParagraphToBullets } from "@/lib/llm"
import { checkRateLimit, rewriteRateLimit, getRateLimitHeaders } from "@/lib/ratelimit"
import { ParagraphToBulletResponseSchema } from "@/lib/schemas"

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(rewriteRateLimit, userId)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error || "Rate limit exceeded" },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      )
    }

    // Parse request body
    const body = await request.json()
    const { paragraph } = body

    if (!paragraph || typeof paragraph !== "string") {
      return NextResponse.json({ error: "paragraph text is required" }, { status: 400 })
    }

    // Validate paragraph length
    if (paragraph.length < 20) {
      return NextResponse.json({ error: "Paragraph too short (minimum 20 characters)" }, { status: 400 })
    }

    if (paragraph.length > 5000) {
      return NextResponse.json({ error: "Paragraph too long (maximum 5000 characters)" }, { status: 400 })
    }

    // Convert to bullets using LLM
    let result

    try {
      result = await convertParagraphToBullets(paragraph, ParagraphToBulletResponseSchema)
    } catch (error: any) {
      console.error("[ParagraphToBullet] LLM conversion failed:", {
        error: error.message,
        userId: userId.substring(0, 8),
      })
      return NextResponse.json({ error: "Failed to convert paragraph to bullets" }, { status: 500 })
    }

    // Validate result
    if (!result.bullets || result.bullets.length === 0) {
      return NextResponse.json({ error: "No bullets generated" }, { status: 500 })
    }

    console.info("[ParagraphToBullet] Conversion successful:", {
      userId: userId.substring(0, 8),
      paragraphLength: paragraph.length,
      bulletCount: result.bullets.length,
      improved: result.improved,
    })

    return NextResponse.json(
      {
        bullets: result.bullets,
        improved: result.improved,
        suggestions: result.suggestions || [],
        original: paragraph,
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error: any) {
    console.error("[ParagraphToBullet] Unexpected error:", {
      error: error.message,
      stack: error.stack?.split("\n")[0],
    })

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}