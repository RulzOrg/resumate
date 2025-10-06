import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { duplicateResume, getOrCreateUser, getResumeById } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get new title from request body
    const body = await request.json()
    const newTitle = body.newTitle || 'Resume Copy'

    // Check ownership before duplicating
    const originalResume = await getResumeById(params.id, user.id)
    if (!originalResume) {
      return NextResponse.json(
        { error: 'Resume not found or access denied' },
        { status: 404 }
      )
    }

    // Duplicate the resume
    const duplicate = await duplicateResume(params.id, user.id, newTitle)

    if (!duplicate) {
      return NextResponse.json(
        { error: 'Failed to create duplicate' },
        { status: 500 }
      )
    }

    return NextResponse.json({ resume: duplicate }, { status: 201 })
  } catch (error) {
    console.error('Error duplicating resume:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate resume' },
      { status: 500 }
    )
  }
}
