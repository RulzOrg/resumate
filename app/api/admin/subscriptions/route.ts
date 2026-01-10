import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAccess()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status") || "all"
    const linked = searchParams.get("linked") // "true", "false", or null for all

    const skip = (page - 1) * limit

    // Build where clause for pending subscriptions
    const where: Record<string, unknown> = {}

    if (status !== "all") {
      where.status = status
    }

    if (linked === "true") {
      where.linkedUserId = { not: null }
    } else if (linked === "false") {
      where.linkedUserId = null
    }

    const [subscriptions, total, stats] = await Promise.all([
      prisma.pendingPolarSubscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          linkedUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.pendingPolarSubscription.count({ where }),
      // Get subscription stats
      prisma.pendingPolarSubscription.groupBy({
        by: ["status"],
        _count: true,
      }),
    ])

    // Get active user subscriptions
    const userSubscriptions = await prisma.userSync.findMany({
      where: {
        subscriptionStatus: { in: ["active", "trialing", "past_due"] },
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionPeriodEnd: true,
        polarCustomerId: true,
        polarSubscriptionId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    // Parse status stats
    const statusStats = stats.reduce((acc: Record<string, number>, item: { status: string; _count: number }) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      pendingSubscriptions: subscriptions,
      activeSubscriptions: userSubscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
      stats: {
        byStatus: statusStats,
        unlinked: await prisma.pendingPolarSubscription.count({
          where: { linkedUserId: null },
        }),
      },
    })
  } catch (error) {
    console.error("Admin subscriptions error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch subscriptions" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
