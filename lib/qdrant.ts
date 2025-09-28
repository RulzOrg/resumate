import { QdrantClient } from "@qdrant/js-client-rest"

export const DEFAULT_QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "resume_bullets"
export const EMBEDDING_DIMENSION = 3072

let client: QdrantClient | null = null

export function getQdrantClient() {
  if (client) return client

  const url = process.env.QDRANT_URL || "http://localhost:6333"
  const apiKey = process.env.QDRANT_API_KEY

  client = new QdrantClient({
    url,
    apiKey: apiKey || undefined,
  })

  return client
}
