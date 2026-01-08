import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { Polar } from "@polar-sh/sdk"
import { getUserByClerkId } from "@/lib/db"

// Validate required environment variables at module initialization
const polarApiKey = process.env.POLAR_API_KEY
if (!polarApiKey) {
  throw new Error(
    "POLAR_API_KEY environment variable is required but not set. Please configure it in your environment variables."
  )
}

const polarServer =
  process.env.POLAR_SERVER === "production" ? "production" : "sandbox"

const polar = new Polar({
  accessToken: polarApiKey,
  server: polarServer,
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get current user details from Clerk
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get user from our database
    const dbUser = await getUserByClerkId(userId)
    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      )
    }

    // Check if user already has an active subscription
    if (dbUser.subscription_status === "active" && dbUser.subscription_plan === "pro") {
      return NextResponse.json(
        { error: "User already has an active Pro subscription" },
        { status: 400 }
      )
    }

    const priceId = process.env.POLAR_PRICE_PRO_MONTHLY
    if (!priceId) {
      console.error("[Billing] POLAR_PRICE_PRO_MONTHLY not configured")
      return NextResponse.json(
        { error: "Billing not configured" },
        { status: 500 }
      )
    }

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    // Create Polar checkout session with user email pre-filled
    const checkout = await polar.checkouts.custom.create({
      productPriceId: priceId,
      successUrl: `${baseUrl}/checkout/success`,
      customerEmail: clerkUser.emailAddresses[0]?.emailAddress || dbUser.email,
      customerName: clerkUser.fullName || dbUser.name || undefined,
      metadata: {
        clerk_user_id: userId,
        user_id: dbUser.id,
      },
    })

    console.log("[Billing] Created checkout session:", {
      checkoutId: checkout.id,
      userId,
    })

    return NextResponse.json({
      url: checkout.url,
      checkoutId: checkout.id,
    })
  } catch (error: any) {
    console.error("[Billing] Error creating checkout:", {
      message: error?.message,
      stack: error?.stack,
    })

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
