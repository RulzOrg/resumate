import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { openai } from "@ai-sdk/openai"
import { generateObject, generateText } from "ai"
import { z } from "zod"
import { createHash } from "crypto"

import {
  createResume,
  createResumeVersion,
  ensureUserExists,
  getOrCreateUser,
  setPrimaryResume,
  updateResumeAnalysis,
} from "@/lib/db"
import { buildS3Key, scanBufferForViruses, uploadBufferToS3 } from "@/lib/storage"
import { inngest } from "@/lib/inngest/client"

const TEN_MB = 10 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/rtf",
])

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "rtf", "txt"])

function sniffMimeType(buffer: Buffer, fileName: string, reportedType?: string | null) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""
  const header = buffer.subarray(0, 8)

  if (header.length >= 4 && header.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) {
    return "application/pdf"
  }

  if (header.equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
    return "application/msword"
  }

  if (extension === "docx" && header.subarray(0, 2).equals(Buffer.from([0x50, 0x4b]))) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }

  const asciiLead = buffer.subarray(0, 5).toString("ascii")
  if (asciiLead === "{\\rtf" || extension === "rtf") {
    return "text/rtf"
  }

  if (extension === "txt") {
    return "text/plain"
  }

  if (reportedType && ALLOWED_MIME_TYPES.has(reportedType)) {
    return reportedType
  }

  return null
}

const optionalString = z
  .string()
  .optional()
  .nullable()
  .transform(value => {
    if (typeof value === "string") {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }
    return value
  })

const optionalStringArray = z
  .array(z.string().optional().nullable())
  .optional()
  .nullable()
  .transform(value => {
    if (!value) return value
    const filtered = value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    )
    return filtered.length > 0 ? filtered : null
  })

