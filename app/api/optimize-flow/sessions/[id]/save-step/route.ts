import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser } from "@/lib/db"
import { handleApiError, AppError } from "@/lib/error-handler"
import { saveStepAndAdvance } from "@/lib/db/optimization-sessions"
import type { FlowStep } from "@/lib/types/optimize-flow"
import { z } from "zod"

// Schema for saving a step result
const SaveStepSchema = z.object({
  step: z.number().min(1).max(4),
  result: z.any(), // The step result (varies by step)
  resume_text: z.string().optional(), // Only for step 1
  edited_content: z.any().optional(), // Only for step 2
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/optimize-flow/sessions/[id]/save-step
 * Save a step result and advance to the next step
 *
 * This is a convenience endpoint that handles the step-specific
 * logic for saving results and advancing the flow.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const validationResult = SaveStepSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      throw new AppError(`Validation failed: ${errors}`, 400)
    }

    const { step, result, resume_text, edited_content } = validationResult.data

    // Validate step-specific requirements
    if (step === 1 && !resume_text) {
      console.warn("[Save Step] Step 1 without resume_text - this may cause issues later")
    }

    if (step === 2 && !edited_content) {
      console.warn("[Save Step] Step 2 without edited_content - using result as edited_content")
    }

    // Save step result and advance
    const session = await saveStepAndAdvance(
      id,
      user.id,
      step as FlowStep,
      result,
      {
        resumeText: resume_text,
        editedContent: edited_content || (step === 2 ? {
          professionalSummary: result.professionalSummary,
          workExperiences: result.workExperiences,
        } : undefined),
      }
    )

    if (!session) {
      throw new AppError("Session not found", 404)
    }

    console.log("[Save Step] Saved step result:", {
      sessionId: session.id,
      step,
      newStep: session.current_step,
      status: session.status,
    })

    return NextResponse.json({
      success: true,
      session,
      nextStep: session.current_step,
      completed: session.status === "completed",
    })
  } catch (error) {
    console.error("[Save Step] Error:", error)
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
