import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, sql } from "@/lib/db"

/**
 * POST /api/jobs/bulk-delete
 * Deletes multiple jobs by their IDs (soft delete)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const { jobIds } = body

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: "Invalid job IDs" }, { status: 400 })
    }

    // Hard delete jobs
    const result = await sql`
      DELETE FROM job_analysis
      WHERE id = ANY(${jobIds}::uuid[])
        AND user_id = ${user.id}
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      deletedCount: result.length
    })
  } catch (error) {
    console.error("Error deleting jobs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
