import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAccess()

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "30"
    const periodDays = parseInt(period)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)
    startDate.setHours(0, 0, 0, 0)

    // Get daily signups
    const dailySignups = await sql<{ date: string; count: string }>`
      SELECT DATE(created_at)::text as date, COUNT(*)::text as count
      FROM users_sync
      WHERE created_at >= ${startDate.toISOString()} AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Get daily resume uploads
    const dailyResumes = await sql<{ date: string; count: string }>`
      SELECT DATE(created_at)::text as date, COUNT(*)::text as count
      FROM resumes
      WHERE created_at >= ${startDate.toISOString()} AND deleted_at IS NULL AND kind = 'uploaded'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Get daily optimizations
    const dailyOptimizations = await sql<{ date: string; count: string }>`
      SELECT DATE(created_at)::text as date, COUNT(*)::text as count
      FROM resumes
      WHERE created_at >= ${startDate.toISOString()} AND deleted_at IS NULL AND kind = 'generated'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Get daily job analyses
    const dailyJobAnalyses = await sql<{ date: string; count: string }>`
      SELECT DATE(created_at)::text as date, COUNT(*)::text as count
      FROM job_analysis
      WHERE created_at >= ${startDate.toISOString()} AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Get subscription distribution by plan
    const subscriptionsByPlan = await sql<{ subscription_plan: string; count: string }>`
      SELECT subscription_plan, COUNT(*)::text as count
      FROM users_sync WHERE deleted_at IS NULL
      GROUP BY subscription_plan
    `

    // Get subscription distribution by status
    const subscriptionsByStatus = await sql<{ subscription_status: string; count: string }>`
      SELECT subscription_status, COUNT(*)::text as count
      FROM users_sync WHERE deleted_at IS NULL
      GROUP BY subscription_status
    `

    // Get top users by activity
    const topUsers = await sql<{
      id: string
      email: string
      name: string
      subscription_plan: string
      resume_count: string
      job_analysis_count: string
    }>`
      SELECT u.id, u.email, u.name, u.subscription_plan,
        COALESCE(r.count, 0)::text as resume_count,
        COALESCE(j.count, 0)::text as job_analysis_count
      FROM users_sync u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as count FROM resumes WHERE deleted_at IS NULL GROUP BY user_id
      ) r ON u.id = r.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as count FROM job_analysis WHERE deleted_at IS NULL GROUP BY user_id
      ) j ON u.id = j.user_id
      WHERE u.deleted_at IS NULL
      ORDER BY COALESCE(r.count, 0) DESC
      LIMIT 10
    `

    // Get lead magnet performance
    const leadMagnetStats = await sql<{ date: string; total: string; converted: string }>`
      SELECT
        DATE(submitted_at)::text as date,
        COUNT(*)::text as total,
        COUNT(CASE WHEN converted_to_user = true THEN 1 END)::text as converted
      FROM lead_magnet_submissions
      WHERE submitted_at >= ${startDate.toISOString()}
      GROUP BY DATE(submitted_at)
      ORDER BY date ASC
    `

    return NextResponse.json({
      period: periodDays,
      signups: dailySignups.map(d => ({ date: d.date, count: parseInt(d.count) })),
      resumes: dailyResumes.map(d => ({ date: d.date, count: parseInt(d.count) })),
      optimizations: dailyOptimizations.map(d => ({ date: d.date, count: parseInt(d.count) })),
      jobAnalyses: dailyJobAnalyses.map(d => ({ date: d.date, count: parseInt(d.count) })),
      subscriptions: {
        byPlan: subscriptionsByPlan.map(item => ({
          plan: item.subscription_plan,
          count: parseInt(item.count),
        })),
        byStatus: subscriptionsByStatus.map(item => ({
          status: item.subscription_status,
          count: parseInt(item.count),
        })),
      },
      topUsers: topUsers.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.subscription_plan,
        resumes: parseInt(user.resume_count),
        jobAnalyses: parseInt(user.job_analysis_count),
      })),
      leadMagnets: leadMagnetStats.map(item => ({
        date: item.date,
        total: parseInt(item.total),
        converted: parseInt(item.converted),
      })),
    })
  } catch (error) {
    console.error("Admin analytics error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
