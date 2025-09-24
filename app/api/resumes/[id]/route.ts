import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, deleteResume, getResumeById } from "@/lib/db"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('DELETE request received for resume:', params.id)
  
  try {
    const { userId } = await auth()
    console.log('Auth check:', { userId: userId ? 'present' : 'missing' })
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
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
