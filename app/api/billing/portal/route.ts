import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser } from "@/lib/db"
import { createPortalSession } from "@/lib/billing/polar"
import { handleApiError } from "@/lib/error-handler"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { returnUrl } = await request.json()
    const fullReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings`

    // Create Polar customer portal session
    const { url } = await createPortalSession(userId, fullReturnUrl)

    return NextResponse.json({ url })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
