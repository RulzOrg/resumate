import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface SubscriptionGroupBy {
  subscriptionPlan: string
  subscriptionStatus: string
  _count: number
}

interface TopUser {
  id: string
  email: string
  name: string
  subscriptionPlan: string
  _count: {
    resumes: number
    jobAnalyses: number
  }
}

interface LeadMagnetStat {
  date: Date
  total: bigint
  converted: bigint
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAccess()

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "30" // days
    const periodDays = parseInt(period)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)
    startDate.setHours(0, 0, 0, 0)

    // Get daily signups
    const dailySignups = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users_sync
      WHERE created_at >= ${startDate} AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Get daily resume uploads
    const dailyResumes = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM resumes
      WHERE created_at >= ${startDate} AND deleted_at IS NULL AND kind = 'uploaded'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Get daily optimizations
    const dailyOptimizations = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM resumes
      WHERE created_at >= ${startDate} AND deleted_at IS NULL AND kind = 'generated'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Get daily job analyses
    const dailyJobAnalyses = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM job_analysis
      WHERE created_at >= ${startDate} AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Get subscription changes
    const subscriptionsByPlan = await prisma.userSync.groupBy({
      by: ["subscriptionPlan"],
      _count: true,
      where: { deletedAt: null },
    })

    const subscriptionsByStatus = await prisma.userSync.groupBy({
      by: ["subscriptionStatus"],
      _count: true,
      where: { deletedAt: null },
    })

    // Get top users by activity
    const topUsersByResumes = await prisma.userSync.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionPlan: true,
        _count: {
          select: {
            resumes: true,
            jobAnalyses: true,
          },
        },
      },
      orderBy: {
        resumes: { _count: "desc" },
      },
      take: 10,
    })

    // Get lead magnet performance
    const leadMagnetStats = await prisma.$queryRaw<Array<{ date: Date; total: bigint; converted: bigint }>>`
      SELECT
        DATE(submitted_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN converted_to_user = true THEN 1 END) as converted
      FROM lead_magnet_submissions
      WHERE submitted_at >= ${startDate}
      GROUP BY DATE(submitted_at)
      ORDER BY date ASC
    `

    // Format data for charts
    const formatDailyData = (data: Array<{ date: Date; count: bigint }>) =>
      data.map((item) => ({
        date: item.date.toISOString().split("T")[0],
        count: Number(item.count),
      }))

    return NextResponse.json({
      period: periodDays,
      signups: formatDailyData(dailySignups),
      resumes: formatDailyData(dailyResumes),
      optimizations: formatDailyData(dailyOptimizations),
      jobAnalyses: formatDailyData(dailyJobAnalyses),
      subscriptions: {
        byPlan: subscriptionsByPlan.map((item: { subscriptionPlan: string; _count: number }) => ({
          plan: item.subscriptionPlan,
          count: item._count,
        })),
        byStatus: subscriptionsByStatus.map((item: { subscriptionStatus: string; _count: number }) => ({
          status: item.subscriptionStatus,
          count: item._count,
        })),
      },
      topUsers: topUsersByResumes.map((user: TopUser) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.subscriptionPlan,
        resumes: user._count.resumes,
        jobAnalyses: user._count.jobAnalyses,
      })),
      leadMagnets: leadMagnetStats.map((item: LeadMagnetStat) => ({
        date: item.date.toISOString().split("T")[0],
        total: Number(item.total),
        converted: Number(item.converted),
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
