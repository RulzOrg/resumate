import { NextRequest, NextResponse } from "next/server"
import { sql, createUserFromClerk, updateUserFromClerk, deleteUserByClerkId } from "@/lib/db"

// Minimal verification via Clerk's recommended header secret (Svix). If not set, skip verify in dev.
export async function POST(req: NextRequest) {
  const bodyText = await req.text()
  const svixId = req.headers.get("svix-id") || ""
  const svixTimestamp = req.headers.get("svix-timestamp") || ""
  const svixSignature = req.headers.get("svix-signature") || ""

  const secret = process.env.CLERK_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || ""

  try {
    // Optional: verify signature when secret is present
    if (secret) {
      const { Webhook } = await import("svix")
      const wh = new Webhook(secret)
      wh.verify(bodyText, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      })
    }

    const evt = JSON.parse(bodyText)
    const type = evt?.type as string
    const data = evt?.data || {}

    if (type === "user.created") {
      const clerkId = data.id as string
      const email = data.email_addresses?.[0]?.email_address || data.primary_email_address?.email_address || ""
      const name = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ") || "User"

      await createUserFromClerk(clerkId, email, name)
      console.log('[CLERK_WEBHOOK] User created:', { clerk_user_id: clerkId, email })
    } else if (type === "user.updated") {
      const clerkId = data.id as string
      const email = data.email_addresses?.[0]?.email_address || data.primary_email_address?.email_address
      const name = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ")
      await updateUserFromClerk(clerkId, { email, name })
    } else if (type === "user.deleted") {
      const clerkId = data.id as string
      await deleteUserByClerkId(clerkId)
    }

    // Persist raw event for audit/debug if table exists
    try {
      await sql`
        INSERT INTO clerk_webhook_events (event_type, event_id, user_id, raw_data, created_at)
        VALUES (${type}, ${evt.id || ""}, ${data?.id || null}, ${JSON.stringify(evt)}, NOW())
      `
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "invalid" }, { status: 400 })
  }
}

export const dynamic = "force-dynamic"
