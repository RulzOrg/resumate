import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface UserWithCount {
  id: string
  email: string
  name: string
  clerkUserId: string | null
  subscriptionStatus: string
  subscriptionPlan: string
  subscriptionPeriodEnd: Date | null
  polarCustomerId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  _count: {
    resumes: number
    jobAnalyses: number
    resumeVersions: number
  }
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAccess()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"
    const plan = searchParams.get("plan") || "all"
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const includeDeleted = searchParams.get("includeDeleted") === "true"

    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (!includeDeleted) {
      where.deletedAt = null
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status !== "all") {
      where.subscriptionStatus = status
    }

    if (plan !== "all") {
      where.subscriptionPlan = plan
    }

    // Build order by
    const orderBy: Record<string, string> = {}
    orderBy[sortBy] = sortOrder

    const [users, total] = await Promise.all([
      prisma.userSync.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              resumes: true,
              jobAnalyses: true,
              resumeVersions: true,
            },
          },
        },
      }),
      prisma.userSync.count({ where }),
    ])

    // Format user data
    const formattedUsers = users.map((user: UserWithCount) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      clerkUserId: user.clerkUserId,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionPeriodEnd: user.subscriptionPeriodEnd,
      polarCustomerId: user.polarCustomerId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      stats: {
        resumes: user._count.resumes,
        jobAnalyses: user._count.jobAnalyses,
        resumeVersions: user._count.resumeVersions,
      },
    }))

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    })
  } catch (error) {
    console.error("Admin users error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
