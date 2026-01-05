import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOptimizedResumeById, updateOptimizedResume, getOrCreateUser } from "@/lib/db"
import { handleApiError, AppError } from "@/lib/error-handler"
import type { ParsedResume } from "@/lib/resume-parser"
import { formatResumeToMarkdown } from "@/lib/resume-formatter"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    const { id } = await params
    const optimized = await getOptimizedResumeById(id, user.id)

    if (!optimized) {
      throw new AppError("Optimized resume not found", 404)
    }

    return NextResponse.json({ optimized_resume: optimized })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    const { id } = await params
    const body = await request.json()

    // Get existing resume to verify ownership
    const existing = await getOptimizedResumeById(id, user.id)
    if (!existing) {
      throw new AppError("Optimized resume not found", 404)
    }

    // Convert parsed resume data to markdown
    let optimizedContent = existing.optimized_content
    if (body.resumeData) {
      optimizedContent = formatResumeToMarkdown(body.resumeData as ParsedResume)
    }

    // Update the resume
    const updated = await updateOptimizedResume(id, user.id, {
      optimized_content: optimizedContent,
      match_score: body.match_score,
    })

    if (!updated) {
      throw new AppError("Failed to update resume", 500)
    }

    return NextResponse.json({
      success: true,
      optimized_resume: updated,
    })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
