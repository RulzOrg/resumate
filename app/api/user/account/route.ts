import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { deleteUserByClerkId } from '@/lib/db'
import { getCurrentSubscription } from '@/lib/subscription'

export async function DELETE() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      console.warn('[DELETE /api/user/account] Unauthorized deletion attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[DELETE /api/user/account] Checking subscription status for user: ${userId}`)
    
    // Check subscription status before allowing account deletion
    const subscription = await getCurrentSubscription()
    
    if (!subscription) {
      console.error(`[DELETE /api/user/account] Failed to retrieve subscription for user: ${userId}`)
      return NextResponse.json(
        { error: 'Unable to verify subscription status. Please try again.' },
        { status: 500 }
      )
    }

    console.log(`[DELETE /api/user/account] User ${userId} subscription status: ${subscription.status}, plan: ${subscription.plan}`)

    // Prevent deletion if user has active or trialing subscription
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      console.warn(
        `[DELETE /api/user/account] Blocked deletion attempt for user ${userId} with ${subscription.status} subscription (plan: ${subscription.plan})`
      )
      
      return NextResponse.json(
        { 
          error: 'Cannot delete account with active subscription',
          message: 'Please cancel your subscription before deleting your account. You can manage your subscription in the Settings page under the Subscription tab.',
          subscription: {
            status: subscription.status,
            plan: subscription.plan,
            periodEnd: subscription.periodEnd?.toISOString()
          }
        },
        { status: 409 }
      )
    }

    console.log(`[DELETE /api/user/account] Proceeding with deletion for user: ${userId} (subscription status: ${subscription.status})`)

    // Delete from Clerk first (this will trigger sign out)
    console.log(`[DELETE /api/user/account] Deleting user from Clerk: ${userId}`)
    const clerk = await clerkClient()
    await clerk.users.deleteUser(userId)
    console.log(`[DELETE /api/user/account] Successfully deleted user from Clerk: ${userId}`)

    // Soft delete in database only after Clerk deletion succeeds (sets deleted_at timestamp)
    console.log(`[DELETE /api/user/account] Soft deleting user in database: ${userId}`)
    await deleteUserByClerkId(userId)
    console.log(`[DELETE /api/user/account] Successfully soft deleted user in database: ${userId}`)

    return NextResponse.json({ 
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    console.error('[DELETE /api/user/account] Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
