import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

interface DbUser {
  id: string
  email: string
  name: string
  clerk_user_id: string | null
  subscription_status: string
  subscription_plan: string
  subscription_period_end: string | null
  polar_customer_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  resume_count: string
  job_analysis_count: string
  resume_version_count: string
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
    const includeDeleted = searchParams.get("includeDeleted") === "true"

    const offset = (page - 1) * limit

    // Simple query without dynamic ordering (to avoid SQL injection)
    // Build dynamic conditions
    const conditions = []
    if (search) {
      conditions.push(sql`(u.email ILIKE ${'%' + search + '%'} OR u.name ILIKE ${'%' + search + '%'})`)
    }
    if (status !== "all") {
      conditions.push(sql`u.subscription_status = ${status}`)
    }
    if (plan !== "all") {
      conditions.push(sql`u.subscription_plan = ${plan}`)
    }
    if (!includeDeleted) {
      conditions.push(sql`u.deleted_at IS NULL`)
    }

    // Ensure valid WHERE clause
    if (conditions.length === 0) {
      conditions.push(sql`1=1`)
    }

    const users = await sql<DbUser>`
      SELECT u.id, u.email, u.name, u.clerk_user_id, u.subscription_status, u.subscription_plan,
        u.subscription_period_end, u.polar_customer_id, u.created_at, u.updated_at, u.deleted_at,
        COALESCE((SELECT COUNT(*) FROM resumes r WHERE r.user_id = u.id), 0)::text as resume_count,
        COALESCE((SELECT COUNT(*) FROM job_analysis j WHERE j.user_id = u.id), 0)::text as job_analysis_count,
        COALESCE((SELECT COUNT(*) FROM resume_versions rv WHERE rv.user_id = u.id), 0)::text as resume_version_count
      FROM users_sync u
      WHERE ${(sql as any).join(conditions, sql` AND `)}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const totalResult = await sql<{ count: string }>`
      SELECT COUNT(*)::text as count FROM users_sync u
      WHERE ${(sql as any).join(conditions, sql` AND `)}
    `

    const total = parseInt(totalResult[0]?.count || "0")

    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      clerkUserId: user.clerk_user_id,
      subscriptionStatus: user.subscription_status,
      subscriptionPlan: user.subscription_plan,
      subscriptionPeriodEnd: user.subscription_period_end,
      polarCustomerId: user.polar_customer_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      deletedAt: user.deleted_at,
      stats: {
        resumes: parseInt(user.resume_count || "0"),
        jobAnalyses: parseInt(user.job_analysis_count || "0"),
        resumeVersions: parseInt(user.resume_version_count || "0"),
      },
    }))

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
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
