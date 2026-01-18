import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser } from "@/lib/db"
import { handleApiError, AppError } from "@/lib/error-handler"
import {
  createOptimizationSession,
  getInProgressSessions,
  getRecentSessions,
  findExistingSession,
} from "@/lib/db/optimization-sessions"
import { z } from "zod"

// Schema for creating a new session
const CreateSessionSchema = z.object({
  resume_id: z.string().uuid("Invalid resume ID"),
  job_title: z.string().min(3, "Job title must be at least 3 characters"),
  job_description: z.string().min(50, "Job description must be at least 50 characters"),
  company_name: z.string().optional(),
  resume_text: z.string().optional(),
})

/**
 * GET /api/optimize-flow/sessions
 * Get user's optimization sessions
 *
 * Query params:
 * - status: "in_progress" | "all" (default: "in_progress")
 * - limit: number (default: 5)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "in_progress"
    const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 20)

    let sessions
    if (status === "in_progress") {
      sessions = await getInProgressSessions(user.id, limit)
    } else {
      sessions = await getRecentSessions(user.id, limit)
    }

    return NextResponse.json({
      success: true,
      sessions,
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
 * POST /api/optimize-flow/sessions
 * Create a new optimization session
 *
 * If a session already exists for the same resume + job title,
 * returns the existing session instead of creating a new one.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    const body = await request.json()
    const validationResult = CreateSessionSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      throw new AppError(`Validation failed: ${errors}`, 400)
    }

    const { resume_id, job_title, job_description, company_name, resume_text } =
      validationResult.data

    // Check for existing session with same resume + job title
    const existingSession = await findExistingSession(user.id, resume_id, job_title)

    if (existingSession) {
      console.log("[Sessions API] Found existing session:", existingSession.id)
      return NextResponse.json({
        success: true,
        session: existingSession,
        resumed: true,
      })
    }

    // Create new session
    const session = await createOptimizationSession({
      user_id: user.id,
      resume_id,
      job_title,
      job_description,
      company_name,
      resume_text,
    })

    console.log("[Sessions API] Created new session:", session.id)

    return NextResponse.json(
      {
        success: true,
        session,
        resumed: false,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Sessions API] POST error:", error)
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
