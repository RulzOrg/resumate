import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, deleteJobAnalysis } from "@/lib/db"
import { handleApiError, AppError } from "@/lib/error-handler"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError("Job analysis IDs array is required", 400)
    }

    console.log(`[Bulk Delete] Attempting to delete ${ids.length} job analyses for user ${userId}`)

    const user = await getOrCreateUser(userId)
    if (!user) {
      throw new AppError("Unable to verify user account", 500)
    }

    // Process deletions in batches to avoid overwhelming the database
    const batchSize = 50
    let totalDeleted = 0
    let totalFailed = 0

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map((id: string) => deleteJobAnalysis(id, user.id))
      )

      const batchDeleted = results.filter((r) => r.status === "fulfilled" && r.value).length
      const batchFailed = results.length - batchDeleted

      totalDeleted += batchDeleted
      totalFailed += batchFailed

      if (batchFailed > 0) {
        console.warn(`[Bulk Delete] Batch ${Math.floor(i / batchSize) + 1} had ${batchFailed} failures`)
      }
    }

    console.log(`[Bulk Delete] Completed: ${totalDeleted} deleted, ${totalFailed} failed out of ${ids.length} total`)

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      failed: totalFailed,
      total: ids.length,
    })
  } catch (error) {
    console.error("[Bulk Delete] Error:", error)
    const info = handleApiError(error)
    return NextResponse.json({ error: info.error, code: info.code }, { status: info.statusCode })
  }
}

