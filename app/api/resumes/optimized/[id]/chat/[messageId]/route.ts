import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { updateChatMessageEditStatus, getOrCreateUser } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await getOrCreateUser()
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { messageId } = await params
  const body = await request.json()

  if (!body.editStatus || !["applied", "dismissed"].includes(body.editStatus)) {
    return NextResponse.json(
      { error: "editStatus must be 'applied' or 'dismissed'" },
      { status: 400 }
    )
  }

  const updated = await updateChatMessageEditStatus(
    messageId,
    user.id,
    body.editStatus,
    body.content
  )

  if (!updated) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
