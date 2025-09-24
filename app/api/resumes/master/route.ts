import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

import { getMasterResume, getOrCreateUser } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resume = await getMasterResume(user.id)

    if (!resume) {
      return NextResponse.json({ resume: null })
    }

    return NextResponse.json({ resume })
  } catch (error) {
    console.error("Master resume fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
