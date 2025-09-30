/**
 * POST /api/index-raw
 * Index raw paragraphs into Qdrant (fallback indexing)
 *
 * Features:
 * - Accepts raw paragraph text
 * - Generates embeddings
 * - Upserts to Qdrant with proper ID prefixing
 * - Rate limiting
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { embedTexts } from "@/lib/embeddings"
import { upsertPoints, ensureCollection } from "@/lib/qdrant"
import { checkRateLimit, indexRateLimit, getRateLimitHeaders } from "@/lib/ratelimit"

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(indexRateLimit, userId)
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
    const { resumeId, paragraphs } = body

    if (!resumeId) {
      return NextResponse.json({ error: "resumeId is required" }, { status: 400 })
    }

    if (!paragraphs || !Array.isArray(paragraphs) || paragraphs.length === 0) {
      return NextResponse.json({ error: "paragraphs array is required and must not be empty" }, { status: 400 })
    }

    // Validate paragraph length
    const validParagraphs = paragraphs.filter((p: string) => typeof p === "string" && p.length >= 20)

    if (validParagraphs.length === 0) {
      return NextResponse.json({ error: "No valid paragraphs (min 20 chars each)" }, { status: 400 })
    }

    // Ensure Qdrant collection exists
    try {
      await ensureCollection()
    } catch (error: any) {
      console.error("[IndexRaw] Failed to ensure collection:", { error: error.message })
      return NextResponse.json({ error: "Vector database unavailable" }, { status: 503 })
    }

    // Generate embeddings for all paragraphs
    let embeddings: number[][]

    try {
      embeddings = await embedTexts(validParagraphs)
    } catch (error: any) {
      console.error("[IndexRaw] Embedding generation failed:", { error: error.message })
      return NextResponse.json({ error: "Failed to generate embeddings" }, { status: 500 })
    }

    // Prepare points for upsert with prefixed IDs
    const timestamp = Date.now()
    const points = validParagraphs.map((paragraph: string, index: number) => ({
      id: `${userId}_${timestamp}_raw_${index}`,
      vector: embeddings[index],
      payload: {
        userId,
        resumeId,
        text: paragraph,
        type: "raw_paragraph",
        indexedAt: new Date().toISOString(),
      },
    }))

    // Upsert to Qdrant
    try {
      await upsertPoints(points)
    } catch (error: any) {
      console.error("[IndexRaw] Qdrant upsert failed:", { error: error.message })
      return NextResponse.json({ error: "Failed to index paragraphs" }, { status: 500 })
    }

    console.info("[IndexRaw] Raw paragraphs indexed successfully:", {
      userId: userId.substring(0, 8),
      resumeId: resumeId.substring(0, 8),
      paragraphCount: validParagraphs.length,
    })

    return NextResponse.json(
      {
        success: true,
        resumeId,
        paragraphCount: validParagraphs.length,
        indexed: points.length,
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error: any) {
    console.error("[IndexRaw] Unexpected error:", {
      error: error.message,
      stack: error.stack?.split("\n")[0],
    })

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}