import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, dismissGettingStarted } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Only dismiss if not already dismissed
    if (!user.getting_started_dismissed_at) {
      await dismissGettingStarted(user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error dismissing getting started:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
