import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { cleanupDuplicateJobAnalyses, sql } from "@/lib/db"
import { handleApiError, AppError } from "@/lib/error-handler"

// Admin-only endpoint to cleanup duplicate job analyses
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // TODO: Add proper admin check if needed
    // For now, any authenticated user can run cleanup on their own data
    // Or implement an admin list from environment variables

    const { target_user_id } = await request.json()

    // If target_user_id is provided, only cleanup that user's duplicates (admin privilege)
    // Otherwise cleanup the requesting user's duplicates
    const userToCleanup = target_user_id || userId

    console.log(`[Cleanup Endpoint] Starting duplicate cleanup for user: ${userToCleanup}`)

    const result = await cleanupDuplicateJobAnalyses(userToCleanup)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error, code: errorInfo.code }, { status: errorInfo.statusCode })
  }
}

// GET endpoint to check for duplicates without cleaning them up
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check for duplicates by querying the database
    const duplicateGroups = await sql`
      SELECT 
        user_id,
        LOWER(TRIM(job_title)) as normalized_title,
        LOWER(TRIM(COALESCE(company_name, ''))) as normalized_company,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY created_at) as all_ids,
        MIN(created_at) as oldest_date,
        MAX(created_at) as newest_date
      FROM job_analysis
      WHERE user_id = ${userId}
      GROUP BY user_id, normalized_title, normalized_company
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `

    return NextResponse.json({
      duplicateGroupsFound: duplicateGroups.length,
      duplicates: duplicateGroups.map((group: any) => ({
        title: group.normalized_title,
        company: group.normalized_company,
        count: group.duplicate_count,
        ids: group.all_ids,
        oldestDate: group.oldest_date,
        newestDate: group.newest_date,
      }))
    }, { status: 200 })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error, code: errorInfo.code }, { status: errorInfo.statusCode })
  }
}
