import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { Polar } from "@polar-sh/sdk"
import { getUserByClerkId } from "@/lib/db"

const polar = new Polar({
  accessToken: process.env.POLAR_API_KEY!,
  server: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
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

    // Get user from our database
    const dbUser = await getUserByClerkId(userId)
    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if user has a Polar customer ID
    if (!dbUser.polar_customer_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      )
    }

    // Create a customer portal session
    const portalSession = await polar.customerSessions.create({
      customerId: dbUser.polar_customer_id,
    })

    console.log("[Billing Portal] Created session:", {
      userId,
      polarCustomerId: dbUser.polar_customer_id,
    })

    return NextResponse.json({
      url: portalSession.customerPortalUrl,
    })
  } catch (error: any) {
    console.error("[Billing Portal] Error:", {
      message: error?.message,
      stack: error?.stack,
    })

    // Fallback: Use direct portal URL if configured
    const portalBaseUrl = process.env.POLAR_PORTAL_BASE_URL
    if (portalBaseUrl) {
      return NextResponse.json({
        url: portalBaseUrl,
        fallback: true,
      })
    }

    return NextResponse.json(
      {
        error: "Failed to create portal session",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}
