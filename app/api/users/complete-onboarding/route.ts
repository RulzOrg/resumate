import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { completeOnboarding } from "@/lib/onboarding-utils"

export const dynamic = "force-dynamic"

/**
 * POST /api/users/complete-onboarding
 * Marks the authenticated user's onboarding as complete
 */
export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await completeOnboarding()

    return NextResponse.json({ 
      success: true,
      message: "Onboarding completed successfully" 
    })
  } catch (error: any) {
    console.error("Error completing onboarding:", error)
    return NextResponse.json(
      { error: error.message || "Failed to complete onboarding" },
      { status: 500 }
    )
  }
}
