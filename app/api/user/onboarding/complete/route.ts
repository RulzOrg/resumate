import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, markUserOnboardingComplete } from "@/lib/db"

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

    // Only mark complete if not already completed
    if (!user.onboarding_completed_at) {
      await markUserOnboardingComplete(user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking onboarding complete:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
