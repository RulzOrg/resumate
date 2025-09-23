import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createResume, getOrCreateUser } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or create user in our database
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { content, title } = await request.json()

    if (!content || !title) {
      return NextResponse.json({ error: "Content and title are required" }, { status: 400 })
    }

    const resume = await createResume({
      user_id: user.id,
      title,
      content_text: content,
      file_name: `${title}.txt`,
      file_type: "text/plain",
      file_size: content.length,
      file_url: "",
    })

    return NextResponse.json({ resume })
  } catch (error) {
    console.error("Error duplicating resume:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
