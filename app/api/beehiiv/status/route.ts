import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getUserByClerkId } from "@/lib/db"
import { getSubscriberByEmail, isBeehiivEnabled, safeBeehiivOperation } from "@/lib/beehiiv"
import { createLogger } from "@/lib/debug-logger"

const logger = createLogger("BeehiivStatusAPI")

/**
 * GET /api/beehiiv/status
 * 
 * Get the current newsletter subscription status for the authenticated user
 * Called from user settings page to display current state
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if Beehiiv is enabled
    if (!isBeehiivEnabled()) {
      return NextResponse.json({
        enabled: false,
        subscribed: false,
        status: "disabled",
      })
    }

    // Get user from database
    const user = await getUserByClerkId(userId)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if user is subscribed in Beehiiv
    const result = await safeBeehiivOperation(
      () => getSubscriberByEmail(user.email),
      'user_settings_status_check'
    )

    if (result.success) {
      const isActive = result.data.status === "active" || result.data.status === "validating"
      
      logger.log("Subscription status checked", { 
        userId, 
        email: user.email,
        status: result.data.status,
        subscriberId: result.data.id 
      })

      return NextResponse.json({
        enabled: true,
        subscribed: isActive,
        status: result.data.status,
        subscriberId: result.data.id,
        subscribedAt: result.data.created ? new Date(result.data.created * 1000).toISOString() : null,
      })
    } else {
      // Not found means not subscribed
      if (result.error.error === "NOT_FOUND") {
        return NextResponse.json({
          enabled: true,
          subscribed: false,
          status: "not_subscribed",
        })
      }

      // Other errors - log but don't fail
      logger.error("Status check failed", { 
        userId, 
        email: user.email,
        error: result.error 
      })

      return NextResponse.json({
        enabled: true,
        subscribed: false,
        status: "unknown",
        error: result.error.message,
      })
    }
  } catch (error) {
    logger.error("Unexpected error in status endpoint", error)
    return NextResponse.json(
      { 
        error: "An unexpected error occurred",
        enabled: false,
        subscribed: false,
        status: "error",
      },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"

