import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"

import { AppError, handleApiError, withRetry } from "@/lib/error-handler"
import { getOrCreateUser, getResumeById } from "@/lib/db"
import { DEFAULT_QDRANT_COLLECTION, EMBEDDING_DIMENSION, getQdrantClient } from "@/lib/qdrant"
import { embedText, getEmbeddingDimension } from "@/lib/embeddings"

export const runtime = "nodejs"

const requestSchema = z.object({
  resume_id: z.string(),
  bullets: z.array(
    z.object({
      evidence_id: z.string(),
      text: z.string().min(1),
      section: z.string().optional(),
      company: z.string().optional(),
      title: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      seniority: z.string().optional(),
      domain: z.string().optional(),
      skills: z.array(z.string()).optional(),
      responsibilities: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
    }),
  ),
})

const COLLECTION_NAME = DEFAULT_QDRANT_COLLECTION

async function ensureCollection() {
  const client = getQdrantClient()
  const collections = await client.getCollections()
  const exists = collections.collections?.some((c) => c.name === COLLECTION_NAME)

  if (!exists) {
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_DIMENSION,
        distance: "Cosine",
      },
      on_disk_payload: true,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("Unable to verify user account", 500)
    }

    const body = await request.json()
    const { resume_id, bullets } = requestSchema.parse(body)

    const resume = await getResumeById(resume_id, user.id)
    if (!resume) {
      throw new AppError("Resume not found", 404)
    }

    if (!bullets.length) {
      return NextResponse.json({ success: true, indexed: 0 })
    }

    await ensureCollection()

    const texts = bullets.map((bullet) => bullet.text)
    const embeddings = await embedText(texts)

    if (embeddings.some((embedding) => embedding.length !== getEmbeddingDimension())) {
      throw new AppError("Embedding dimension mismatch", 500, "EMBEDDING_DIMENSION_MISMATCH")
    }

    const client = getQdrantClient()

    await withRetry(
      () =>
        client.upsert(COLLECTION_NAME, {
          wait: true,
          points: bullets.map((bullet, index) => ({
            id: `${user.id}:${bullet.evidence_id}`,
            vector: embeddings[index],
            payload: {
              userId: user.id,
              resumeId: resume.id,
              evidenceId: bullet.evidence_id,
              text: bullet.text,
              section: bullet.section ?? null,
              company: bullet.company ?? null,
              title: bullet.title ?? null,
              start_date: bullet.start_date ?? null,
              end_date: bullet.end_date ?? null,
              seniority: bullet.seniority ?? null,
              domain: bullet.domain ?? null,
              skills: bullet.skills ?? [],
              responsibilities: bullet.responsibilities ?? [],
              keywords: bullet.keywords ?? [],
              indexed_at: new Date().toISOString(),
            },
          })),
        }),
      3,
      500,
    )

    return NextResponse.json({ success: true, indexed: bullets.length })
  } catch (error) {
    const err = handleApiError(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.statusCode })
  }
}
