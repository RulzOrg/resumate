/**
 * Email Verification Utility Functions
 * 
 * Helper functions for managing email verification flow
 */

import { sql } from './db'

export interface PendingEmailStatus {
  userId: string
  clerkUserId: string
  currentEmail: string
  pendingEmail: string | null
  status: 'verified' | 'pending_verification' | 'expired' | 'failed'
  verificationToken: string | null
  expiresAt: Date | null
}

/**
 * Get email verification status for a user
 */
export async function getEmailVerificationStatus(
  clerkUserId: string
): Promise<PendingEmailStatus | null> {
  const [user] = await sql`
    SELECT 
      id as user_id,
      clerk_user_id,
      email as current_email,
      pending_email,
      email_verification_status as status,
      email_verification_token as verification_token,
      email_verification_expiry as expires_at
    FROM users_sync
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
  `

  if (!user) {
    return null
  }

  return {
    userId: user.user_id,
    clerkUserId: user.clerk_user_id,
    currentEmail: user.current_email,
    pendingEmail: user.pending_email,
    status: user.status,
    verificationToken: user.verification_token,
    expiresAt: user.expires_at ? new Date(user.expires_at) : null,
  }
}

/**
 * Check if user has a pending email verification
 */
export async function hasPendingEmailVerification(
  clerkUserId: string
): Promise<boolean> {
  const [result] = await sql`
    SELECT 1 as has_pending
    FROM users_sync
    WHERE clerk_user_id = ${clerkUserId}
      AND pending_email IS NOT NULL
      AND email_verification_status = 'pending_verification'
      AND deleted_at IS NULL
  `

  return !!result
}

/**
 * Check if email is already in use (in email or pending_email)
 */
export async function isEmailInUse(
  email: string,
  excludeUserId?: string
): Promise<boolean> {
  const [result] = await sql`
    SELECT 1 as in_use
    FROM users_sync
    WHERE (email = ${email} OR pending_email = ${email})
      AND deleted_at IS NULL
      ${excludeUserId ? sql`AND id != ${excludeUserId}` : sql``}
  `

  return !!result
}

/**
 * Set pending email for user
 * Returns verification token and expiry
 */
export async function setPendingEmail(
  userId: string,
  pendingEmail: string,
  verificationToken: string,
  expiryHours: number = 24
): Promise<{ success: boolean; expiresAt: Date }> {
  const expiryDate = new Date()
  expiryDate.setHours(expiryDate.getHours() + expiryHours)

  try {
    await sql`
      UPDATE users_sync
      SET pending_email = ${pendingEmail},
          email_verification_status = 'pending_verification',
          email_verification_token = ${verificationToken},
          email_verification_expiry = ${expiryDate.toISOString()},
          updated_at = NOW()
      WHERE id = ${userId} AND deleted_at IS NULL
    `

    return { success: true, expiresAt: expiryDate }
  } catch (error) {
    console.error('[EMAIL_VERIFICATION] Failed to set pending email:', error)
    return { success: false, expiresAt: expiryDate }
  }
}

/**
 * Clear pending email (for cancellation or after success)
 */
export async function clearPendingEmail(
  userId: string,
  newStatus: 'verified' | 'expired' | 'failed' = 'verified'
): Promise<boolean> {
  try {
    await sql`
      UPDATE users_sync
      SET pending_email = NULL,
          email_verification_status = ${newStatus},
          email_verification_token = NULL,
          email_verification_expiry = NULL,
          updated_at = NOW()
      WHERE id = ${userId} AND deleted_at IS NULL
    `

    return true
  } catch (error) {
    console.error('[EMAIL_VERIFICATION] Failed to clear pending email:', error)
    return false
  }
}

/**
 * Atomically move pending_email to email
 * Only succeeds if pending_email matches expected value
 */
export async function commitPendingEmail(
  userId: string,
  expectedPendingEmail: string
): Promise<{ success: boolean; newEmail?: string }> {
  try {
    const [updatedUser] = await sql`
      UPDATE users_sync
      SET email = ${expectedPendingEmail},
          pending_email = NULL,
          email_verification_status = 'verified',
          email_verification_token = NULL,
          email_verification_expiry = NULL,
          updated_at = NOW()
      WHERE id = ${userId}
        AND pending_email = ${expectedPendingEmail}
        AND email_verification_status = 'pending_verification'
        AND deleted_at IS NULL
      RETURNING id, email
    `

    if (!updatedUser) {
      return { success: false }
    }

    return { success: true, newEmail: updatedUser.email }
  } catch (error: any) {
    console.error('[EMAIL_VERIFICATION] Failed to commit pending email:', error)
    
    // Check for unique constraint violation
    if (error.code === '23505') {
      console.error('[EMAIL_VERIFICATION] Email already in use')
    }
    
    return { success: false }
  }
}

/**
 * Get all expired pending email verifications
 */
export async function getExpiredPendingEmails(): Promise<Array<{
  userId: string
  clerkUserId: string
  pendingEmail: string
  verificationToken: string | null
  expiresAt: Date
}>> {
  const now = new Date()
  
  const expired = await sql`
    SELECT 
      id as user_id,
      clerk_user_id,
      pending_email,
      email_verification_token as verification_token,
      email_verification_expiry as expires_at
    FROM users_sync
    WHERE email_verification_status = 'pending_verification'
      AND pending_email IS NOT NULL
      AND email_verification_expiry IS NOT NULL
      AND email_verification_expiry < ${now.toISOString()}
      AND deleted_at IS NULL
  `

  return expired.map(row => ({
    userId: row.user_id,
    clerkUserId: row.clerk_user_id,
    pendingEmail: row.pending_email,
    verificationToken: row.verification_token,
    expiresAt: new Date(row.expires_at),
  }))
}

/**
 * Mark verification as expired and clear pending email
 */
export async function markVerificationExpired(userId: string): Promise<boolean> {
  return clearPendingEmail(userId, 'expired')
}

/**
 * Mark verification as failed and clear pending email
 */
export async function markVerificationFailed(userId: string): Promise<boolean> {
  return clearPendingEmail(userId, 'failed')
}

/**
 * Get user by verification token (for webhook lookup)
 */
export async function getUserByVerificationToken(
  verificationToken: string
): Promise<{
  userId: string
  clerkUserId: string
  pendingEmail: string
} | null> {
  const [user] = await sql`
    SELECT 
      id as user_id,
      clerk_user_id,
      pending_email
    FROM users_sync
    WHERE email_verification_token = ${verificationToken}
      AND email_verification_status = 'pending_verification'
      AND deleted_at IS NULL
  `

  if (!user || !user.pending_email) {
    return null
  }

  return {
    userId: user.user_id,
    clerkUserId: user.clerk_user_id,
    pendingEmail: user.pending_email,
  }
}

