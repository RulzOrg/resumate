import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all sessions for the user from Clerk
    const client = await clerkClient()
    const sessions = await client.users.getUserList({
      userId: [userId]
    }).then(async (users) => {
      if (users.data.length === 0) return []
      const user = users.data[0]
      // Get sessions using the sessions API
      const sessionList = await client.sessions.getSessionList({
        userId: userId
      })
      return sessionList.data
    })

    // Format sessions for frontend
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      status: session.status,
      lastActiveAt: session.lastActiveAt,
      expireAt: session.expireAt,
      abandonAt: session.abandonAt,
      clientId: session.clientId,
      // Parse user agent for display
      userAgent: parseUserAgent(session.lastActiveToken?.userAgent || 'Unknown'),
      ipAddress: session.lastActiveToken?.ipAddress || 'Unknown',
      city: session.lastActiveToken?.city || null,
      country: session.lastActiveToken?.country || null,
    }))

    return NextResponse.json({ sessions: formattedSessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

function parseUserAgent(userAgent: string): { browser: string; os: string; device: string } {
  // Simple user agent parsing
  let browser = 'Unknown Browser'
  let os = 'Unknown OS'
  let device = 'Desktop'

  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome'
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari'
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox'
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge'
  }

  // Detect OS
  if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) {
    os = 'macOS'
  } else if (userAgent.includes('Windows')) {
    os = 'Windows'
  } else if (userAgent.includes('Linux')) {
    os = 'Linux'
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS'
    device = userAgent.includes('iPad') ? 'Tablet' : 'Mobile'
  } else if (userAgent.includes('Android')) {
    os = 'Android'
    device = 'Mobile'
  }

  return { browser, os, device }
}

