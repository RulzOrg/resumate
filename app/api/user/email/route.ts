import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { sql, getOrCreateUser } from '@/lib/db'

/**
 * POST /api/user/email
 * Initiates an email change request
 * 
 * Flow:
 * 1. Validate new email format
 * 2. Store new email in pending_email field (not primary email)
 * 3. Call Clerk API to create email address and request verification
 * 4. Mark status as pending_verification
 * 5. Set expiry timestamp (24 hours)
 * 6. Return success with pending status
 * 
 * Error handling:
 * - If Clerk API fails, rollback DB pending_email
 * - If duplicate email, return error
 * - If no user found, return 401
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email: newEmail } = body

    // Validate email format
    if (!newEmail || !isValidEmail(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if email is same as current
    if (user.email === newEmail) {
      return NextResponse.json(
        { error: 'New email is the same as current email' },
        { status: 400 }
      )
    }

    // Check if there's already a pending email change
    const [existingPending] = await sql`
      SELECT pending_email, email_verification_status
      FROM users_sync
      WHERE id = ${user.id} AND deleted_at IS NULL
    `

    if (existingPending?.pending_email && existingPending?.email_verification_status === 'pending_verification') {
      return NextResponse.json(
        { 
          error: 'Email change already in progress',
          pendingEmail: existingPending.pending_email
        },
        { status: 409 }
      )
    }

    // Check if new email is already in use
    const [emailInUse] = await sql`
      SELECT id FROM users_sync
      WHERE (email = ${newEmail} OR pending_email = ${newEmail})
        AND deleted_at IS NULL
        AND id != ${user.id}
    `

    if (emailInUse) {
      return NextResponse.json(
        { error: 'Email address is already in use' },
        { status: 409 }
      )
    }

    // Calculate expiry (24 hours from now)
    const expiryDate = new Date()
    expiryDate.setHours(expiryDate.getHours() + 24)

    // Step 1: Store pending email in database FIRST
    try {
      await sql`
        UPDATE users_sync
        SET pending_email = ${newEmail},
            email_verification_status = 'pending_verification',
            email_verification_expiry = ${expiryDate.toISOString()},
            updated_at = NOW()
        WHERE id = ${user.id} AND deleted_at IS NULL
      `
      
      console.log('[EMAIL_CHANGE] Stored pending email in database:', {
        user_id: user.id,
        clerk_user_id: userId,
        pending_email: newEmail,
        expiry: expiryDate.toISOString()
      })
    } catch (dbError: any) {
      console.error('[EMAIL_CHANGE] Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to initiate email change' },
        { status: 500 }
      )
    }

    // Step 2: Call Clerk API to create email address and request verification
    let clerkEmailId: string | undefined
    try {
      const clerk = await clerkClient()
      
      // Create the email address in Clerk
      const emailAddress = await clerk.emailAddresses.createEmailAddress({
        userId: userId,
        emailAddress: newEmail,
        verified: false,
      })

      clerkEmailId = emailAddress.id
      
      console.log('[EMAIL_CHANGE] Created email address in Clerk:', {
        clerk_email_id: emailAddress.id,
        email: newEmail,
        verified: emailAddress.verification?.status
      })

      // Store the Clerk email ID as verification token
      await sql`
        UPDATE users_sync
        SET email_verification_token = ${emailAddress.id},
            updated_at = NOW()
        WHERE id = ${user.id} AND deleted_at IS NULL
      `

      // Prepare the email verification (Clerk will send the verification email)
      await clerk.emailAddresses.update(emailAddress.id, {
        verified: false,
      })

      console.log('[EMAIL_CHANGE] Email verification initiated in Clerk')

      return NextResponse.json({
        success: true,
        message: 'Verification email sent',
        pendingEmail: newEmail,
        status: 'pending_verification',
        expiresAt: expiryDate.toISOString(),
        note: 'Please check your email and click the verification link. You can continue using your account with the old email until verification is complete.'
      })
    } catch (clerkError: any) {
      // Rollback: Clear pending email from database since Clerk failed
      console.error('[EMAIL_CHANGE] Clerk API error, rolling back:', {
        error: clerkError.message,
        status: clerkError.status,
        clerk_user_id: userId
      })

      try {
        await sql`
          UPDATE users_sync
          SET pending_email = NULL,
              email_verification_status = 'verified',
              email_verification_token = NULL,
              email_verification_expiry = NULL,
              updated_at = NOW()
          WHERE id = ${user.id} AND deleted_at IS NULL
        `
        
        console.log('[EMAIL_CHANGE] Rolled back pending email in database')
      } catch (rollbackError: any) {
        console.error('[EMAIL_CHANGE] Rollback failed:', rollbackError)
      }

      // Determine error message based on Clerk error
      let errorMessage = 'Failed to send verification email'
      if (clerkError.status === 422) {
        errorMessage = 'Email address is invalid or already in use'
      } else if (clerkError.status === 429) {
        errorMessage = 'Too many requests. Please try again later'
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          details: clerkError.message 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[EMAIL_CHANGE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/email
 * Get current email verification status
 */
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const [status] = await sql`
      SELECT 
        email,
        pending_email,
        email_verification_status,
        email_verification_expiry
      FROM users_sync
      WHERE id = ${user.id} AND deleted_at IS NULL
    `

    return NextResponse.json({
      currentEmail: status.email,
      pendingEmail: status.pending_email,
      status: status.email_verification_status,
      expiresAt: status.email_verification_expiry
    })
  } catch (error: any) {
    console.error('[EMAIL_STATUS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get email status' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user/email
 * Cancel pending email change
 */
export async function DELETE() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get pending email info
    const [pending] = await sql`
      SELECT pending_email, email_verification_token
      FROM users_sync
      WHERE id = ${user.id} AND deleted_at IS NULL
    `

    if (!pending?.pending_email) {
      return NextResponse.json(
        { error: 'No pending email change' },
        { status: 404 }
      )
    }

    // Delete the email address from Clerk if it exists
    if (pending.email_verification_token) {
      try {
        const clerk = await clerkClient()
        await clerk.emailAddresses.deleteEmailAddress(pending.email_verification_token)
        console.log('[EMAIL_CANCEL] Deleted email from Clerk:', {
          email_id: pending.email_verification_token
        })
      } catch (clerkError: any) {
        console.warn('[EMAIL_CANCEL] Failed to delete from Clerk (may not exist):', clerkError.message)
      }
    }

    // Clear pending email from database
    await sql`
      UPDATE users_sync
      SET pending_email = NULL,
          email_verification_status = 'verified',
          email_verification_token = NULL,
          email_verification_expiry = NULL,
          updated_at = NOW()
      WHERE id = ${user.id} AND deleted_at IS NULL
    `

    console.log('[EMAIL_CANCEL] Cancelled pending email change:', {
      user_id: user.id,
      cancelled_email: pending.pending_email
    })

    return NextResponse.json({
      success: true,
      message: 'Email change cancelled'
    })
  } catch (error: any) {
    console.error('[EMAIL_CANCEL] Error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel email change' },
      { status: 500 }
    )
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

