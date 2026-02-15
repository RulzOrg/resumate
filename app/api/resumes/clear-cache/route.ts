import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { clearParsedStructure, getOrCreateUser, getResumeById } from "@/lib/db"
import { errorResponse, fromError } from "@/lib/api-response"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return errorResponse(401, "UNAUTHORIZED", "Unauthorized", { retryable: false })
    }

    const { resume_id } = await request.json()

    if (!resume_id) {
      return errorResponse(400, "MISSING_RESUME_ID", "resume_id is required", { retryable: false })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return errorResponse(404, "USER_NOT_FOUND", "User not found", { retryable: false })
    }

    const resume = await getResumeById(resume_id, user.id)
    if (!resume) {
      return errorResponse(404, "RESUME_NOT_FOUND", "Resume not found", { retryable: false })
    }

    await clearParsedStructure(resume_id)

    return NextResponse.json({
      success: true,
      message: `Cache cleared for resume ${resume_id}. Next optimization will re-extract.`,
    })
  } catch (error) {
    return fromError(error)
  }
}
