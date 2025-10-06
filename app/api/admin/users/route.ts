import { NextRequest, NextResponse } from "next/server"
import { requireAdminAPI, getCurrentAdminUserId } from "@/lib/admin-utils"
import { getAllUsersAdmin, logAdminAction } from "@/lib/db"

export async function GET(req: NextRequest) {
  const authCheck = await requireAdminAPI()
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error?.message },
      { status: authCheck.error?.status || 403 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const subscription_status = searchParams.get("subscription_status") || ""
    const sortBy = (searchParams.get("sortBy") || "created_at") as "created_at" | "name" | "email"
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc"

    const result = await getAllUsersAdmin({
      page,
      limit,
      search,
      subscription_status,
      sortBy,
      sortOrder
    })

    const adminUserId = await getCurrentAdminUserId()
    if (adminUserId) {
      await logAdminAction({
        admin_user_id: adminUserId,
        action: "LIST_USERS",
        details: { page, limit, search, subscription_status }
      })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[ADMIN_API] Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
