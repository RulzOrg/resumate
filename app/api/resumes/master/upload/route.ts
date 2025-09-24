import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { openai } from "@ai-sdk/openai"
import { generateText, generateObject } from "ai"
import { z } from "zod"

import {
  createResume,
  getOrCreateUser,
  setPrimaryResume,
  updateResumeAnalysis,
} from "@/lib/db"

const StructuredResumeSchema = z.object({
  personal_info: z
    .object({
      full_name: z.string().optional(),
      headline: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      location: z.string().optional(),
      links: z
        .array(
          z.object({
            label: z.string().optional(),
            url: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  summary: z.string().optional(),
  experience: z
    .array(
      z.object({
        job_title: z.string().optional(),
        company: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        location: z.string().optional(),
        highlights: z.array(z.string()).optional(),
        skills: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  education: z
    .array(
      z.object({
        institution: z.string().optional(),
        degree: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        highlights: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  skills: z
    .object({
      technical: z.array(z.string()).optional(),
      soft: z.array(z.string()).optional(),
      tools: z.array(z.string()).optional(),
      languages: z.array(z.string()).optional(),
    })
    .optional(),
  certifications: z.array(z.string()).optional(),
  projects: z
    .array(
      z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        impact: z.array(z.string()).optional(),
        technologies: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  achievements: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use enhanced user creation with retry logic
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "Unable to verify user account. Please try again." }, { status: 500 })
    }

    console.log('User verification successful in master resume upload:', { 
      user_id: user.id, 
      clerk_user_id: user.clerk_user_id 
    })

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
    const base64 = buffer.toString("base64")
    const fileUrl = `data:${file.type};base64,${base64}`

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
      content_text: null,
    })

    await setPrimaryResume(resume.id, user.id)

    let contentText = ""

    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `Extract the full text content from this resume. Maintain section headings and bullet structure.

FILE_TYPE: ${file.type}
BASE64_DATA:
${base64.substring(0, 2000)}...

Return only the extracted resume text.`,
      })
      contentText = text.trim()
    } catch (extractionError) {
      console.error("Master resume content extraction error:", extractionError)
      contentText = "Content extraction failed. Please re-upload or edit manually."
    }

    try {
      const sanitizedText = contentText.replace(/\s+/g, " ").trim()
      if (!sanitizedText || sanitizedText.length < 60) {
        throw new Error("Unable to extract enough resume content for analysis")
      }

      const { object: structured } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: StructuredResumeSchema,
        prompt: `Analyze the following resume content and extract structured data for reuse.

Resume Content:
${contentText}

Provide clear, concise results. Use arrays for bullet points, prefer ISO date strings (YYYY-MM) when inferring dates, and leave fields undefined if the information is missing.`,
      })

      const extractionTimestamp = new Date().toISOString()

      const updated =
        (await updateResumeAnalysis(resume.id, user.id, {
          content_text: contentText,
          parsed_sections: structured,
          processing_status: "completed",
          processing_error: null,
          extracted_at: extractionTimestamp,
          source_metadata: {
            pipeline: "master_resume_v1",
            model: "gpt-4o-mini",
            extracted_at: extractionTimestamp,
          },
        })) ?? { ...resume, content_text: contentText, parsed_sections: structured, processing_status: "completed" }

      return NextResponse.json({ resume: updated })
    } catch (analysisError) {
      console.error("Master resume analysis error:", analysisError)
      const failedResume =
        (await updateResumeAnalysis(resume.id, user.id, {
          content_text: contentText,
          processing_status: "failed",
          processing_error:
            analysisError instanceof Error ? analysisError.message : "Structured analysis failed",
          extracted_at: new Date().toISOString(),
        })) ?? { ...resume, content_text: contentText, processing_status: "failed" }

      return NextResponse.json(
        {
          error: "Structured analysis failed. Please review the uploaded resume.",
          resume: failedResume,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Master resume upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
