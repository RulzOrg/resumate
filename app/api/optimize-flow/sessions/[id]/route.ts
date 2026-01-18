import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser } from "@/lib/db"
import { handleApiError, AppError } from "@/lib/error-handler"
import {
  getOptimizationSessionById,
  updateOptimizationSession,
  deleteOptimizationSession,
  abandonSession,
} from "@/lib/db/optimization-sessions"
import type { FlowStep } from "@/lib/types/optimize-flow"
import { z } from "zod"

// Schema for updating a session
const UpdateSessionSchema = z.object({
  current_step: z.number().min(1).max(4).optional(),
  status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
  resume_text: z.string().optional(),
  analysis_result: z.any().optional(),
  rewrite_result: z.any().optional(),
  edited_content: z.any().optional(),
  ats_scan_result: z.any().optional(),
  interview_prep_result: z.any().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/optimize-flow/sessions/[id]
 * Get a specific session by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const session = await getOptimizationSessionById(id, user.id)

    if (!session) {
      throw new AppError("Session not found", 404)
    }

    return NextResponse.json({
      success: true,
      session,
    })
  } catch (error) {
    console.error("[Sessions API] GET error:", error)
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}

/**
 * PATCH /api/optimize-flow/sessions/[id]
 * Update a session with new data
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const validationResult = UpdateSessionSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      throw new AppError(`Validation failed: ${errors}`, 400)
    }

    const updateData = validationResult.data

    // Convert to the expected format
    const session = await updateOptimizationSession(id, user.id, {
      current_step: updateData.current_step as FlowStep | undefined,
      status: updateData.status,
      resume_text: updateData.resume_text,
      analysis_result: updateData.analysis_result,
      rewrite_result: updateData.rewrite_result,
      edited_content: updateData.edited_content,
      ats_scan_result: updateData.ats_scan_result,
      interview_prep_result: updateData.interview_prep_result,
    })

    if (!session) {
      throw new AppError("Session not found", 404)
    }

    console.log("[Sessions API] Updated session:", session.id, {
      step: session.current_step,
      status: session.status,
    })

    return NextResponse.json({
      success: true,
      session,
    })
  } catch (error) {
    console.error("[Sessions API] PATCH error:", error)
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}

/**
 * DELETE /api/optimize-flow/sessions/[id]
 * Delete a session or mark it as abandoned
 *
 * Query params:
 * - action: "delete" | "abandon" (default: "delete")
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") || "delete"

    let success: boolean

    if (action === "abandon") {
      success = await abandonSession(id, user.id)
      console.log("[Sessions API] Abandoned session:", id)
    } else {
      success = await deleteOptimizationSession(id, user.id)
      console.log("[Sessions API] Deleted session:", id)
    }

    if (!success) {
      throw new AppError("Session not found", 404)
    }

    return NextResponse.json({
      success: true,
      action,
    })
  } catch (error) {
    console.error("[Sessions API] DELETE error:", error)
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
