import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAccess()

    const searchParams = request.nextUrl.searchParams
    let page = parseInt(searchParams.get("page") || "1")
    let limit = parseInt(searchParams.get("limit") || "20")

    // Validate and sanitize inputs
    if (isNaN(page) || page < 1) page = 1
    if (isNaN(limit) || limit < 1) limit = 20
    if (limit > 100) limit = 100

    const offset = (page - 1) * limit

    // Get pending subscriptions with linked user info
    const pendingSubscriptions = await sql<{
      id: string
      polar_subscription_id: string
      polar_customer_id: string
      customer_email: string
      customer_name: string | null
      plan_type: string
      status: string
      amount: number
      currency: string
      created_at: string
      linked_user_id: string | null
      linked_user_email: string | null
      linked_user_name: string | null
    }>`
      SELECT
        p.id, p.polar_subscription_id, p.polar_customer_id, p.customer_email, p.customer_name,
        p.plan_type, p.status, p.amount, p.currency, p.created_at, p.linked_user_id,
        u.email as linked_user_email, u.name as linked_user_name
      FROM pending_polar_subscriptions p
      LEFT JOIN users_sync u ON p.linked_user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const totalResult = await sql<{ count: string }>`
      SELECT COUNT(*)::text as count FROM pending_polar_subscriptions
    `
    const total = parseInt(totalResult[0]?.count || "0")

    // Get active user subscriptions
    const activeSubscriptions = await sql<{
      id: string
      email: string
      name: string
      subscription_status: string
      subscription_plan: string
      subscription_period_end: string | null
      polar_customer_id: string | null
      polar_subscription_id: string | null
      created_at: string
    }>`
      SELECT id, email, name, subscription_status, subscription_plan, subscription_period_end,
        polar_customer_id, polar_subscription_id, created_at
      FROM users_sync
      WHERE subscription_status IN ('active', 'trialing', 'past_due') AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `

    // Get status stats
    const statusStats = await sql<{ status: string; count: string }>`
      SELECT status, COUNT(*)::text as count
      FROM pending_polar_subscriptions
      GROUP BY status
    `

    const unlinkedResult = await sql<{ count: string }>`
      SELECT COUNT(*)::text as count FROM pending_polar_subscriptions WHERE linked_user_id IS NULL
    `

    // Format data
    const formattedPending = pendingSubscriptions.map(sub => ({
      id: sub.id,
      polarSubscriptionId: sub.polar_subscription_id,
      polarCustomerId: sub.polar_customer_id,
      customerEmail: sub.customer_email,
      customerName: sub.customer_name,
      planType: sub.plan_type,
      status: sub.status,
      amount: sub.amount,
      currency: sub.currency,
      createdAt: sub.created_at,
      linkedUser: sub.linked_user_id ? {
        id: sub.linked_user_id,
        email: sub.linked_user_email,
        name: sub.linked_user_name,
      } : null,
    }))

    const formattedActive = activeSubscriptions.map(sub => ({
      id: sub.id,
      email: sub.email,
      name: sub.name,
      subscriptionStatus: sub.subscription_status,
      subscriptionPlan: sub.subscription_plan,
      subscriptionPeriodEnd: sub.subscription_period_end,
      polarCustomerId: sub.polar_customer_id,
      polarSubscriptionId: sub.polar_subscription_id,
      createdAt: sub.created_at,
    }))

    const byStatus: Record<string, number> = {}
    for (const row of statusStats) {
      byStatus[row.status] = parseInt(row.count)
    }

    return NextResponse.json({
      pendingSubscriptions: formattedPending,
      activeSubscriptions: formattedActive,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
      stats: {
        byStatus,
        unlinked: parseInt(unlinkedResult[0]?.count || "0"),
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
