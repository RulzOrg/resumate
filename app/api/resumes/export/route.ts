/**
 * Resume Export API Endpoint
 * Structured output is canonical source. Markdown fallback is legacy-only.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { getOptimizedResumeById, getOrCreateUser } from "@/lib/db"
import { generateDOCX, generateDOCXFromMarkdown, type ResumeLayout } from "@/lib/export/docx-generator"
import { errorResponse, fromError } from "@/lib/api-response"
import {
  normalizeStructuredOutput,
  toDerivedMarkdown,
  toResumeJSON,
} from "@/lib/optimized-resume-document"
import { renderSafeHtmlFromMarkdown, wrapHtmlDocument } from "@/lib/export/safe-html"

const ExportPayloadSchema = z.object({
  resume_id: z.string().min(1),
  format: z.enum(["docx", "html", "txt"]).default("docx"),
  layout: z.enum(["classic", "modern", "compact"]).default("modern"),
  job_title: z.string().optional(),
  company: z.string().optional(),
})

const LAYOUT_STYLE_MAP: Record<ResumeLayout, string> = {
  classic: `
    body { font-family: 'Times New Roman', serif; max-width: 8.5in; margin: 0 auto; padding: 0.75in; line-height: 1.4; font-size: 11pt; color: #222; }
    h1 { font-size: 18pt; text-align: center; margin-bottom: 12px; text-transform: uppercase; }
    h2 { font-size: 13pt; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 3px; margin-top: 16px; margin-bottom: 8px; }
    h3 { font-size: 11pt; margin-top: 12px; margin-bottom: 4px; font-weight: bold; }
    ul { padding-left: 20px; margin: 4px 0; }
    li { margin-bottom: 2px; }
    p { margin: 4px 0; }
  `,
  modern: `
    body { font-family: Arial, sans-serif; max-width: 8.5in; margin: 0 auto; padding: 0.75in; line-height: 1.6; font-size: 10.5pt; color: #1f2937; }
    h1 { font-size: 20pt; text-align: center; margin-bottom: 12px; text-transform: uppercase; }
    h2 { font-size: 14pt; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; padding-bottom: 3px; margin-top: 16px; margin-bottom: 8px; }
    h3 { font-size: 11pt; margin-top: 12px; margin-bottom: 4px; font-weight: bold; }
    ul { padding-left: 20px; margin: 4px 0; }
    li { margin-bottom: 2px; }
    p { margin: 4px 0; }
  `,
  compact: `
    body { font-family: Calibri, sans-serif; max-width: 8.5in; margin: 0 auto; padding: 0.5in; line-height: 1.3; font-size: 9.5pt; color: #111827; }
    h1 { font-size: 16pt; text-align: center; margin-bottom: 8px; text-transform: uppercase; }
    h2 { font-size: 11pt; text-transform: uppercase; border-bottom: 1px solid #d1d5db; padding-bottom: 2px; margin-top: 12px; margin-bottom: 6px; }
    h3 { font-size: 10pt; margin-top: 8px; margin-bottom: 3px; font-weight: bold; }
    ul { padding-left: 18px; margin: 3px 0; }
    li { margin-bottom: 1px; }
    p { margin: 3px 0; }
  `,
}

function sanitizeFilePart(input: string | null | undefined, fallback: string): string {
  const value = input || fallback
  const sanitized = value.replace(/[^a-zA-Z0-9]/g, "_")
  return sanitized || fallback
}

async function handleExport(payload: z.infer<typeof ExportPayloadSchema>) {
  const { userId } = await auth()
  if (!userId) {
    return errorResponse(401, "UNAUTHORIZED", "Unauthorized", { retryable: false })
  }

  const user = await getOrCreateUser()
  if (!user) {
    return errorResponse(404, "USER_NOT_FOUND", "User not found", { retryable: false })
  }

  const resume = await getOptimizedResumeById(payload.resume_id, user.id)
  if (!resume) {
    return errorResponse(404, "RESUME_NOT_FOUND", "Resume not found", { retryable: false })
  }

  const structured = normalizeStructuredOutput(resume.structured_output, resume.optimized_content, {
    migrated: !resume.structured_output,
    lastEditor: user.id,
  })

  const markdown = structured ? toDerivedMarkdown(structured) : resume.optimized_content
  if (!markdown) {
    return errorResponse(400, "MISSING_CONTENT", "Resume has no optimized content", { retryable: false })
  }

  const resumeData = structured ? toResumeJSON(structured) : null

  const targetJobTitle = sanitizeFilePart(payload.job_title || resume.job_title, "Resume")
  const targetCompany = sanitizeFilePart(payload.company || resume.company_name, "Optimized")
  const fileNameBase = `Resume_${targetJobTitle}_${targetCompany}`

  if (payload.format === "docx") {
    let buffer: Buffer

    if (resumeData) {
      buffer = await generateDOCX(resumeData, {
        fileName: `${fileNameBase}.docx`,
        includePageNumbers: true,
        layout: payload.layout,
      })
    } else {
      buffer = await generateDOCXFromMarkdown(markdown, resume.title || "Resume", {
        fileName: `${fileNameBase}.docx`,
        includePageNumbers: true,
        layout: payload.layout,
      })
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileNameBase}.docx"`,
        "Content-Length": buffer.length.toString(),
      },
    })
  }

  if (payload.format === "txt") {
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileNameBase}.txt"`,
      },
    })
  }

  const contentHtml = await renderSafeHtmlFromMarkdown(markdown)
  const fullHtml = wrapHtmlDocument(contentHtml, resume.title || "Resume", LAYOUT_STYLE_MAP[payload.layout])

  return new NextResponse(fullHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${fileNameBase}.html"`,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const parse = ExportPayloadSchema.safeParse(await request.json())
    if (!parse.success) {
      return errorResponse(400, "INVALID_REQUEST", "Invalid export payload", {
        retryable: false,
        details: parse.error.flatten(),
      })
    }

    return handleExport(parse.data)
  } catch (error) {
    return fromError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const parse = ExportPayloadSchema.safeParse({
      resume_id: request.nextUrl.searchParams.get("resume_id"),
      format: request.nextUrl.searchParams.get("format") || "docx",
      layout: request.nextUrl.searchParams.get("layout") || "modern",
      job_title: request.nextUrl.searchParams.get("job_title") || undefined,
      company: request.nextUrl.searchParams.get("company") || undefined,
    })

    if (!parse.success) {
      return errorResponse(400, "INVALID_REQUEST", "Invalid export query params", {
        retryable: false,
        details: parse.error.flatten(),
      })
    }

    return handleExport(parse.data)
  } catch (error) {
    return fromError(error)
  }
}