const StructuredResumeSchema = z.object({
  personal_info: z
    .object({
      full_name: optionalString,
      headline: optionalString,
      email: optionalString,
      phone: optionalString,
      location: optionalString,
      links: z
        .array(
          z.object({
            label: optionalString,
            url: optionalString,
          }),
        )
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
  summary: optionalString,
  experience: z
    .array(
      z.object({
        job_title: optionalString,
        company: optionalString,
        start_date: optionalString,
        end_date: optionalString,
        location: optionalString,
        highlights: optionalStringArray,
        skills: optionalStringArray,
      }),
    )
    .optional()
    .nullable(),
  education: z
    .array(
      z.object({
        institution: optionalString,
        degree: optionalString,
        start_date: optionalString,
        end_date: optionalString,
        highlights: optionalStringArray,
      }),
    )
    .optional()
    .nullable(),
  skills: z
    .object({
      technical: optionalStringArray,
      soft: optionalStringArray,
      tools: optionalStringArray,
      languages: optionalStringArray,
    })
    .optional()
    .nullable(),
  certifications: optionalStringArray,
  projects: z
    .array(
      z.object({
        name: optionalString,
        description: optionalString,
        impact: optionalStringArray,
        technologies: optionalStringArray,
      }),
    )
    .optional()
    .nullable(),
  achievements: optionalStringArray,
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure a matching database user exists
    const ensuredUser = await ensureUserExists(userId)
    const user = ensuredUser ?? (await getOrCreateUser(userId))
    if (!user) {
      console.error("Unable to resolve user during master resume upload", { userId })
      return NextResponse.json({ error: "Unable to verify account. Please try again." }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = (formData.get("title") as string | null)?.trim() || "Master Resume"

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    if (file.size > TEN_MB) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    const now = Date.now()
    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: "Unsupported file extension. Upload PDF, DOC, DOCX, RTF, or TXT." }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileHash = createHash("sha256").update(buffer).digest("hex")
    const detectedMime = sniffMimeType(buffer, file.name, file.type)
    if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
      console.warn("[MasterUpload] Rejected unsupported file type", {
        extension,
        reportedType: file.type,
      })
      return NextResponse.json(
        {
          error: "Unsupported or unrecognised file type. Upload PDF, DOC, DOCX, RTF, or TXT.",
        },
        { status: 400 },
      )
    }

    const virusScan = await scanBufferForViruses(buffer)
    if (virusScan.status === "infected") {
      console.warn("[MasterUpload] Virus detected in upload", {
        extension,
        signature: virusScan.signature,
      })
      return NextResponse.json(
        { error: "Upload blocked: the file did not pass antivirus scanning." },
        { status: 400 },
      )
    }

    if (virusScan.status === "error") {
      console.error("[MasterUpload] Virus scan failed", {
        extension,
        error: virusScan.error,
      })
      return NextResponse.json(
        { error: "Virus scanning service is unavailable. Please try again shortly." },
        { status: 503 },
      )
    }

    // Upload to R2/S3 and store URL
    const key = buildS3Key({ userId: user.id, kind: "master", fileName: file.name })
    const { url: fileUrl } = await uploadBufferToS3({ buffer, key, contentType: detectedMime })

    const enqueuedAt = new Date().toISOString()
    const processingDeadline = new Date(now + 90_000).toISOString()
    const uploadStartedAtIso = new Date(now).toISOString()

    const baseSourceMetadata = {
      storage: "r2",
      key,
      reportedContentType: file.type,
      detectedContentType: detectedMime,
      virusScanStatus: virusScan.status,
      fileHash,
      sla: {
        enqueuedAt,
        deadlineAt: processingDeadline,
        uploadStartedAt: uploadStartedAtIso,
      },
    }

    const resume = await createResume({
      user_id: user.id,
      title,
      file_name: file.name,
      file_url: fileUrl,
      file_type: detectedMime,
      file_size: file.size,
      file_hash: fileHash,
      kind: "master",
      processing_status: "pending", // Changed from "processing" - will be updated by background job
      is_primary: true,
      source_metadata: baseSourceMetadata,
    })

    const uploadDurationMs = Date.now() - now
    if (uploadDurationMs > 90_000) {
      await updateResumeAnalysis(resume.id, user.id, {
        processing_status: "failed",
        processing_error: "Upload processing exceeded the 90s SLA before queueing.",
        source_metadata: {
          ...baseSourceMetadata,
          sla: {
            ...baseSourceMetadata.sla,
            uploadDurationMs,
          },
        },
      })
      console.warn("[MasterUpload] Upload exceeded SLA prior to enqueue", {
        resumeId: resume.id.substring(0, 8),
        durationMs: uploadDurationMs,
      })
      return NextResponse.json(
        { error: "Upload took too long to process. Please retry shortly." },
        { status: 503 },
      )
    }

    const enrichedSourceMetadata = {
      ...baseSourceMetadata,
      sla: {
        ...baseSourceMetadata.sla,
        uploadDurationMs,
      },
    }

    try {
      const snapshot = await createResumeVersion({
        user_id: user.id,
        resume_id: resume.id,
        kind: "master",
        file_name: file.name,
        file_type: detectedMime,
        file_size: file.size,
        file_hash: fileHash,
        storage_key: key,
        metadata: {
          virusScanStatus: virusScan.status,
          detectedContentType: detectedMime,
          reportedContentType: file.type,
          sla: {
            enqueuedAt,
            deadlineAt: processingDeadline,
            uploadStartedAt: uploadStartedAtIso,
            uploadDurationMs,
          },
        },
        change_summary: "Master resume upload",
      })

      await updateResumeAnalysis(resume.id, user.id, {
        source_metadata: {
          ...enrichedSourceMetadata,
          version: {
            number: snapshot.version,
            createdAt: snapshot.created_at,
          },
        },
      })
    } catch (versionError) {
      console.error("[MasterUpload] Failed to record resume version snapshot", versionError)
    }

    await setPrimaryResume(resume.id, user.id)

    // Enqueue background processing job
    await inngest.send({
      name: "resume/uploaded",
      data: {
        resumeId: resume.id,
        userId: user.id,
        fileKey: key,
        fileType: detectedMime,
        fileSize: file.size,
        fileHash,
        virusScanStatus: virusScan.status,
        enqueuedAt,
        deadlineAt: processingDeadline,
        uploadDurationMs,
      },
    })

    console.log("[MasterUpload] Resume uploaded and job enqueued:", {
      resumeId: resume.id.substring(0, 8),
      userId: user.id.substring(0, 8),
    })

    // Return immediately - don't wait for processing!
    return NextResponse.json({
      resume: {
        ...resume,
        message: "Resume uploaded successfully. Processing in background...",
      },
    })
  } catch (error: any) {
    console.error("[MasterUpload] Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
