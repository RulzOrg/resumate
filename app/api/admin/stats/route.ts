import { NextRequest, NextResponse } from "next/server"
import { requireAdminAPI, getCurrentAdminUserId } from "@/lib/admin-utils"
import { getAdminStats, logAdminAction } from "@/lib/db"

export async function GET(req: NextRequest) {
  const authCheck = await requireAdminAPI()
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error?.message },
      { status: authCheck.error?.status || 403 }
    )
  }

  try {
    const stats = await getAdminStats()

    const adminUserId = await getCurrentAdminUserId()
    if (adminUserId) {
      await logAdminAction({
        admin_user_id: adminUserId,
        action: "VIEW_STATS"
      })
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error("[ADMIN_API] Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
