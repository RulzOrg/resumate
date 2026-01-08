import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getUserByClerkId, updateBeehiivSubscriberId } from "@/lib/db"
import { unsubscribeUser, isBeehiivEnabled, safeBeehiivOperation } from "@/lib/beehiiv"
import { createLogger } from "@/lib/debug-logger"

const logger = createLogger("BeehiivUnsubscribeAPI")

/**
 * POST /api/beehiiv/unsubscribe
 * 
 * Authenticated endpoint for users to unsubscribe from the newsletter
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

    // Get user from database
    const user = await getUserByClerkId(userId)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    logger.log("Processing unsubscribe request", { 
      userId, 
      email: user.email,
      hasSubscriberId: !!user.beehiiv_subscriber_id 
    })

    // Unsubscribe from Beehiiv
    // Use subscriber ID if available (faster), otherwise use email
    const identifier = user.beehiiv_subscriber_id || user.email
    
    const result = await safeBeehiivOperation(
      () => unsubscribeUser(identifier),
      'user_settings_unsubscribe'
    )

    if (result.success) {
      // Clear the stored subscriber ID
      await updateBeehiivSubscriberId(userId, null)
      
      logger.log("User unsubscribed successfully", { 
        userId, 
        email: user.email 
      })

      return NextResponse.json({
        success: true,
        message: "Successfully unsubscribed from newsletter",
      })
    } else {
      logger.error("Unsubscribe failed", { 
        userId, 
        email: user.email,
        error: result.error 
      })

      // Return appropriate error message
      if (result.error.error === "NOT_FOUND") {
        return NextResponse.json({
          success: true, // Consider this success - user wasn't subscribed
          message: "You were not subscribed to the newsletter",
        })
      }

      return NextResponse.json(
        { 
          error: result.error.message,
          success: false 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error("Unexpected error in unsubscribe endpoint", error)
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
