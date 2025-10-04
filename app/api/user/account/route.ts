import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { deleteUserByClerkId } from '@/lib/db'

export async function DELETE() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete in database (sets deleted_at timestamp)
    await deleteUserByClerkId(userId)

    // Note: Subscription cancellation should happen in Polar/Stripe portal
    // The user should cancel there first, then delete account

    // Delete from Clerk (this will trigger sign out)
    const clerk = await clerkClient()
    await clerk.users.deleteUser(userId)

    return NextResponse.json({ 
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
