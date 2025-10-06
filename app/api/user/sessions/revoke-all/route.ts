import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function POST() {
  try {
    const { userId, sessionId: currentSessionId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all sessions for the user
    const client = await clerkClient()
    const sessions = await client.sessions.getSessionList({
      userId: userId
    })

    // Revoke all sessions except the current one
    const revokePromises = sessions.data
      .filter(session => session.id !== currentSessionId && session.status === 'active')
      .map(session => client.sessions.revokeSession(session.id))

    await Promise.all(revokePromises)

    return NextResponse.json({ 
      success: true, 
      revokedCount: revokePromises.length 
    })
  } catch (error) {
    console.error('Error revoking sessions:', error)
    return NextResponse.json(
      { error: 'Failed to revoke sessions' },
      { status: 500 }
    )
  }
}

