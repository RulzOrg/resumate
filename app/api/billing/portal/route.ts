import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser } from "@/lib/db"
import { getStripe, isStripeConfigured } from "@/lib/stripe"
import { getBillingProvider } from "@/lib/billing/config"
import { createPolarPortalSession } from "@/lib/billing/polar"

export async function POST(request: NextRequest) {
  try {
    const provider = getBillingProvider()
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    if (provider === 'polar') {
      // For Polar, use a hosted portal URL (env) until we implement server-side
      return await createPolarPortalSession({ returnUrl: `${appUrl}/dashboard`, clerkUserId: userId })
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Billing not configured" }, { status: 503 })
    }

    if (!user?.stripe_customer_id) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 })
    }

    // Create Stripe customer portal session
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${appUrl}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Error creating portal session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
