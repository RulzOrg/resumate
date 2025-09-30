/**
 * GET /api/resumes/[id]/status
 * Poll resume processing status for background job progress
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

function getProgressInfo(status: string) {
  switch (status) {
    case "pending":
      return { progress: 10, message: "Queued for processing..." }
    case "processing":
      return { progress: 50, message: "Extracting and analyzing content..." }
    case "completed":
      return { progress: 100, message: "Ready!" }
    case "failed":
      return { progress: 0, message: "Processing failed" }
    default:
      return { progress: 0, message: "Unknown status" }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resume = await prisma.resume.findFirst({
      where: {
        id: params.id,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        processingStatus: true,
        processingError: true,
        warnings: true,
        modeUsed: true,
        pageCount: true,
        truncated: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    const progressInfo = getProgressInfo(resume.processingStatus)

    return NextResponse.json({
      id: resume.id,
      status: resume.processingStatus,
      error: resume.processingError,
      warnings: resume.warnings || [],
      mode: resume.modeUsed,
      pageCount: resume.pageCount,
      truncated: resume.truncated,
      progress: progressInfo.progress,
      message: progressInfo.message,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    })
  } catch (error) {
    console.error("[StatusAPI] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
