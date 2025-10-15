import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, getOrCreateUser } from "@/lib/db"
import { indexResume } from "@/lib/resume-indexer"
import { AppError, handleApiError } from "@/lib/error-handler"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const resumeId = params.id
    const resume = await getResumeById(resumeId, user.id)

    if (!resume) {
      throw new AppError("Resume not found", 404)
    }

    if (!resume.content_text || resume.content_text.length < 50) {
      throw new AppError(
        "Resume content is too short or missing. Please re-upload the resume.",
        400
      )
    }

    // Index the resume
    console.log(`[reindex] Starting indexing for resume ${resumeId}...`)
    const result = await indexResume({
      resumeId: resume.id,
      userId: user.id,
      content: resume.content_text,
      metadata: {
        file_name: resume.file_name,
        file_type: resume.file_type,
        title: resume.title,
        reindexed_at: new Date().toISOString()
      }
    })

    if (!result.success) {
      throw new AppError(
        `Indexing failed: ${result.error}`,
        500
      )
    }

    console.log(`[reindex] ✓ Successfully indexed resume ${resumeId}: ${result.chunksIndexed} chunks`)

    return NextResponse.json({
      success: true,
      message: `Resume indexed successfully: ${result.chunksIndexed} chunks`,
      chunksIndexed: result.chunksIndexed,
      resumeId: resume.id
    })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
