import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getUserOptimizedResumes } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resumes = await getUserOptimizedResumes(session.userId)

    return NextResponse.json({ resumes })
  } catch (error) {
    console.error("Error fetching optimized resumes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
