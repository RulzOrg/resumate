import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[AdminStats] Starting stats fetch...")
    await verifyAdminAccess()
    console.log("[AdminStats] Admin access verified")

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    console.log("[AdminStats] Executing database queries...")

    // Execute queries sequentially to identify which one is hanging
    console.log("[AdminStats] Query 1: Total users...")
    const totalUsersResult = await sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE deleted_at IS NULL`
    console.log("[AdminStats] Query 1 complete")

    console.log("[AdminStats] Query 2: New users this month...")
    const newUsersThisMonthResult = await sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE created_at >= ${startOfMonth.toISOString()} AND deleted_at IS NULL`
    console.log("[AdminStats] Query 2 complete")

    console.log("[AdminStats] Query 3: New users last month...")
    const newUsersLastMonthResult = await sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE created_at >= ${startOfLastMonth.toISOString()} AND created_at <= ${endOfLastMonth.toISOString()} AND deleted_at IS NULL`
    console.log("[AdminStats] Query 3 complete")

    console.log("[AdminStats] Query 4: Active users this week...")
    const activeUsersThisWeekResult = await sql<{ count: string }>`SELECT COUNT(DISTINCT user_id) as count FROM resumes WHERE updated_at >= ${startOfWeek.toISOString()} AND deleted_at IS NULL`
    console.log("[AdminStats] Query 4 complete")

    console.log("[AdminStats] Query 5: Total resumes...")
    const totalResumesResult = await sql<{ count: string }>`SELECT COUNT(*) as count FROM resumes WHERE deleted_at IS NULL`
    console.log("[AdminStats] Query 5 complete")

    console.log("[AdminStats] Query 6: Total optimizations...")
    const totalOptimizationsResult = await sql<{ count: string }>`SELECT COUNT(*) as count FROM resumes WHERE kind = 'generated' AND deleted_at IS NULL`
    console.log("[AdminStats] Query 6 complete")

    console.log("[AdminStats] Query 7: Pro subscriptions...")
    const proSubscriptionsResult = await sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE subscription_status = 'active' AND subscription_plan = 'pro' AND deleted_at IS NULL`
    console.log("[AdminStats] Query 7 complete")

    console.log("[AdminStats] Query 8: Free users...")
    const freeUsersResult = await sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE subscription_status = 'free' AND deleted_at IS NULL`
    console.log("[AdminStats] Query 8 complete")

    console.log("[AdminStats] Query 9: Trialing users...")
    const trialingUsersResult = await sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE subscription_status = 'trialing' AND deleted_at IS NULL`
    console.log("[AdminStats] Query 9 complete")

    console.log("[AdminStats] Query 10: Canceled users...")
    const canceledUsersResult = await sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE subscription_status = 'canceled' AND deleted_at IS NULL`
    console.log("[AdminStats] Query 10 complete")

    console.log("[AdminStats] Query 11: Pending subscriptions...")
    const pendingSubscriptionsResult = await sql<{ count: string }>`SELECT COUNT(*) as count FROM pending_polar_subscriptions WHERE linked_user_id IS NULL`
    console.log("[AdminStats] Query 11 complete")

    console.log("[AdminStats] Query 12: Resumes by status...")
    const resumesByStatusResult = await sql<{ processing_status: string; count: string }>`SELECT processing_status, COUNT(*) as count FROM resumes WHERE deleted_at IS NULL GROUP BY processing_status`
    console.log("[AdminStats] Query 12 complete")

    console.log("[AdminStats] Query 13: Recent signups...")
    const recentSignups = await sql<{ id: string; email: string; name: string; subscription_status: string; subscription_plan: string; created_at: string }>`
      SELECT id, email, name, subscription_status, subscription_plan, created_at
      FROM users_sync
      WHERE created_at >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()} AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 10
    `
    console.log("[AdminStats] Query 13 complete")

    console.log("[AdminStats] Database queries completed successfully")

    const totalUsers = parseInt(totalUsersResult[0]?.count || "0")
    const newUsersThisMonth = parseInt(newUsersThisMonthResult[0]?.count || "0")
    const newUsersLastMonth = parseInt(newUsersLastMonthResult[0]?.count || "0")
    const activeUsersThisWeek = parseInt(activeUsersThisWeekResult[0]?.count || "0")
    const totalResumes = parseInt(totalResumesResult[0]?.count || "0")
    const totalOptimizations = parseInt(totalOptimizationsResult[0]?.count || "0")
    const proSubscriptions = parseInt(proSubscriptionsResult[0]?.count || "0")
    const freeUsers = parseInt(freeUsersResult[0]?.count || "0")
    const trialingUsers = parseInt(trialingUsersResult[0]?.count || "0")
    const canceledUsers = parseInt(canceledUsersResult[0]?.count || "0")
    const pendingSubscriptions = parseInt(pendingSubscriptionsResult[0]?.count || "0")

    // Lead magnet data - set to 0 since table doesn't exist yet
    const leadMagnetSubmissions = 0
    const leadMagnetConversions = 0

    const userGrowthRate = newUsersLastMonth > 0
      ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
      : newUsersThisMonth > 0 ? 100 : 0

    const conversionRate = leadMagnetSubmissions > 0
      ? Math.round((leadMagnetConversions / leadMagnetSubmissions) * 100)
      : 0

    const resumeStatusMap: Record<string, number> = {}
    for (const row of resumesByStatusResult) {
      resumeStatusMap[row.processing_status] = parseInt(row.count)
    }

    console.log("[AdminStats] Data processed, returning response")
    const response = {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        newLastMonth: newUsersLastMonth,
        growthRate: userGrowthRate,
        activeThisWeek: activeUsersThisWeek,
      },
      subscriptions: {
        pro: proSubscriptions,
        free: freeUsers,
        trialing: trialingUsers,
        canceled: canceledUsers,
        pending: pendingSubscriptions,
      },
      resumes: {
        total: totalResumes,
        optimizations: totalOptimizations,
        byStatus: {
          pending: resumeStatusMap.pending || 0,
          processing: resumeStatusMap.processing || 0,
          completed: resumeStatusMap.completed || 0,
          failed: resumeStatusMap.failed || 0,
        },
      },
      leadMagnets: {
        total: leadMagnetSubmissions,
        converted: leadMagnetConversions,
        conversionRate,
      },
      recentSignups: recentSignups.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionStatus: user.subscription_status,
        subscriptionPlan: user.subscription_plan,
        createdAt: user.created_at,
      })),
    }

    console.log("[AdminStats] Response built successfully")
    return NextResponse.json(response)
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
