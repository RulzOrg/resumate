import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, deleteResume, getResumeById, updateResume } from "@/lib/db"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resumeId = params.id
    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Check if resume exists and belongs to the user
    const resume = await getResumeById(resumeId, user.id)
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    // Update the resume title
    const updatedResume = await updateResume(resumeId, user.id, { title: title.trim() })
    if (!updatedResume) {
      return NextResponse.json({ error: "Failed to update resume" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "Resume updated successfully",
      resume: updatedResume 
    })
  } catch (error) {
    console.error("Error updating resume:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('DELETE request received for resume:', params.id)
  
  try {
    const { userId } = await auth()
    console.log('Auth check:', { userId: userId ? 'present' : 'missing' })
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    console.log('User lookup:', { userId: user?.id, found: !!user })
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resumeId = params.id
    console.log('Looking for resume:', { resumeId, userId: user.id })

    // Check if resume exists and belongs to the user
    const resume = await getResumeById(resumeId, user.id)
    console.log('Resume found:', { found: !!resume, fileName: resume?.file_name })
    
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    console.log(`Deleting resume: ${resume.file_name} (${resumeId}) for user ${user.id}`)

    // Delete the resume (soft delete)
    const deletedResume = await deleteResume(resumeId, user.id)
    console.log('Delete operation result:', { success: !!deletedResume })
    
    if (!deletedResume) {
      return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 })
    }

    console.log(`Resume deleted successfully: ${deletedResume.file_name}`)
    return NextResponse.json({ 
      success: true,
      message: "Resume deleted successfully",
      resume: deletedResume 
    })
  } catch (error) {
    console.error("Error deleting resume:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
