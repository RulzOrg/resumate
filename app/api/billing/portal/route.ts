import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
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
  let userId: string | null = null
  try {
    const authResult = await auth()
    userId = authResult.userId ?? null

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

    console.log("[Billing Portal] Session created successfully")

    return NextResponse.json({
      url: portalSession.customerPortalUrl,
    })
  } catch (error: any) {
    // Extract error status/code for classification
    const errorStatus =
      error?.status || error?.statusCode || error?.response?.status
    const errorCode = error?.code

    // Log full error with context server-side for debugging
    console.error("[Billing Portal] Error creating portal session:", {
      message: error?.message,
      stack: error?.stack,
      status: errorStatus,
      code: errorCode,
      errorType: error?.constructor?.name,
      userId: userId,
      timestamp: new Date().toISOString(),
      fullError: error,
    })

    // Propagate authentication errors (401, 403)
    if (errorStatus === 401 || errorStatus === 403) {
      return NextResponse.json(
        {
          error: "Authentication failed",
        },
        { status: errorStatus }
      )
    }

    // Propagate network errors (connection refused, timeouts, etc.)
    if (
      errorCode === "ECONNREFUSED" ||
      errorCode === "ETIMEDOUT" ||
      errorCode === "ENOTFOUND" ||
      errorCode === "ECONNRESET"
    ) {
      return NextResponse.json(
        {
          error: "Network error",
        },
        { status: 503 }
      )
    }

    // Only use fallback for safe, non-critical errors:
    // - Rate limiting (429)
    // - Temporary service errors (502, 503 from upstream API - not network errors)
    // - Client errors (4xx) that aren't auth (400, 404, etc. but not 401, 403)
    // Note: Network errors (ECONNREFUSED, etc.) are already handled above
    const isSafeFallbackError =
      errorStatus === 429 ||
      errorStatus === 502 ||
      errorStatus === 503 ||
      (errorStatus >= 400 && errorStatus < 500 && errorStatus !== 401 && errorStatus !== 403)

    const portalBaseUrl = process.env.POLAR_PORTAL_BASE_URL
    if (isSafeFallbackError && portalBaseUrl) {
      console.warn("[Billing Portal] Using fallback URL due to safe error:", {
        status: errorStatus,
        code: errorCode,
      })
      return NextResponse.json({
        url: portalBaseUrl,
        fallback: true,
      })
    }

    // For all other errors, return generic message to prevent leaking internals
    return NextResponse.json(
      {
        error: "Failed to create portal session",
      },
      { status: errorStatus || 500 }
    )
  }
}
