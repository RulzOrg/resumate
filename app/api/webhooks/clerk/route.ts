import { NextRequest, NextResponse } from "next/server"
import { sql, createUserFromClerk, updateUserFromClerk, deleteUserByClerkId } from "@/lib/db"
import { clerkClient } from "@clerk/nextjs/server"

/**
 * Handles successful email verification
 * Atomically moves pending_email to email and updates Clerk primary email
 */
async function handleEmailVerificationSuccess(
  clerkUserId: string,
  emailId: string,
  verifiedEmail: string
) {
  try {
    // Get user and verify pending email matches
    const [user] = await sql`
      SELECT id, email, pending_email, email_verification_token
      FROM users_sync
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
    `

    if (!user) {
      console.error('[EMAIL_VERIFICATION] User not found:', { clerk_user_id: clerkUserId })
      return
    }

    // Check if this is the pending email verification
    if (user.pending_email !== verifiedEmail) {
      console.log('[EMAIL_VERIFICATION] Verified email does not match pending email:', {
        verified: verifiedEmail,
        pending: user.pending_email,
        skipping: true
      })
      return
    }

    // Check if email ID matches
    if (user.email_verification_token !== emailId) {
      console.warn('[EMAIL_VERIFICATION] Email ID mismatch:', {
        expected: user.email_verification_token,
        received: emailId
      })
    }

    console.log('[EMAIL_VERIFICATION] Starting atomic email update:', {
      user_id: user.id,
      old_email: user.email,
      new_email: verifiedEmail
    })

    // Atomic update: Move pending_email to email and clear verification fields
    const [updatedUser] = await sql`
      UPDATE users_sync
      SET email = ${verifiedEmail},
          pending_email = NULL,
          email_verification_status = 'verified',
          email_verification_token = NULL,
          email_verification_expiry = NULL,
          updated_at = NOW()
      WHERE id = ${user.id} 
        AND clerk_user_id = ${clerkUserId}
        AND pending_email = ${verifiedEmail}
        AND deleted_at IS NULL
      RETURNING id, email, clerk_user_id
    `

    if (!updatedUser) {
      console.error('[EMAIL_VERIFICATION] Atomic update failed - concurrent modification?')
      return
    }

    // Update Clerk to set as primary email address
    try {
      const clerk = await clerkClient()
      await clerk.users.updateUser(clerkUserId, {
        primaryEmailAddressId: emailId,
      })
      
      console.log('[EMAIL_VERIFICATION] Updated primary email in Clerk')
    } catch (clerkError: any) {
      console.error('[EMAIL_VERIFICATION] Failed to update Clerk primary email:', {
        error: clerkError.message,
        clerk_user_id: clerkUserId,
        email_id: emailId
      })
      // Don't rollback DB - email is verified, just log the Clerk sync issue
    }

    console.log('[EMAIL_VERIFICATION] Email verification completed successfully:', {
      user_id: updatedUser.id,
      new_email: updatedUser.email
    })

    // TODO: Send notification email to old address about email change
    // TODO: Trigger user notification in app
  } catch (error: any) {
    console.error('[EMAIL_VERIFICATION] Error handling verification success:', {
      error: error.message,
      code: error.code,
      clerk_user_id: clerkUserId
    })
  }
}

/**
 * Handles failed or expired email verification
 */
async function handleEmailVerificationFailure(
  clerkUserId: string,
  emailId: string,
  reason: 'expired' | 'failed'
) {
  try {
    const [user] = await sql`
      SELECT id, pending_email, email_verification_token
      FROM users_sync
      WHERE clerk_user_id = ${clerkUserId}
        AND email_verification_token = ${emailId}
        AND deleted_at IS NULL
    `

    if (!user) {
      console.log('[EMAIL_VERIFICATION] No matching pending verification found')
      return
    }

    console.log('[EMAIL_VERIFICATION] Reverting pending email due to', reason, {
      user_id: user.id,
      pending_email: user.pending_email
    })

    // Revert pending email
    await sql`
      UPDATE users_sync
      SET pending_email = NULL,
          email_verification_status = ${reason},
          email_verification_token = NULL,
          email_verification_expiry = NULL,
          updated_at = NOW()
      WHERE id = ${user.id} AND deleted_at IS NULL
    `

    console.log('[EMAIL_VERIFICATION] Reverted pending email')

    // TODO: Send notification to user about failed verification
  } catch (error: any) {
    console.error('[EMAIL_VERIFICATION] Error handling verification failure:', error)
  }
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

    if (type === "user.created") {
      const clerkId = data.id as string
      const email = data.email_addresses?.[0]?.email_address || data.primary_email_address?.email_address || ""
      const name = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ") || "User"
      await createUserFromClerk(clerkId, email, name)
    } else if (type === "user.updated") {
      const clerkId = data.id as string
      const email = data.email_addresses?.[0]?.email_address || data.primary_email_address?.email_address
      const name = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ")
      await updateUserFromClerk(clerkId, { email, name })
    } else if (type === "user.deleted") {
      const clerkId = data.id as string
      await deleteUserByClerkId(clerkId)
    } else if (type === "email.created") {
      // Email address added to user account
      const clerkUserId = data.user_id as string
      const emailId = data.id as string
      const emailAddress = data.email_address as string
      const verified = data.verification?.status === "verified"
      
      console.log('[CLERK_WEBHOOK] email.created:', {
        clerk_user_id: clerkUserId,
        email_id: emailId,
        email: emailAddress,
        verified
      })
      
      // Store email ID for tracking if not verified yet
      if (!verified) {
        await sql`
          UPDATE users_sync
          SET email_verification_token = ${emailId}
          WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
        `
      }
    } else if (type === "email.updated") {
      // Email verification status changed
      const emailId = data.id as string
      const emailAddress = data.email_address as string
      const verified = data.verification?.status === "verified"
      const clerkUserId = data.user_id as string
      
      console.log('[CLERK_WEBHOOK] email.updated:', {
        email_id: emailId,
        email: emailAddress,
        verified,
        verification_status: data.verification?.status,
        clerk_user_id: clerkUserId
      })
      
      if (verified) {
        // Email has been verified - atomically move pending_email to email
        await handleEmailVerificationSuccess(clerkUserId, emailId, emailAddress)
      }
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

