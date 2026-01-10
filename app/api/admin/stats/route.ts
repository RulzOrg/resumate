import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await verifyAdminAccess()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Parallel queries for performance
    const [
      totalUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      activeUsersThisWeek,
      totalResumes,
      totalOptimizations,
      proSubscriptions,
      freeUsers,
      trialingUsers,
      canceledUsers,
      pendingSubscriptions,
      leadMagnetSubmissions,
      leadMagnetConversions,
      resumesByStatus,
      recentSignups,
    ] = await Promise.all([
      // Total users (excluding deleted)
      prisma.userSync.count({
        where: { deletedAt: null },
      }),

      // New users this month
      prisma.userSync.count({
        where: {
          createdAt: { gte: startOfMonth },
          deletedAt: null,
        },
      }),

      // New users last month
      prisma.userSync.count({
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          deletedAt: null,
        },
      }),

      // Active users this week (users who created or updated resumes)
      prisma.resume.groupBy({
        by: ["userId"],
        where: {
          updatedAt: { gte: startOfWeek },
        },
      }).then((groups: { userId: string }[]) => groups.length),

      // Total resumes
      prisma.resume.count({
        where: { deletedAt: null },
      }),

      // Total optimizations (generated resumes)
      prisma.resume.count({
        where: {
          kind: "generated",
          deletedAt: null,
        },
      }),

      // Pro subscriptions (active)
      prisma.userSync.count({
        where: {
          subscriptionStatus: "active",
          subscriptionPlan: "pro",
          deletedAt: null,
        },
      }),

      // Free users
      prisma.userSync.count({
        where: {
          subscriptionStatus: "free",
          deletedAt: null,
        },
      }),

      // Trialing users
      prisma.userSync.count({
        where: {
          subscriptionStatus: "trialing",
          deletedAt: null,
        },
      }),

      // Canceled users
      prisma.userSync.count({
        where: {
          subscriptionStatus: "canceled",
          deletedAt: null,
        },
      }),

      // Pending subscriptions (not linked to users)
      prisma.pendingPolarSubscription.count({
        where: { linkedUserId: null },
      }),

      // Lead magnet submissions
      prisma.leadMagnetSubmission.count(),

      // Lead magnet conversions
      prisma.leadMagnetSubmission.count({
        where: { convertedToUser: true },
      }),

      // Resumes by processing status
      prisma.resume.groupBy({
        by: ["processingStatus"],
        _count: true,
        where: { deletedAt: null },
      }),

      // Recent signups (last 7 days)
      prisma.userSync.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionStatus: true,
          subscriptionPlan: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ])

    // Calculate growth rate
    const userGrowthRate = newUsersLastMonth > 0
      ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
      : newUsersThisMonth > 0 ? 100 : 0

    // Calculate conversion rate
    const conversionRate = leadMagnetSubmissions > 0
      ? Math.round((leadMagnetConversions / leadMagnetSubmissions) * 100)
      : 0

    // Parse resume status counts
    const resumeStatusMap = resumesByStatus.reduce((acc: Record<string, number>, item: { processingStatus: string; _count: number }) => {
      acc[item.processingStatus] = item._count
      return acc
    }, {} as Record<string, number>)

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
      recentSignups,
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
