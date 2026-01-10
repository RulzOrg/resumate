import { NextRequest, NextResponse } from "next/server"
import { sql, createUserFromClerk, updateUserFromClerk, deleteUserByClerkId, getUserByClerkId, updateBeehiivSubscriberId, getPendingSubscriptionByEmail, linkPendingSubscription } from "@/lib/db"
import { subscribeUser, getSubscriberByEmail, unsubscribeUser, isBeehiivEnabled, safeBeehiivOperation, validateBeehiivConfig } from "@/lib/beehiiv"
import { createLogger } from "@/lib/debug-logger"

const logger = createLogger("ClerkWebhook")

// Log Beehiiv config status once on first webhook (for debugging)
let hasLoggedBeehiivStatus = false
function logBeehiivStatus() {
  if (hasLoggedBeehiivStatus) return
  hasLoggedBeehiivStatus = true

  const enabled = isBeehiivEnabled()
  const validation = enabled ? validateBeehiivConfig() : null
  logger.log('Beehiiv config status:', {
    enabled,
    valid: validation?.valid ?? 'N/A',
    errors: validation?.errors ?? [],
  })
}

// Minimal verification via Clerk's recommended header secret (Svix). If not set, skip verify in dev.
export async function POST(req: NextRequest) {
  const bodyText = await req.text()
  const svixId = req.headers.get("svix-id") || ""
  const svixTimestamp = req.headers.get("svix-timestamp") || ""
  const svixSignature = req.headers.get("svix-signature") || ""

  const secret = process.env.CLERK_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || ""

  try {
    // Optional: verify signature when secret is present
    if (secret) {
      const { Webhook } = await import("svix")
      const wh = new Webhook(secret)
      wh.verify(bodyText, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      })
    }

    const evt = JSON.parse(bodyText)
    const type = evt?.type as string
    const data = evt?.data || {}

    // Log Beehiiv config on first webhook for debugging
    logBeehiivStatus()

    if (type === "user.created") {
      const clerkId = data.id as string
      const email = data.email_addresses?.[0]?.email_address || data.primary_email_address?.email_address || ""
      const name = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ") || "User"

      const newUser = await createUserFromClerk(clerkId, email, name)
      logger.log('User created:', { clerk_user_id: clerkId, user_id: newUser?.id, email })

      // Automatically subscribe all users to Beehiiv newsletter (graceful - never fails webhook)
      if (email) {
        logger.log('Attempting Beehiiv subscription:', { email, beehiivEnabled: isBeehiivEnabled() })
        const result = await safeBeehiivOperation(
          () => subscribeUser({
            email,
            firstName: data.first_name || undefined,
            lastName: data.last_name || undefined,
            utmSource: 'useresumate',
            utmMedium: 'platform',
            utmCampaign: 'user_signup',
          }),
          'user_created_subscription'
        )
        if (result.success) {
          logger.log('Beehiiv subscription created:', { email, subscriberId: result.data.id })
          // Store the subscriber ID for faster unsubscribe operations (fire and forget)
          updateBeehiivSubscriberId(clerkId, result.data.id).catch((err) => {
            logger.error('Failed to store Beehiiv subscriber ID:', err)
          })
        } else {
          // Log explicit failure to make debugging easier
          logger.error('Beehiiv subscription FAILED:', {
            email,
            error: result.error?.message,
            errorCode: result.error?.error,
            clerkId,
          })
        }
      } else {
        logger.warn('Skipping Beehiiv subscription: no email found in webhook data', { clerkId })
      }

      // Check for pending Polar subscription (payment-first flow)
      // If user paid before creating account, link their subscription now
      if (email && newUser) {
        try {
          const pendingSub = await getPendingSubscriptionByEmail(email)
          if (pendingSub) {
            // Use the database user ID (newUser.id), not the Clerk ID
            await linkPendingSubscription(newUser.id, pendingSub)
            logger.log('Linked pending Polar subscription:', {
              clerk_user_id: clerkId,
              user_id: newUser.id,
              email,
              polar_subscription_id: pendingSub.polar_subscription_id
            })
          }
        } catch (err) {
          // Don't fail the webhook if linking fails - user can still use the app
          logger.error('Failed to link pending subscription:', err)
        }
      }
    } else if (type === "user.updated") {
      const clerkId = data.id as string
      const newEmail = data.email_addresses?.[0]?.email_address || data.primary_email_address?.email_address
      const name = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ")

      // Get existing user to check for email changes
      const existingUser = await getUserByClerkId(clerkId)
      const oldEmail = existingUser?.email

      // Update user in our DB
      await updateUserFromClerk(clerkId, { email: newEmail, name })
      logger.log('User updated:', { clerk_user_id: clerkId, email: newEmail })

      // Handle Beehiiv email update if email changed (graceful - never fails webhook)
      if (oldEmail && newEmail && oldEmail !== newEmail && isBeehiivEnabled()) {
        // Check if old email was subscribed to Beehiiv
        const existingSubscriber = await safeBeehiivOperation(
          () => getSubscriberByEmail(oldEmail),
          'email_update_lookup'
        )

        if (existingSubscriber.success) {
          // Unsubscribe old email (fire and forget - we're re-subscribing anyway)
          safeBeehiivOperation(() => unsubscribeUser(oldEmail), 'email_update_unsubscribe')

          // Subscribe new email
          const result = await safeBeehiivOperation(
            () => subscribeUser({
              email: newEmail,
              firstName: data.first_name || undefined,
              lastName: data.last_name || undefined,
              utmSource: 'useresumate',
              utmMedium: 'platform',
              utmCampaign: 'email_update',
            }),
            'email_update_subscribe'
          )

          if (result.success) {
            logger.log('Beehiiv email updated:', { oldEmail, newEmail, subscriberId: result.data.id })
            // Update the stored subscriber ID
            updateBeehiivSubscriberId(clerkId, result.data.id).catch((err) => {
              logger.error('Failed to update Beehiiv subscriber ID:', err)
            })
          } else {
            // Clear the old subscriber ID since we failed to re-subscribe
            updateBeehiivSubscriberId(clerkId, null).catch((err) => {
              logger.error('Failed to clear Beehiiv subscriber ID:', err)
            })
          }
        }
      }
    } else if (type === "user.deleted") {
      const clerkId = data.id as string
      await deleteUserByClerkId(clerkId)
    }

    // Persist raw event for audit/debug if table exists
    try {
      await sql`
        INSERT INTO clerk_webhook_events (event_type, event_id, user_id, raw_data, created_at)
        VALUES (${type}, ${evt.id || ""}, ${data?.id || null}, ${JSON.stringify(evt)}, NOW())
      `
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "invalid" }, { status: 400 })
  }
}

export const dynamic = "force-dynamic"
