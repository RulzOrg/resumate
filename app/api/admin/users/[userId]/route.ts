import { NextRequest, NextResponse } from "next/server"
import { requireAdminAPI, getCurrentAdminUserId } from "@/lib/admin-utils"
import { 
  getUserDetailsAdmin, 
  deleteUserByClerkId, 
  updateUserSubscriptionAdmin,
  logAdminAction,
  getUserById
} from "@/lib/db"
import { clerkClient } from "@clerk/nextjs/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authCheck = await requireAdminAPI()
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error?.message },
      { status: authCheck.error?.status || 403 }
    )
  }

  try {
    const { userId } = await params
    const userDetails = await getUserDetailsAdmin(userId)

    if (!userDetails) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const adminUserId = await getCurrentAdminUserId()
    if (adminUserId) {
      await logAdminAction({
        admin_user_id: adminUserId,
        action: "VIEW_USER_DETAILS",
        target_user_id: userId
      })
    }

    return NextResponse.json(userDetails)
  } catch (error: any) {
    console.error("[ADMIN_API] Error fetching user details:", error)
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authCheck = await requireAdminAPI()
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error?.message },
      { status: authCheck.error?.status || 403 }
    )
  }

  try {
    const { userId } = await params
    const body = await req.json()
    const { subscription_status, subscription_plan, subscription_period_end } = body

    if (!subscription_status) {
      return NextResponse.json(
        { error: "subscription_status is required" },
        { status: 400 }
      )
    }

    const updatedUser = await updateUserSubscriptionAdmin(userId, {
      subscription_status,
      subscription_plan,
      subscription_period_end
    })

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const adminUserId = await getCurrentAdminUserId()
    if (adminUserId) {
      await logAdminAction({
        admin_user_id: adminUserId,
        action: "UPDATE_USER_SUBSCRIPTION",
        target_user_id: userId,
        details: { subscription_status, subscription_plan, subscription_period_end }
      })
    }

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error("[ADMIN_API] Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authCheck = await requireAdminAPI()
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error?.message },
      { status: authCheck.error?.status || 403 }
    )
  }

  try {
    const { userId } = await params

    const user = await getUserById(userId)
    if (!user || !user.clerk_user_id) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Delete from database first
    let deletedUser
    try {
      deletedUser = await deleteUserByClerkId(user.clerk_user_id)
    } catch (dbError: any) {
      console.error("[ADMIN_API] Failed to delete user from database:", dbError)
      return NextResponse.json(
        { error: "Failed to delete user from database" },
        { status: 500 }
      )
    }

    // Only delete from Clerk if DB deletion succeeded
    try {
      const clerk = await clerkClient()
      await clerk.users.deleteUser(user.clerk_user_id)
    } catch (clerkError: any) {
      console.error("[ADMIN_API] Failed to delete user from Clerk (database entry already removed):", clerkError)
      return NextResponse.json(
        { error: "Database entry removed, but failed to delete user from Clerk" },
        { status: 500 }
      )
    }

    const adminUserId = await getCurrentAdminUserId()
    if (adminUserId) {
      await logAdminAction({
        admin_user_id: adminUserId,
        action: "DELETE_USER",
        target_user_id: userId,
        details: { 
          email: user.email,
          name: user.name
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: "User deleted successfully",
      user: deletedUser 
    })
  } catch (error: any) {
    console.error("[ADMIN_API] Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
