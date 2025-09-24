import { NextRequest, NextResponse } from "next/server"
import { updateUserSubscription } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { clerkUserId, plan = "pro", status = "active", stripeCustomerId } = await request.json()
    
    if (!clerkUserId) {
      return NextResponse.json({ error: "clerkUserId required" }, { status: 400 })
    }

    console.log(`Manually updating subscription for user ${clerkUserId} to ${plan} (${status})`)

    const updateData: any = {
      subscription_status: status,
      subscription_plan: plan,
      stripe_subscription_id: `sub_test_${Date.now()}`, // fake subscription ID for testing
      subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    }

    if (stripeCustomerId) {
      updateData.stripe_customer_id = stripeCustomerId
    }

    await updateUserSubscription(clerkUserId, updateData)

    return NextResponse.json({ 
      success: true, 
      message: `Updated user ${clerkUserId} to ${plan} plan with ${status} status` 
    })
  } catch (error: any) {
    console.error("Manual subscription update failed:", error)
    return NextResponse.json({ 
      error: "Update failed", 
      message: error?.message 
    }, { status: 500 })
  }
}