import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"

import { handleApiError, AppError } from "@/lib/error-handler"
import {
  createJobTarget,
  deleteJobTarget,
  getOrCreateUser,
  getUserJobTargets,
} from "@/lib/db"

const jobTargetSchema = z.object({
  job_url: z.string().url("Enter a valid job URL"),
  job_title: z.string().min(1).max(255).optional(),
  company_name: z.string().min(1).max(255).optional(),
  notes: z.string().max(1000).optional(),
})

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      throw new AppError("Unable to verify user account", 500)
    }

    const targets = await getUserJobTargets(user.id)
    return NextResponse.json({ targets })
  } catch (error) {
    const info = handleApiError(error)
    return NextResponse.json({ error: info.error, code: info.code }, { status: info.statusCode })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = jobTargetSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid payload"
      throw new AppError(message, 400)
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      throw new AppError("Unable to verify user account", 500)
    }

    const target = await createJobTarget({
      user_id: user.id,
      job_url: parsed.data.job_url,
      job_title: parsed.data.job_title,
      company_name: parsed.data.company_name,
      notes: parsed.data.notes,
    })

    return NextResponse.json({ target }, { status: 201 })
  } catch (error) {
    const info = handleApiError(error)
    return NextResponse.json({ error: info.error, code: info.code }, { status: info.statusCode })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      throw new AppError("Job target id is required", 400)
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      throw new AppError("Unable to verify user account", 500)
    }

    const deleted = await deleteJobTarget(id, user.id)
    if (!deleted) {
      throw new AppError("Job target not found", 404)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const info = handleApiError(error)
    return NextResponse.json({ error: info.error, code: info.code }, { status: info.statusCode })
  }
}
