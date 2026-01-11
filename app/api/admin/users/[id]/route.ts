import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

// Get user details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAccess()
    const { id } = await params

    const users = await sql<{
      id: string
      email: string
      name: string
      clerk_user_id: string | null
      subscription_status: string
      subscription_plan: string
      subscription_period_end: string | null
      polar_customer_id: string | null
      polar_subscription_id: string | null
      created_at: string
      updated_at: string
      deleted_at: string | null
    }>`
      SELECT * FROM users_sync WHERE id = ${id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dbUser = users[0]

    // Get counts
    const [resumeCount, jobAnalysisCount, resumeVersionCount, jobApplicationCount] = await Promise.all([
      sql<{ count: string }>`SELECT COUNT(*)::text as count FROM resumes WHERE user_id = ${id}`,
      sql<{ count: string }>`SELECT COUNT(*)::text as count FROM job_analysis WHERE user_id = ${id}`,
      sql<{ count: string }>`SELECT COUNT(*)::text as count FROM resume_versions WHERE user_id = ${id}`,
      sql<{ count: string }>`SELECT COUNT(*)::text as count FROM job_applications WHERE user_id = ${id}`,
    ])

    // Get recent resumes
    const resumes = await sql<{
      id: string
      title: string
      kind: string
      processing_status: string
      created_at: string
    }>`
      SELECT id, title, kind, processing_status, created_at
      FROM resumes WHERE user_id = ${id}
      ORDER BY created_at DESC LIMIT 10
    `

    // Get recent job analyses
    const jobAnalyses = await sql<{
      id: string
      job_title: string
      company_name: string
      created_at: string
    }>`
      SELECT id, job_title, company_name, created_at
      FROM job_analysis WHERE user_id = ${id}
      ORDER BY created_at DESC LIMIT 10
    `

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      clerkUserId: dbUser.clerk_user_id,
      subscriptionStatus: dbUser.subscription_status,
      subscriptionPlan: dbUser.subscription_plan,
      subscriptionPeriodEnd: dbUser.subscription_period_end,
      polarCustomerId: dbUser.polar_customer_id,
      polarSubscriptionId: dbUser.polar_subscription_id,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      deletedAt: dbUser.deleted_at,
      resumes: resumes.map(r => ({
        id: r.id,
        title: r.title,
        kind: r.kind,
        processingStatus: r.processing_status,
        createdAt: r.created_at,
      })),
      jobAnalyses: jobAnalyses.map(j => ({
        id: j.id,
        jobTitle: j.job_title,
        companyName: j.company_name,
        createdAt: j.created_at,
      })),
      _count: {
        resumes: parseInt(resumeCount[0]?.count || "0"),
        jobAnalyses: parseInt(jobAnalysisCount[0]?.count || "0"),
        resumeVersions: parseInt(resumeVersionCount[0]?.count || "0"),
        jobApplications: parseInt(jobApplicationCount[0]?.count || "0"),
      },
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Admin user detail error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}

// Update user (subscription status, plan, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAccess()
    const { id } = await params
    const body = await request.json()

    const { subscriptionStatus, subscriptionPlan, subscriptionPeriodEnd } = body

    // Build update fragments
    const updates = []
    if (subscriptionStatus !== undefined) updates.push(sql`subscription_status = ${subscriptionStatus}`)
    if (subscriptionPlan !== undefined) updates.push(sql`subscription_plan = ${subscriptionPlan}`)
    if (subscriptionPeriodEnd !== undefined) updates.push(sql`subscription_period_end = ${subscriptionPeriodEnd}`)

    if (updates.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Always update updated_at
    updates.push(sql`updated_at = NOW()`)

    await sql`
      UPDATE users_sync
      SET ${updates}
      WHERE id = ${id}
    `

    const updatedUsers = await sql`SELECT * FROM users_sync WHERE id = ${id}`

    if (updatedUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUsers[0],
    })
  } catch (error) {
    console.error("Admin user update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}

// Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAccess()
    const { id } = await params

    const searchParams = request.nextUrl.searchParams
    const hardDelete = searchParams.get("hard") === "true"

    const users = await sql<{ id: string; email: string }>`
      SELECT id, email FROM users_sync WHERE id = ${id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = users[0]

    if (hardDelete) {
      // Hard delete - cascades to all related records
      await sql`DELETE FROM users_sync WHERE id = ${id}`

      return NextResponse.json({
        message: "User permanently deleted",
        deletedUser: { id, email: user.email },
      })
    } else {
      // Soft delete
      await sql`
        UPDATE users_sync SET deleted_at = NOW(), updated_at = NOW() WHERE id = ${id}
      `

      const updatedUsers = await sql`SELECT * FROM users_sync WHERE id = ${id}`

      return NextResponse.json({
        message: "User soft deleted",
        user: updatedUsers[0],
      })
    }
  } catch (error) {
    console.error("Admin user delete error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
