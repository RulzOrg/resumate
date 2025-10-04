import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { duplicateResume, getOrCreateUser } from '@/lib/db'

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
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get new title from request body
    const body = await request.json()
    const newTitle = body.newTitle || 'Resume Copy'

    // Duplicate the resume
    const duplicate = await duplicateResume(params.id, user.id, newTitle)

    return NextResponse.json({ resume: duplicate }, { status: 201 })
  } catch (error) {
    console.error('Error duplicating resume:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate resume' },
      { status: 500 }
    )
  }
}
