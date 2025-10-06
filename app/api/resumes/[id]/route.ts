import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { getOrCreateUser, getResumeById, updateResumeFieldsAtomic, deleteResume } from '@/lib/db'
import { ParsedResumeSchema } from '@/lib/schemas'

// Validation schema for PATCH request body
const UpdateResumeSchema = z.object({
  title: z
    .string()
    .min(1, 'Title must not be empty')
    .max(200, 'Title must not exceed 200 characters')
    .optional(),
  content_text: z.string().optional(),
  parsed_sections: ParsedResumeSchema.optional(),
})

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
    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = UpdateResumeSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      return NextResponse.json(
        { error: 'Invalid request body', details: errors },
        { status: 400 }
      )
    }

    const { title, content_text, parsed_sections } = validationResult.data

    // Verify resume exists and belongs to user
    const existingResume = await getResumeById(params.id, user.id)
    if (!existingResume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    // Update all fields atomically in a single database operation
    const updatedResume = await updateResumeFieldsAtomic(params.id, user.id, {
      content_text: content_text || '',
      parsed_sections: parsed_sections || {},
      processing_status: 'completed',
      title: title
    })

    if (!updatedResume) {
      return NextResponse.json(
        { error: 'Failed to update resume' },
        { status: 500 }
      )
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const resume = await deleteResume(params.id, user.id)
    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resume:', error)
    return NextResponse.json({ error: 'Failed to delete resume' }, { status: 500 })
  }
}
