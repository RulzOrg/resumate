import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { clearParsedStructure } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { resume_id } = await request.json()
    
    if (!resume_id) {
      return NextResponse.json({ error: "resume_id is required" }, { status: 400 })
    }

    await clearParsedStructure(resume_id)

    return NextResponse.json({ 
      success: true, 
      message: `Cache cleared for resume ${resume_id}. Next optimization will re-extract.` 
    })
  } catch (error: any) {
    console.error("[ClearCache] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to clear cache" }, { status: 500 })
  }
}

