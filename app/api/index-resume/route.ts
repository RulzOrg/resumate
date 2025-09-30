/**
 * POST /api/index-resume
 * Index resume evidence items into Qdrant vector database
 *
 * Features:
 * - Retrieves resume from database
 * - Generates embeddings for evidence items
 * - Upserts to Qdrant with proper ID prefixing
 * - Rate limiting
 * - Idempotency checks (prevents re-indexing)
 * - State consistency management between Qdrant and PostgreSQL
 *
 * State Transitions:
 * pending → processing → completed ✓
 *                     → failed    ✗
 *
 * Edge Cases Handled:
 * 1. Idempotency: Returns success if already indexed
 * 2. Qdrant failure: Marks resume as "failed" with error message
 * 3. DB update failure after Qdrant success: Returns PARTIAL_SUCCESS error
 *    to alert client of inconsistent state
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { embedTexts } from "@/lib/embeddings"
import { upsertPoints } from "@/lib/qdrant"
import { checkRateLimit, indexRateLimit, getRateLimitHeaders } from "@/lib/ratelimit"
import type { EvidenceItem } from "@/lib/schemas"

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const uid = userId as string

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

    // Check if already indexed (idempotency)
    if (resume.processingStatus === "completed" && resume.extractedAt) {
      console.info("[IndexResume] Resume already indexed:", {
        userId: uid.substring(0, 8),
        resumeId: resumeId.substring(0, 8),
      })
      return NextResponse.json(
        {
          success: true,
          resumeId,
          alreadyIndexed: true,
          extractedAt: resume.extractedAt,
        },
        { headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Resolve evidences from parsedSections
    const parsed: any = (resume as any).parsedSections || {}
    const evidences: EvidenceItem[] = Array.isArray(parsed.evidences) ? (parsed.evidences as EvidenceItem[]) : []
    if (!evidences.length) {
      return NextResponse.json(
        { error: "No evidences found to index for this resume" },
        { status: 400 }
      )
    }

    // Generate embeddings for all evidence texts
    const texts = evidences.map((e: EvidenceItem) => e.text)
    let embeddings: number[][]

    try {
      embeddings = await embedTexts(texts)
    } catch (error: any) {
      console.error("[IndexResume] Embedding generation failed:", { error: error.message })
      return NextResponse.json({ error: "Failed to generate embeddings" }, { status: 500 })
    }

    // Prepare points for upsert with prefixed IDs
    const timestamp = Date.now()
    const points = evidences.map((evidence: EvidenceItem, index: number) => ({
      id: evidence.evidence_id || `${uid}_${timestamp}_${index}`,
      vector: embeddings[index],
      payload: {
        userId: uid,
        resumeId,
        section: evidence.section,
        text: evidence.text,
        keywords: evidence.keywords,
        category: evidence.category,
        indexedAt: new Date().toISOString(),
      },
    }))

    // Mark as processing before Qdrant upsert
    try {
      await prisma.resume.update({
        where: { id: resumeId },
        data: {
          processingStatus: "processing",
        },
      })
    } catch (error: any) {
      console.error("[IndexResume] Failed to update status to processing:", {
        resumeId: resumeId.substring(0, 8),
        error: error.message,
      })
      // Continue anyway - not critical
    }

    // Upsert to Qdrant
    try {
      await upsertPoints(points)
    } catch (error: any) {
      console.error("[IndexResume] Qdrant upsert failed:", { error: error.message })

      // Mark as failed in database
      try {
        await prisma.resume.update({
          where: { id: resumeId },
          data: {
            processingStatus: "failed",
            processingError: `Qdrant indexing failed: ${error.message}`,
          },
        })
      } catch (dbError: any) {
        console.error("[IndexResume] Failed to update error status:", { error: dbError.message })
      }

      return NextResponse.json({ error: "Failed to index evidence" }, { status: 500 })
    }

    // Update resume processing status to completed
    // CRITICAL: If this fails, vectors are indexed but status won't reflect it
    try {
      await prisma.resume.update({
        where: { id: resumeId },
        data: {
          processingStatus: "completed",
          extractedAt: new Date(),
        },
      })
    } catch (error: any) {
      console.error("[IndexResume] CRITICAL: Vectors indexed but failed to update resume status:", {
        resumeId: resumeId.substring(0, 8),
        error: error.message,
      })
      // This is a partial success - vectors are indexed but status is inconsistent
      // Return an error so client knows to retry or alert
      return NextResponse.json(
        {
          error: "Indexed to Qdrant but failed to update database status",
          code: "PARTIAL_SUCCESS",
          resumeId,
        },
        { status: 500 }
      )
    }

    console.info("[IndexResume] Evidence indexed successfully:", {
      userId: uid.substring(0, 8),
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