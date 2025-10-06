import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { userId, sessionId: currentSessionId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent revoking current session via this endpoint
    if (params.sessionId === currentSessionId) {
      return NextResponse.json(
        { error: 'Cannot revoke current session. Use sign out instead.' },
        { status: 400 }
      )
    }

    // Revoke the session using Clerk
    const client = await clerkClient()
    await client.sessions.revokeSession(params.sessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking session:', error)
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    )
  }
}

