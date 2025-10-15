import { QdrantClient } from "@qdrant/js-client-rest"

export const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333"
export const QDRANT_API_KEY = process.env.QDRANT_API_KEY
export const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "resume_bullets"
export const EMBEDDING_DIMENSION = 3072

export const qdrant = new QdrantClient({ 
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
})

export async function ensureCollection() {
  try {
    const list = await qdrant.getCollections()
    const exists = list.collections?.some((c: any) => c.name === QDRANT_COLLECTION)
    if (!exists) {
      try {
        await qdrant.createCollection(QDRANT_COLLECTION, {
          vectors: { size: EMBEDDING_DIMENSION, distance: "Cosine" },
        } as any)
      } catch (error: any) {
        const status = (error && (error.status ?? error.response?.status)) ?? undefined
        if (status === 409) {
          // Another worker created the collection concurrently; ignore
        } else {
          throw error
        }
      }
    }

    // Ensure userId index exists for filtering
    try {
      await qdrant.createPayloadIndex(QDRANT_COLLECTION, {
        field_name: "userId",
        field_schema: "keyword",
      } as any)
    } catch (error: any) {
      const status = (error && (error.status ?? error.response?.status)) ?? undefined
      // 409 means index already exists, which is fine
      if (status !== 409) {
        console.warn("Failed to create userId index:", error.message || error)
        // Don't throw - index might already exist or be in progress
      }
    }

    // Ensure resume_id index exists for filtering
    try {
      await qdrant.createPayloadIndex(QDRANT_COLLECTION, {
        field_name: "resume_id",
        field_schema: "keyword",
      } as any)
    } catch (error: any) {
      const status = (error && (error.status ?? error.response?.status)) ?? undefined
      if (status !== 409) {
        console.warn("Failed to create resume_id index:", error.message || error)
      }
    }

    // Ensure evidence_id index exists for filtering
    try {
      await qdrant.createPayloadIndex(QDRANT_COLLECTION, {
        field_name: "evidence_id",
        field_schema: "keyword",
      } as any)
    } catch (error: any) {
      const status = (error && (error.status ?? error.response?.status)) ?? undefined
      if (status !== 409) {
        console.warn("Failed to create evidence_id index:", error.message || error)
      }
    }
  } catch (err) {
    // If list fails (server down), rethrow so callers can handle 503s
    throw err
  }
}

export type UpsertPoint = {
  id: string | number
  vector: number[]
  payload: Record<string, any>
}

export async function upsertPoints(points: UpsertPoint[]) {
  if (!points.length) return
  await ensureCollection()
  await qdrant.upsert(QDRANT_COLLECTION, {
    wait: true,
    points: points.map((p) => ({ id: p.id, vector: p.vector, payload: p.payload })),
  })
}

export async function deletePoints(filter: Record<string, any>) {
  // Validate filter is a non-empty object
  if (!filter || typeof filter !== 'object' || Object.keys(filter).length === 0) {
    throw new Error('deletePoints: filter must be a non-empty object')
  }

  const filterKey = Object.keys(filter)[0]
  const filterValue = Object.values(filter)[0]

  // Validate the first key and value are defined
  if (filterKey === undefined || filterValue === undefined) {
    throw new Error('deletePoints: filter key and value must be defined')
  }

  await ensureCollection()
  await qdrant.delete(QDRANT_COLLECTION, {
    wait: true,
    filter: {
      must: [
        {
          key: filterKey,
          match: { value: filterValue }
        }
      ]
    }
  })
}
