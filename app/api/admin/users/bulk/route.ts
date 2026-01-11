import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function DELETE(request: NextRequest) {
  try {
    await verifyAdminAccess()

    const body = await request.json()
    const { userIds, hardDelete = false } = body

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds must be a non-empty array" },
        { status: 400 }
      )
    }

    if (userIds.length > 100) {
      return NextResponse.json(
        { error: "Cannot delete more than 100 users at once" },
        { status: 400 }
      )
    }

    if (hardDelete) {
      await sql`DELETE FROM users_sync WHERE id = ANY(${userIds})`

      return NextResponse.json({
        message: `${userIds.length} users permanently deleted`,
        deletedCount: userIds.length,
      })
    } else {
      await sql`
        UPDATE users_sync
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ANY(${userIds})
      `

      return NextResponse.json({
        message: `${userIds.length} users soft deleted`,
        deletedCount: userIds.length,
      })
    }
  } catch (error) {
    console.error("Admin bulk delete error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete users" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
