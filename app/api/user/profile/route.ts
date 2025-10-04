import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { 
  getOrCreateUser, 
  updateUserBasicInfo, 
  updateUserProfilePreferences 
} from '@/lib/db'

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, timezone, job_focus } = body

    // Get user
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update basic info (name, email)
    if (name !== undefined || email !== undefined) {
      await updateUserBasicInfo(user.id, { name, email })
    }

    // Update profile preferences (timezone, job_focus)
    if (timezone !== undefined || job_focus !== undefined) {
      await updateUserProfilePreferences(userId, { 
        timezone, 
        job_focus 
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Profile updated successfully' 
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
