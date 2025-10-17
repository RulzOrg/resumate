import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { cleanupDuplicateJobAnalyses, sql, getUserById } from "@/lib/db"
import { handleApiError, AppError } from "@/lib/error-handler"

const ADMIN_USER_IDS = new Set(
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
)

// UUID validation function
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Endpoint to cleanup duplicate job analyses (admins can target any user, others can only cleanup their own data)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = ADMIN_USER_IDS.has(userId)
    const { target_user_id } = await request.json()

    // Determine which user to cleanup based on admin privileges
    let userToCleanup: string
    
    if (target_user_id) {
      // Only admins can specify a target_user_id different from their own
      if (!isAdmin) {
        return NextResponse.json({ 
          error: "Forbidden: Only administrators can perform cleanup operations on other users" 
        }, { status: 403 })
      }
      
      // Validate target_user_id format
      if (!isValidUUID(target_user_id)) {
        return NextResponse.json({ 
          error: "Invalid user ID format. Expected UUID format." 
        }, { status: 400 })
      }
      
      // Verify the user exists in the database
      const targetUser = await getUserById(target_user_id)
      if (!targetUser) {
        return NextResponse.json({ 
          error: "User not found" 
        }, { status: 404 })
      }
      
      userToCleanup = target_user_id
    } else {
      // Non-admin users can only cleanup their own data
      userToCleanup = userId
    }

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
