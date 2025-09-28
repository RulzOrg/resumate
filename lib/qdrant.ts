import { QdrantClient } from "@qdrant/js-client-rest"
import { EMBEDDING_DIMENSIONS } from "./embeddings"

export const DEFAULT_QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "resume_bullets"
export const EMBEDDING_DIMENSION = EMBEDDING_DIMENSIONS

const QDRANT_COLLECTION = "resume_bullets"

let client: QdrantClient | null = null

function getClient() {
  if (client) return client

  const url = process.env.QDRANT_URL || "http://127.0.0.1:6333"
  const apiKey = process.env.QDRANT_API_KEY

  client = new QdrantClient({ url, apiKey })
  return client
}

export function getQdrantClient() {
  return getClient()
}

export async function ensureCollection() {
  const client = getClient()

  await client.ensureCollection(QDRANT_COLLECTION, {
    vectors: {
      size: EMBEDDING_DIMENSIONS,
      distance: "Cosine",
    },
  })
}

export async function upsertEvidence(points: {
  id: string
  vector: number[]
  payload: Record<string, any>
}[]) {
  if (!points.length) return

  const client = getClient()
  await ensureCollection()

  await client.upsert(QDRANT_COLLECTION, {
    wait: true,
    points: points.map((point) => ({
      id: point.id,
      vector: point.vector,
      payload: point.payload,
    })),
  })
}

export async function searchVectors(params: {
  vector: number[]
  limit: number
  userId: string
}) {
  const client = getClient()
  await ensureCollection()

  const result = await client.search(QDRANT_COLLECTION, {
    vector: params.vector,
    limit: params.limit,
    filter: {
      must: [
        {
          key: "userId",
          match: {
            value: params.userId,
          },
        },
      ],
    },
    with_payload: true,
    with_vector: false,
  })

  return result
}

export async function getPointsByIds(ids: string[]) {
  if (!ids.length) return []

  const client = getClient()
  await ensureCollection()

  const result = await client.retrieve(QDRANT_COLLECTION, {
    ids,
    with_payload: true,
  })

  return result
}

export function buildEvidenceId(userId: string, evidenceId: string) {
  return `${userId}:${evidenceId}`
}

export function parseEvidenceId(id: string) {
  if (!id.includes(":")) {
    return { userId: "", evidenceId: id }
  }

  const [userId, evidenceId] = id.split(":", 2)
  return { userId, evidenceId }
}
