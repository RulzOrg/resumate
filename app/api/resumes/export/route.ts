/**
 * Resume Export API Endpoint
 * Generates DOCX or HTML files from optimized resumes
 * 
 * POST /api/resumes/export
 * Body: { resume_id: string, format: "docx" | "html" }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOptimizedResumeById } from "@/lib/db"
import { generateDOCX, generateDOCXFromMarkdown, generateFileName } from "@/lib/export/docx-generator"
import type { ResumeJSON } from "@/lib/schemas-v2"

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request
    const body = await request.json()
    const { resume_id, format = "docx", job_title, company } = body

    if (!resume_id) {
      return NextResponse.json({ error: "Missing resume_id" }, { status: 400 })
    }

    if (!["docx", "html"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be docx or html" },
        { status: 400 }
      )
    }

    // Fetch optimized resume
    const resume = await getOptimizedResumeById(resume_id, userId)
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    // Check for content
    const optimizedContent = resume.optimized_content
    if (!optimizedContent) {
      return NextResponse.json(
        { error: "Resume has no optimized content" },
        { status: 400 }
      )
    }

    // Try to extract structured output if available (for better formatting)
    let resumeData: ResumeJSON | null = null
    if (resume.structured_output && typeof resume.structured_output === "object") {
      const structuredOutput = resume.structured_output as any
      if (structuredOutput.resume_json) {
        resumeData = structuredOutput.resume_json as ResumeJSON
      }
    }

    // Generate file name from resume title or job details
    const targetJobTitle = job_title || resume.title || "Resume"
    const targetCompany = company || "Optimized"
    const fileName = `Resume_${targetJobTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${targetCompany.replace(/[^a-zA-Z0-9]/g, "_")}.${format === "html" ? "html" : "docx"}`

    // Generate file based on format
    if (format === "docx") {
      let buffer: Buffer

      if (resumeData) {
        // Use structured data if available (better formatting)
        buffer = await generateDOCX(resumeData, {
          fileName,
          includePageNumbers: true,
        })
      } else {
        // Fall back to markdown-based generation
        buffer = await generateDOCXFromMarkdown(optimizedContent, resume.title || "Resume", {
          fileName,
          includePageNumbers: true,
        })
      }

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": buffer.length.toString(),
        },
      })
    } else if (format === "html") {
      // Generate simple HTML from markdown
      const html = generateHTMLFromMarkdown(optimizedContent, resume.title || "Resume")

      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `inline; filename="${fileName}"`,
        },
      })
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
  } catch (error: any) {
    console.error("Export error:", error)
    return NextResponse.json(
      {
        error: "Failed to export resume",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for direct download links
 * GET /api/resumes/export?resume_id=xxx&format=docx
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const resume_id = searchParams.get("resume_id")
    const format = searchParams.get("format") || "docx"
    const job_title = searchParams.get("job_title") || undefined
    const company = searchParams.get("company") || undefined

    if (!resume_id) {
      return NextResponse.json({ error: "Missing resume_id" }, { status: 400 })
    }

    // Reuse POST logic
    const mockRequest = new Request(request.url, {
      method: "POST",
      body: JSON.stringify({ resume_id, format, job_title, company }),
    })

    return await POST(mockRequest as NextRequest)
  } catch (error: any) {
    console.error("Export GET error:", error)
    return NextResponse.json(
      {
        error: "Failed to export resume",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * Simple HTML generation from markdown for preview
 */
function generateHTMLFromMarkdown(markdown: string, title: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet points
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

  // Wrap list items
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
  // Clean up multiple ul tags
  html = html.replace(/<\/ul>\s*<ul>/g, '')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { font-size: 24px; text-align: center; margin-bottom: 10px; }
    h2 { font-size: 16px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 20px; }
    h3 { font-size: 14px; margin-bottom: 5px; }
    ul { padding-left: 20px; margin: 10px 0; }
    li { margin-bottom: 5px; }
    p { margin: 10px 0; }
    @media print {
      body { margin: 0; padding: 20px; }
    }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`
}
