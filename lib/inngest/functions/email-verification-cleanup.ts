/**
 * Inngest function for email verification cleanup and timeout handling
 * 
 * This function:
 * 1. Runs periodically (every 6 hours)
 * 2. Finds expired pending email verifications (>24 hours old)
 * 3. Reverts pending_email and clears verification fields
 * 4. Deletes unverified email addresses from Clerk
 * 5. Optionally notifies users about expired verifications
 */

import { inngest } from "../client"
import { sql } from "@/lib/db"
import { clerkClient } from "@clerk/nextjs/server"

export const emailVerificationCleanup = inngest.createFunction(
  {
    id: "email-verification-cleanup",
    name: "Email Verification Cleanup",
    // Run every 6 hours
    cron: "0 */6 * * *",
  },
  { event: "email.verification.cleanup" },
  async ({ step }) => {
    // Step 1: Find expired pending email verifications
    const expiredVerifications = await step.run("find-expired-verifications", async () => {
      const now = new Date()
      
      const expired = await sql`
        SELECT 
          id,
          clerk_user_id,
          email,
          pending_email,
          email_verification_token,
          email_verification_expiry
        FROM users_sync
        WHERE email_verification_status = 'pending_verification'
          AND pending_email IS NOT NULL
          AND email_verification_expiry IS NOT NULL
          AND email_verification_expiry < ${now.toISOString()}
          AND deleted_at IS NULL
      `

      console.log('[EMAIL_CLEANUP] Found expired verifications:', {
        count: expired.length,
        timestamp: now.toISOString()
      })

      return expired
    })

    if (expiredVerifications.length === 0) {
      return { 
        success: true, 
        message: "No expired verifications found",
        processed: 0
      }
    }

    // Step 2: Process each expired verification
    const results = await Promise.all(
      expiredVerifications.map(async (user) => {
        return await step.run(`revert-${user.id}`, async () => {
          try {
            console.log('[EMAIL_CLEANUP] Processing expired verification:', {
              user_id: user.id,
              clerk_user_id: user.clerk_user_id,
              pending_email: user.pending_email,
              expiry: user.email_verification_expiry
            })

            // Delete unverified email from Clerk if token exists
            if (user.email_verification_token) {
              try {
                const clerk = await clerkClient()
                await clerk.emailAddresses.deleteEmailAddress(user.email_verification_token)
                
                console.log('[EMAIL_CLEANUP] Deleted unverified email from Clerk:', {
                  email_id: user.email_verification_token,
                  user_id: user.id
                })
              } catch (clerkError: any) {
                console.warn('[EMAIL_CLEANUP] Failed to delete from Clerk (may not exist):', {
                  error: clerkError.message,
                  email_id: user.email_verification_token
                })
                // Continue even if Clerk deletion fails
              }
            }

            // Revert pending email in database
            const [reverted] = await sql`
              UPDATE users_sync
              SET pending_email = NULL,
                  email_verification_status = 'expired',
                  email_verification_token = NULL,
                  email_verification_expiry = NULL,
                  updated_at = NOW()
              WHERE id = ${user.id} 
                AND email_verification_status = 'pending_verification'
                AND deleted_at IS NULL
              RETURNING id, email, clerk_user_id
            `

            if (!reverted) {
              console.warn('[EMAIL_CLEANUP] User not found or already processed:', {
                user_id: user.id
              })
              return { 
                success: false, 
                userId: user.id, 
                error: 'User not found or already processed' 
              }
            }

            console.log('[EMAIL_CLEANUP] Successfully reverted expired verification:', {
              user_id: reverted.id,
              email: reverted.email
            })

            // TODO: Send notification to user about expired verification
            // Could use email service or in-app notification here

            return { 
              success: true, 
              userId: user.id,
              pendingEmail: user.pending_email
            }
          } catch (error: any) {
            console.error('[EMAIL_CLEANUP] Error processing user:', {
              user_id: user.id,
              error: error.message,
              code: error.code
            })

            return { 
              success: false, 
              userId: user.id, 
              error: error.message 
            }
          }
        })
      })
    )

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log('[EMAIL_CLEANUP] Cleanup completed:', {
      total: expiredVerifications.length,
      successful: successCount,
      failed: failureCount
    })

    return {
      success: true,
      message: `Processed ${expiredVerifications.length} expired verifications`,
      processed: successCount,
      failed: failureCount,
      results
    }
  }
)

/**
 * Manual trigger function for immediate cleanup
 * Can be called via API or admin interface
 */
export const emailVerificationCleanupManual = inngest.createFunction(
  {
    id: "email-verification-cleanup-manual",
    name: "Email Verification Cleanup (Manual)",
  },
  { event: "email.verification.cleanup.manual" },
  async ({ step }) => {
    // Reuse the same logic as cron job
    return await emailVerificationCleanup.handler({ step } as any)
  }
)

