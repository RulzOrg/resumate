import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, updateUser } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { subscribed } = await request.json()

    // Update newsletter subscription status in database
    await updateUser(user.id, {
      newsletter_subscribed: subscribed,
      newsletter_subscribed_at: subscribed ? new Date() : undefined,
      newsletter_unsubscribed_at: !subscribed ? new Date() : undefined,
    })

    // Sync with Beehiiv if configured
    try {
      // Dynamic import to avoid circular dependencies if any
      const { subscribeToBeehiiv, unsubscribeFromBeehiiv } = await import("@/lib/beehiiv")

      if (subscribed) {
        await subscribeToBeehiiv(user.email, {
          name: user.name,
          source: "app_settings",
          sendWelcome: false, // Don't send welcome email for re-subscriptions from settings
        })
      } else {
        await unsubscribeFromBeehiiv(user.email)
      }
    } catch (error) {
      // Log error but don't fail the request since DB update succeeded
      console.error("Beehiiv sync error:", error)
    }

    return NextResponse.json({
      success: true,
      newsletter_subscribed: subscribed,
    })
  } catch (error: any) {
    console.error("Newsletter update error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update newsletter preference" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      newsletter_subscribed: user.newsletter_subscribed || false,
    })
  } catch (error: any) {
    console.error("Newsletter status error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get newsletter status" },
      { status: 500 }
    )
  }
}