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
    
    // Parse and validate page (default: 1, min: 1)
    const pageRaw = Number(searchParams.get("page"))
    const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, Math.floor(pageRaw))
    
    // Parse and validate limit (default: 50, min: 1, max: 100)
    const limitRaw = Number(searchParams.get("limit"))
    const limit = Number.isNaN(limitRaw) ? 50 : Math.min(100, Math.max(1, Math.floor(limitRaw)))
    
    // Validate search (coerce to string)
    const search = String(searchParams.get("search") || "")
    
    // Validate subscription_status (coerce to string)
    const subscription_status = String(searchParams.get("subscription_status") || "")
    
    // Validate sortBy against whitelist
    const allowedSortBy = ["created_at", "name", "email"] as const
    const sortByRaw = searchParams.get("sortBy") || "created_at"
    const sortBy = allowedSortBy.includes(sortByRaw as any) 
      ? (sortByRaw as "created_at" | "name" | "email")
      : "created_at"
    
    // Validate sortOrder against whitelist
    const allowedSortOrder = ["asc", "desc"] as const
    const sortOrderRaw = searchParams.get("sortOrder") || "desc"
    const sortOrder = allowedSortOrder.includes(sortOrderRaw as any)
      ? (sortOrderRaw as "asc" | "desc")
      : "desc"

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
      try {
        await logAdminAction({
          admin_user_id: adminUserId,
          action: "LIST_USERS",
          details: { page, limit, search, subscription_status }
        })
      } catch (logError) {
        console.error("[ADMIN_API] Failed to log action:", logError)
      }
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
