import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  deleteOptimizedResume,
  getOptimizedResumeById,
  getOrCreateUser,
  updateOptimizedResumeV2,
} from "@/lib/db"
import { AppError } from "@/lib/error-handler"
import { errorResponse, fromError } from "@/lib/api-response"
import {
  normalizeStructuredOutput,
  toDerivedMarkdown,
  toStructuredDocument,
  type StructuredResumeEnvelopeV1,
} from "@/lib/optimized-resume-document"
import { isStructuredEditorV1Enabled } from "@/lib/feature-flags"
import { z } from "zod"
import type { ParsedResume } from "@/lib/resume-parser"

const PatchPayloadSchema = z.object({
  structured_output: z.unknown().optional(),
  client_revision: z.string().optional(),
  match_score: z.number().min(0).max(100).optional(),
  resumeData: z.unknown().optional(), // Legacy fallback payload
})

async function getAuthedUser() {
  const { userId } = await auth()
  if (!userId) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const user = await getOrCreateUser()
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND")
  }

  return user
}

function toRevisionToken(value: unknown): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function withCanonicalResume(optimized: any, userId: string) {
  const structured =
    normalizeStructuredOutput(optimized.structured_output, optimized.optimized_content, {
      migrated: !optimized.structured_output,
      lastEditor: userId,
    }) || undefined

  const markdown = structured ? toDerivedMarkdown(structured) : optimized.optimized_content

  return {
    ...optimized,
    optimized_content: markdown,
    structured_output: structured,
    revision_token: toRevisionToken(optimized.updated_at),
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthedUser()
    const { id } = await params

    const optimized = await getOptimizedResumeById(id, user.id)
    if (!optimized) {
      throw new AppError("Optimized resume not found", 404, "NOT_FOUND")
    }

    return NextResponse.json({ optimized_resume: withCanonicalResume(optimized, user.id) })
  } catch (error) {
    return fromError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthedUser()
    const { id } = await params

    const bodyParse = PatchPayloadSchema.safeParse(await request.json())
    if (!bodyParse.success) {
      return errorResponse(400, "INVALID_PAYLOAD", "Invalid PATCH payload", {
        retryable: false,
        details: bodyParse.error.flatten(),
      })
    }

    const body = bodyParse.data
    const existing = await getOptimizedResumeById(id, user.id)
    if (!existing) {
      throw new AppError("Optimized resume not found", 404, "NOT_FOUND")
    }

    const clientRevision = body.client_revision?.trim()
    const serverRevision = toRevisionToken(existing.updated_at)

    if (clientRevision && serverRevision && clientRevision !== serverRevision) {
      return errorResponse(409, "REVISION_CONFLICT", "Resume has changed since your last fetch", {
        retryable: false,
        details: {
          client_revision: clientRevision,
          server_revision: serverRevision,
        },
      })
    }

    let structuredOutput: StructuredResumeEnvelopeV1 | null = null

    if (body.structured_output !== undefined) {
      structuredOutput = normalizeStructuredOutput(body.structured_output, undefined, {
        lastEditor: user.id,
      })

      if (!structuredOutput) {
        return errorResponse(400, "INVALID_STRUCTURED_OUTPUT", "structured_output is invalid", {
          retryable: false,
        })
      }
    } else if (body.resumeData) {
      if (isStructuredEditorV1Enabled()) {
        return errorResponse(
          400,
          "LEGACY_PAYLOAD_REJECTED",
          "resumeData payload is not accepted when USE_STRUCTURED_EDITOR_V1 is enabled",
          { retryable: false }
        )
      }

      structuredOutput = toStructuredDocument(body.resumeData as ParsedResume, {
        provenanceDefault: "user_edited",
        lastEditor: user.id,
      })
    } else {
      return errorResponse(400, "MISSING_STRUCTURED_OUTPUT", "structured_output is required", {
        retryable: false,
      })
    }

    const metadata = {
      ...(structuredOutput.metadata || {}),
      last_editor: user.id,
      last_edited_at: new Date().toISOString(),
    }

    structuredOutput = {
      ...structuredOutput,
      metadata,
    }

    const markdown = toDerivedMarkdown(structuredOutput)

    const updated = await updateOptimizedResumeV2(id, user.id, {
      structured_output: structuredOutput,
      optimized_content: markdown,
      match_score: body.match_score,
    })

    if (!updated) {
      throw new AppError("Failed to update resume", 500, "UPDATE_FAILED")
    }

    return NextResponse.json({
      success: true,
      optimized_resume: withCanonicalResume(updated, user.id),
    })
  } catch (error) {
    return fromError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthedUser()
    const { id } = await params

    const deleted = await deleteOptimizedResume(id, user.id)
    if (!deleted) {
      return errorResponse(404, "NOT_FOUND", "Optimized resume not found", { retryable: false })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return fromError(error)
  }
}
