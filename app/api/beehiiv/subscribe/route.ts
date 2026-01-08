import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { getUserByClerkId, updateBeehiivSubscriberId } from "@/lib/db"
import { subscribeUser, isBeehiivEnabled, safeBeehiivOperation } from "@/lib/beehiiv"
import { createLogger } from "@/lib/debug-logger"

const logger = createLogger("BeehiivSubscribeAPI")

/**
 * POST /api/beehiiv/subscribe
 * 
 * Authenticated endpoint for users to subscribe/resubscribe to the newsletter
 * Called from user settings page
 */
export async function POST(req: NextRequest) {
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
      return NextResponse.json(
        { 
          error: "Newsletter integration is not enabled",
          success: false 
        },
        { status: 400 }
      )
    }

    // Get user info
    const user = await getUserByClerkId(userId)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const clerkUser = await currentUser()
    const firstName = clerkUser?.firstName || undefined
    const lastName = clerkUser?.lastName || undefined

    logger.log("Processing subscribe request", { 
      userId
    })

    // Subscribe to Beehiiv (reactivate if already exists)
    const result = await safeBeehiivOperation(
      () => subscribeUser({
        email: user.email,
        firstName,
        lastName,
        utmSource: 'useresumate',
        utmMedium: 'platform',
        utmCampaign: 'user_settings',
        reactivateExisting: true,
        sendWelcomeEmail: false, // Don't send welcome email for re-subscriptions
      }),
      'user_settings_subscribe'
    )

    if (result.success) {
      // Store the subscriber ID
      await updateBeehiivSubscriberId(userId, result.data.id)
      
      logger.log("User subscribed successfully", { 
        userId,
        subscriberId: result.data.id 
      })

      return NextResponse.json({
        success: true,
        message: "Successfully subscribed to newsletter",
        subscriberId: result.data.id,
      })
    } else {
      logger.error("Subscribe failed", { 
        userId,
        error: result.error 
      })

      return NextResponse.json(
        { 
          error: result.error.message,
          success: false 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error("Unexpected error in subscribe endpoint", error)
    return NextResponse.json(
      { 
        error: "An unexpected error occurred",
        success: false 
      },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"

