import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateUser, updateResumeAnalysis, updateResume } from '@/lib/db'

export async function PATCH(
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

    // Parse request body
    const body = await request.json()
    const { title, content_text, parsed_sections } = body

    // Update resume content and parsed sections
    await updateResumeAnalysis(params.id, user.id, {
      content_text: content_text || '',
      parsed_sections: parsed_sections || {},
      processing_status: 'completed'
    })

    // Update title separately
    if (title) {
      await updateResume(params.id, user.id, { title })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating resume:', error)
    return NextResponse.json(
      { error: 'Failed to update resume' },
      { status: 500 }
    )
  }
}
