import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getCurrentSubscription } from "@/lib/subscription"
import { getOrCreateUser } from "@/lib/db"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscription = await getCurrentSubscription()
    const user = await getOrCreateUser()

    return NextResponse.json({
      clerkUserId: userId,
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        subscription_status: user?.subscription_status,
        subscription_plan: user?.subscription_plan,
        stripe_customer_id: user?.stripe_customer_id,
        stripe_subscription_id: user?.stripe_subscription_id,
        subscription_period_end: user?.subscription_period_end,
      },
      subscription
    })
  } catch (error) {
    console.error("Debug subscription error:", error)
    return NextResponse.json({ error: "Failed to get debug info" }, { status: 500 })
  }
}