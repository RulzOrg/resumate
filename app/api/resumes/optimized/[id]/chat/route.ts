import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getChatMessages, saveChatMessages, getOrCreateUser, getOptimizedResumeById } from "@/lib/db"
import type { DbChatMessage } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await getOrCreateUser()
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { id } = await params

  const existing = await getOptimizedResumeById(id, user.id)
  if (!existing) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 })
  }

  const messages = await getChatMessages(id, user.id)
  return NextResponse.json({ messages })
}

interface SaveMessageInput {
  role: "user" | "assistant"
  content: string
  status?: string
  editResult?: Record<string, unknown> | null
  editStatus?: "pending" | "applied" | "dismissed" | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await getOrCreateUser()
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { id } = await params

  const existing = await getOptimizedResumeById(id, user.id)
  if (!existing) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 })
  }

  const body = await request.json()
  const inputMessages: SaveMessageInput[] = body.messages

  if (!Array.isArray(inputMessages) || inputMessages.length === 0 || inputMessages.length > 2) {
    return NextResponse.json(
      { error: "messages must be an array of 1-2 items" },
      { status: 400 }
    )
  }

  const dbMessages = inputMessages.map((msg) => ({
    user_id: user.id,
    optimized_resume_id: id,
    role: msg.role,
    content: msg.content,
    status: msg.status || "complete",
    edit_result: msg.editResult || null,
    edit_status: msg.editStatus || null,
  }))

  const saved = await saveChatMessages(dbMessages)

  return NextResponse.json({ success: true, messages: saved })
}
