/**
 * Optimized Resume Update API Endpoint
 * Handles saving v2 structured resume edits
 * 
 * PATCH /api/resumes/optimized/[id]
 * Body: { structured_output, qa_metrics?, export_formats?, optimized_content?, match_score? }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { updateOptimizedResumeV2, getUserByClerkId } from "@/lib/db"
import type { SystemPromptV1Output } from "@/lib/schemas-v2"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get database user ID from Clerk ID
    const user = await getUserByClerkId(clerkUserId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const userId = user.id
    console.log('[API PATCH] User ID conversion:', { clerkId: clerkUserId, dbId: userId })

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing resume ID" }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const {
      structured_output,
      qa_metrics,
      export_formats,
      optimized_content,
      match_score,
    } = body

    // Validate: at least one field must be provided
    if (
      structured_output === undefined &&
      qa_metrics === undefined &&
      export_formats === undefined &&
      optimized_content === undefined &&
      match_score === undefined
    ) {
      return NextResponse.json(
        { error: "No update fields provided" },
        { status: 400 }
      )
    }

    // Validate structured_output if provided
    if (structured_output !== undefined && structured_output !== null) {
      const requiredFields = ["ui", "resume_json", "analysis", "qa", "tailored_resume_text"]
      const missingFields = requiredFields.filter(
        (field) => !structured_output[field]
      )

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: "Invalid structured_output",
            message: `Missing required fields: ${missingFields.join(", ")}`,
          },
          { status: 400 }
        )
      }
    }

    // Update resume
    console.log('[API PATCH] Saving resume:', id, 'for database user:', userId)
    
    const updated = await updateOptimizedResumeV2(id, userId, {
      structured_output,
      qa_metrics,
      export_formats,
      optimized_content,
      match_score,
    })

    if (!updated) {
      console.error('[API PATCH] Resume not found or permission denied:', id)
      return NextResponse.json(
        { error: "Resume not found or you don't have permission to update it" },
        { status: 404 }
      )
    }

    console.log('[API PATCH] Save successful:', id)

    return NextResponse.json({
      success: true,
      resume: updated,
      message: "Resume updated successfully",
    })
  } catch (error: any) {
    console.error("Resume update error:", error)
    return NextResponse.json(
      {
        error: "Failed to update resume",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/resumes/optimized/[id]
 * Fetch a specific optimized resume
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get database user ID from Clerk ID
    const user = await getUserByClerkId(clerkUserId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const userId = user.id

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing resume ID" }, { status: 400 })
    }

    // Fetch resume (using the existing function)
    const { getOptimizedResumeById } = await import("@/lib/db")
    const resume = await getOptimizedResumeById(id, userId)

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      resume,
    })
  } catch (error: any) {
    console.error("Resume fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch resume",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/resumes/optimized/[id]
 * Delete an optimized resume
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get database user ID from Clerk ID
    const user = await getUserByClerkId(clerkUserId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const userId = user.id

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing resume ID" }, { status: 400 })
    }

    // Delete resume
    const { deleteOptimizedResume } = await import("@/lib/db")
    const deleted = await deleteOptimizedResume(id, userId)

    if (!deleted) {
      return NextResponse.json(
        { error: "Resume not found or you don't have permission to delete it" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Resume deleted successfully",
    })
  } catch (error: any) {
    console.error("Resume delete error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete resume",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}
