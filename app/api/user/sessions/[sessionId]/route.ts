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

    // Fetch and verify session ownership before revoking
    const client = await clerkClient()
    
    // Get the target session to verify it exists and belongs to this user
    const targetSession = await client.sessions.getSession(params.sessionId)
    
    if (!targetSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify the session belongs to the authenticated user
    if (targetSession.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot revoke another user\'s session' },
        { status: 403 }
      )
    }

    // Revoke the session only after ownership is verified
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

