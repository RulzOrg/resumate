import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, deleteJobAnalysis } from "@/lib/db"
import { handleApiError, AppError } from "@/lib/error-handler"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      throw new AppError("Job analysis ID is required", 400)
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      throw new AppError("Unable to verify user account", 500)
    }

    const deleted = await deleteJobAnalysis(id, user.id)
    if (!deleted) {
      throw new AppError("Job analysis not found", 404)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const info = handleApiError(error)
    return NextResponse.json({ error: info.error, code: info.code }, { status: info.statusCode })
  }
}

