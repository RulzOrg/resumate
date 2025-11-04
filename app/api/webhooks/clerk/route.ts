import { NextRequest, NextResponse } from "next/server"
import { sql, createUserFromClerk, updateUserFromClerk, deleteUserByClerkId } from "@/lib/db"
import { subscribeToBeehiiv } from "@/lib/beehiiv"

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

    if (type === "user.created") {
      const clerkId = data.id as string
      const email = data.email_addresses?.[0]?.email_address || data.primary_email_address?.email_address || ""
      const name = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ") || "User"

      // Create user in database
      await createUserFromClerk(clerkId, email, name)

      // Check if user opted into newsletter (from signup form checkbox)
      const newsletterConsent = data.unsafe_metadata?.newsletter_consent === true

      // Subscribe to Beehiiv if user opted in
      if (email && newsletterConsent) {
        try {
          const result = await subscribeToBeehiiv(email, {
            name,
            source: 'clerk_signup',
            sendWelcome: true,
            customFields: {
              user_id: clerkId,
              signup_date: new Date().toISOString(),
              subscription_plan: 'free',
            }
          })

          if (result.success) {
            // Update database with Beehiiv subscriber info
            try {
              await sql`
                UPDATE users_sync
                SET newsletter_subscribed = true,
                    beehiiv_subscriber_id = ${result.subscriberId},
                    newsletter_subscribed_at = NOW()
                WHERE clerk_user_id = ${clerkId}
              `
              console.log('[CLERK_WEBHOOK] User subscribed to newsletter:', {
                clerk_user_id: clerkId,
                beehiiv_subscriber_id: result.subscriberId,
              })
            } catch (dbError: any) {
              console.error('[CLERK_WEBHOOK] Failed to update database with Beehiiv ID:', dbError)
            }
          } else {
            console.warn('[CLERK_WEBHOOK] Beehiiv subscription failed (non-blocking):', result.error)
          }
        } catch (error: any) {
          // Don't fail webhook if Beehiiv fails - user creation is more important
          console.error('[CLERK_WEBHOOK] Beehiiv subscription error (non-blocking):', error)
        }
      } else if (newsletterConsent === false) {
        console.log('[CLERK_WEBHOOK] User opted out of newsletter')
      }
    } else if (type === "user.updated") {
      const clerkId = data.id as string
      const email = data.email_addresses?.[0]?.email_address || data.primary_email_address?.email_address
      const name = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ")
      await updateUserFromClerk(clerkId, { email, name })
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

