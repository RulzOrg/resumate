import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await verifyAdminAccess()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    // Parallel queries for performance
    const [
      totalUsersResult,
      newUsersThisMonthResult,
      newUsersLastMonthResult,
      activeUsersThisWeekResult,
      totalResumesResult,
      totalOptimizationsResult,
      proSubscriptionsResult,
      freeUsersResult,
      trialingUsersResult,
      canceledUsersResult,
      pendingSubscriptionsResult,
      leadMagnetSubmissionsResult,
      leadMagnetConversionsResult,
      resumesByStatusResult,
      recentSignups,
    ] = await Promise.all([
      sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE deleted_at IS NULL`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE created_at >= ${startOfMonth.toISOString()} AND deleted_at IS NULL`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE created_at >= ${startOfLastMonth.toISOString()} AND created_at <= ${endOfLastMonth.toISOString()} AND deleted_at IS NULL`,
      sql<{ count: string }>`SELECT COUNT(DISTINCT user_id) as count FROM resumes WHERE updated_at >= ${startOfWeek.toISOString()} AND deleted_at IS NULL`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM resumes WHERE deleted_at IS NULL`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM resumes WHERE kind = 'generated' AND deleted_at IS NULL`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE subscription_status = 'active' AND subscription_plan = 'pro' AND deleted_at IS NULL`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE subscription_status = 'free' AND deleted_at IS NULL`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE subscription_status = 'trialing' AND deleted_at IS NULL`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM users_sync WHERE subscription_status = 'canceled' AND deleted_at IS NULL`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM pending_polar_subscriptions WHERE linked_user_id IS NULL`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM lead_magnet_submissions`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM lead_magnet_submissions WHERE converted_to_user = true`,
      sql<{ processing_status: string; count: string }>`SELECT processing_status, COUNT(*) as count FROM resumes WHERE deleted_at IS NULL GROUP BY processing_status`,
      sql<{ id: string; email: string; name: string; subscription_status: string; subscription_plan: string; created_at: string }>`
        SELECT id, email, name, subscription_status, subscription_plan, created_at
        FROM users_sync
        WHERE created_at >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()} AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 10
      `,
    ])

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
    const leadMagnetSubmissions = parseInt(leadMagnetSubmissionsResult[0]?.count || "0")
    const leadMagnetConversions = parseInt(leadMagnetConversionsResult[0]?.count || "0")

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

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
