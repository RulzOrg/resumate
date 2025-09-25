import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { openai } from "@ai-sdk/openai"
import { generateText, generateObject } from "ai"
import { z } from "zod"

import {
  createResume,
  ensureUserExists,
  getOrCreateUser,
  setPrimaryResume,
  updateResumeAnalysis,
} from "@/lib/db"
import { buildS3Key, uploadBufferToS3 } from "@/lib/storage"

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
      processing_status: "processing",
      is_primary: true,
      source_metadata: { storage: "r2", key },
    })

    await setPrimaryResume(resume.id, user.id)

    let contentText = ""

    try {
      // For text files, read directly without AI
      if (file.type === "text/plain") {
        contentText = buffer.toString('utf-8')
      } else {
        // Use full base64 data for better extraction
        const { text } = await generateText({
          model: openai("gpt-4o-mini"),
          prompt: `Extract the full text content from this resume. Preserve section headings and bullet structure.
          Return only the extracted resume text, no additional commentary.
          
          FILE_TYPE: ${file.type}
          BASE64_DATA: ${base64}`,
        })
        contentText = text.trim()
      }
      console.log(`Text extraction successful, content length: ${contentText.length}`)
    } catch (extractionError) {
      console.error("Master resume text extraction failed", {
        error: extractionError instanceof Error ? extractionError.message : extractionError,
        fileType: file.type,
        fileSize: file.size
      })
      contentText = "Content extraction failed. Please re-upload or edit manually."
    }

    try {
      const sanitizedText = contentText.replace(/\s+/g, " ").trim()
      if (!sanitizedText || sanitizedText.length < 60) {
        throw new Error("Unable to extract enough resume content for analysis")
      }

      console.log(`Starting structured analysis for resume with ${sanitizedText.length} characters`)

      // Try structured analysis with retry logic
      let structured
      let retryCount = 0
      const maxRetries = 2

      while (retryCount <= maxRetries) {
        try {
          const result = await generateObject({
            model: openai("gpt-4o-mini"),
            schema: StructuredResumeSchema,
            prompt: `Analyze the following resume content and extract structured data for reuse.
            Focus on identifying clear sections and extracting key information.
            If uncertain about any field, leave it undefined rather than guessing.

            Resume Content:
            ${sanitizedText.substring(0, 8000)} ${sanitizedText.length > 8000 ? '...' : ''}

            Provide concise results. Use arrays for bullets, prefer ISO dates (YYYY-MM) when inferring dates, and leave fields undefined if the information is missing.`,
          })
          structured = result.object
          console.log('Structured analysis completed successfully')
          break
        } catch (retryError) {
          console.error(`Structured analysis attempt ${retryCount + 1} failed:`, {
            error: retryError instanceof Error ? retryError.message : retryError,
            attempt: retryCount + 1
          })
          
          if (retryCount >= maxRetries) {
            throw retryError
          }
          retryCount++
          // Wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      const extractionTimestamp = new Date().toISOString()

      const updated =
        (await updateResumeAnalysis(resume.id, user.id, {
          content_text: contentText,
          parsed_sections: structured,
          processing_status: "completed",
          processing_error: null,
          extracted_at: extractionTimestamp,
          source_metadata: {
            storage: "r2",
            key,
            pipeline: "master_resume_v2",
            model: "gpt-4o-mini",
            extracted_at: extractionTimestamp,
          },
        })) ?? { ...resume, content_text: contentText, parsed_sections: structured, processing_status: "completed" }

      console.log('Resume processing completed successfully')
      return NextResponse.json({ resume: updated })
    } catch (analysisError) {
      console.error("Master resume structured analysis failed after all retries", {
        error: analysisError instanceof Error ? analysisError.message : analysisError,
        stack: analysisError instanceof Error ? analysisError.stack : undefined,
        contentLength: contentText.length
      })

      // Still save the resume with extracted text even if structured analysis fails
      const failedResume =
        (await updateResumeAnalysis(resume.id, user.id, {
          content_text: contentText,
          processing_status: "failed",
          processing_error:
            analysisError instanceof Error ? analysisError.message : "Structured analysis failed",
          extracted_at: new Date().toISOString(),
        })) ?? { ...resume, content_text: contentText, processing_status: "failed" }

      // Return the resume anyway so users can still see their content
      return NextResponse.json(
        {
          error: "Master resume structured analysis failed. The resume was saved but may need manual review.",
          resume: failedResume,
        },
        { status: 200 }, // Changed to 200 so the frontend doesn't show error
      )
    }
  } catch (error) {
    console.error("Master resume upload error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
