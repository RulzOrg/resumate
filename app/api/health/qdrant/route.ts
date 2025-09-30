import { NextResponse } from "next/server"
import { qdrant, QDRANT_URL, QDRANT_COLLECTION } from "@/lib/qdrant"

export const runtime = "nodejs"

export async function GET() {
  try {
    const start = Date.now()
    
    // Try to get collections to verify connection
    const collections = await qdrant.getCollections()
    const duration = Date.now() - start
    
    const collectionExists = collections.collections?.some(
      (c: any) => c.name === QDRANT_COLLECTION
    )
    
    return NextResponse.json({
      status: "healthy",
      url: QDRANT_URL,
      collection: QDRANT_COLLECTION,
      collectionExists,
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Qdrant health check failed:", error)
    
    return NextResponse.json(
      {
        status: "unhealthy",
        url: QDRANT_URL,
        collection: QDRANT_COLLECTION,
        error: error.message || "Connection failed",
        code: error.code,
        timestamp: new Date().toISOString(),
        help: "Ensure QDRANT_URL and QDRANT_API_KEY environment variables are set correctly.",
      },
      { status: 503 }
    )
  }
}
