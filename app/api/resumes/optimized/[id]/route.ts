import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, sql } from "@/lib/db"

/**
 * PATCH /api/resumes/optimized/[id]
 * Update optimized resume content
 */
export async function PATCH(
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
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { optimized_content } = await request.json()

    if (!optimized_content) {
      return NextResponse.json(
        { error: "optimized_content is required" },
        { status: 400 }
      )
    }

    // Update the optimized resume
    const [updated] = await sql`
      UPDATE optimized_resumes
      SET 
        optimized_content = ${optimized_content},
        updated_at = NOW()
      WHERE id = ${params.id}
        AND user_id = ${user.id}
      RETURNING *
    `

    if (!updated) {
      return NextResponse.json(
        { error: "Optimized resume not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      optimized_resume: updated
    })
  } catch (error) {
    console.error("Error updating optimized resume:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
