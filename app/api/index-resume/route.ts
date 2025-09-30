/**
 * POST /api/index-resume
 * Index resume evidence items into Qdrant vector database
 *
 * Features:
 * - Retrieves resume from database
 * - Generates embeddings for evidence items
 * - Upserts to Qdrant with proper ID prefixing
 * - Rate limiting
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { embedTexts } from "@/lib/embeddings"
import { upsertPoints, ensureCollection } from "@/lib/qdrant"
import { checkRateLimit, indexRateLimit, getRateLimitHeaders } from "@/lib/ratelimit"
import type { EvidenceItem } from "@/lib/schemas"

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
    const { resumeId } = body

    if (!resumeId) {
      return NextResponse.json({ error: "resumeId is required" }, { status: 400 })
    }

    // Fetch resume from database
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId,
        deletedAt: null,
      },
    })

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    // Extract evidence items
    const parsedSections = resume.parsedSections as any
    const evidences: EvidenceItem[] = parsedSections?.evidences || []

    if (evidences.length === 0) {
      return NextResponse.json({ error: "No evidence items to index" }, { status: 400 })
    }

    // Ensure Qdrant collection exists
    try {
      await ensureCollection()
    } catch (error: any) {
      console.error("[IndexResume] Failed to ensure collection:", { error: error.message })
      return NextResponse.json({ error: "Vector database unavailable" }, { status: 503 })
    }

    // Generate embeddings for all evidence texts
    const texts = evidences.map(e => e.text)
    let embeddings: number[][]

    try {
      embeddings = await embedTexts(texts)
    } catch (error: any) {
      console.error("[IndexResume] Embedding generation failed:", { error: error.message })
      return NextResponse.json({ error: "Failed to generate embeddings" }, { status: 500 })
    }

    // Prepare points for upsert with prefixed IDs
    const timestamp = Date.now()
    const points = evidences.map((evidence, index) => ({
      id: evidence.evidence_id || `${userId}_${timestamp}_${index}`,
      vector: embeddings[index],
      payload: {
        userId,
        resumeId,
        section: evidence.section,
        text: evidence.text,
        keywords: evidence.keywords,
        category: evidence.category,
        indexedAt: new Date().toISOString(),
      },
    }))

    // Upsert to Qdrant
    try {
      await upsertPoints(points)
    } catch (error: any) {
      console.error("[IndexResume] Qdrant upsert failed:", { error: error.message })
      return NextResponse.json({ error: "Failed to index evidence" }, { status: 500 })
    }

    // Update resume processing status
    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        processingStatus: "completed",
        extractedAt: new Date(),
      },
    })

    console.info("[IndexResume] Evidence indexed successfully:", {
      userId: userId.substring(0, 8),
      resumeId: resumeId.substring(0, 8),
      evidenceCount: evidences.length,
    })

    return NextResponse.json(
      {
        success: true,
        resumeId,
        evidenceCount: evidences.length,
        indexed: points.length,
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error: any) {
    console.error("[IndexResume] Unexpected error:", {
      error: error.message,
      stack: error.stack?.split("\n")[0],
    })

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}