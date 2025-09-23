import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { updateResumePrimary } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resumeId = params.id
    await updateResumePrimary(session.userId, resumeId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating primary resume:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
