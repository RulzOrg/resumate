import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { deleteOptimizedResume, getOrCreateUser } from "@/lib/db"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resumeId = params.id
    const deletedResume = await deleteOptimizedResume(resumeId, user.id)

    if (!deletedResume) {
      return NextResponse.json({ error: "Optimized resume not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Optimized resume deleted successfully" })
  } catch (error) {
    console.error("Error deleting optimized resume:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resumeId = params.id
    const { getOptimizedResumeById } = await import("@/lib/db")
    const optimizedResume = await getOptimizedResumeById(resumeId, user.id)

    if (!optimizedResume) {
      return NextResponse.json({ error: "Optimized resume not found" }, { status: 404 })
    }

    return NextResponse.json({ optimized_resume: optimizedResume })
  } catch (error) {
    console.error("Error fetching optimized resume:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
