import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { openai } from "@ai-sdk/openai"
import { generateObject, generateText } from "ai"
import { z } from "zod"

import {
  createResume,
  ensureUserExists,
  getOrCreateUser,
  setPrimaryResume,
  updateResumeAnalysis,
} from "@/lib/db"
import { buildS3Key, uploadBufferToS3 } from "@/lib/storage"
import { inngest } from "@/lib/inngest/client"

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

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Please upload a PDF or Word document" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    // Upload to R2/S3 and store URL
    const key = buildS3Key({ userId: user.id, kind: "master", fileName: file.name })
    const { url: fileUrl } = await uploadBufferToS3({ buffer, key, contentType: file.type })
    const base64 = buffer.toString("base64")

    const resume = await createResume({
      user_id: user.id,
      title,
      file_name: file.name,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
      kind: "master",
      processing_status: "pending", // Changed from "processing" - will be updated by background job
      is_primary: true,
      source_metadata: { storage: "r2", key },
    })

    await setPrimaryResume(resume.id, user.id)

    // Enqueue background processing job
    await inngest.send({
      name: "resume/uploaded",
      data: {
        resumeId: resume.id,
        userId: user.id,
        fileKey: key,
        fileType: file.type,
        fileSize: file.size,
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
