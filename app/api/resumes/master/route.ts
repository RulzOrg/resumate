import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser } from "@/lib/db"
import { sql } from "@/lib/db"

/**
 * GET /api/resumes/master
 * Fetches only master resumes with enhanced metadata
 * Includes optimization history, word count, and usage stats
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get master resumes with enhanced metadata
    const resumes = await sql`
      SELECT 
        r.*,
        (
          SELECT COUNT(*)::int
          FROM optimized_resumes
          WHERE original_resume_id = r.id
        ) as optimization_count,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'job_title', opt.job_title,
                'company_name', opt.company_name,
                'created_at', opt.created_at,
                'match_score', opt.match_score
              ) ORDER BY opt.created_at DESC
            ),
            '[]'::json
          )
          FROM (
            SELECT ja.job_title, ja.company_name, or_res.created_at, or_res.match_score
            FROM optimized_resumes or_res
            JOIN job_analysis ja ON or_res.job_analysis_id = ja.id
            WHERE or_res.original_resume_id = r.id
            ORDER BY or_res.created_at DESC
            LIMIT 3
          ) opt
        ) as recent_optimizations
      FROM resumes r
      WHERE r.user_id = ${user.id}
        AND r.kind IN ('master', 'uploaded', 'duplicate')
        AND r.deleted_at IS NULL
      ORDER BY r.is_primary DESC, r.updated_at DESC
    `

    return NextResponse.json({ resumes })
  } catch (error) {
    console.error("Error fetching master resumes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
