/**
 * Resume Export API Endpoint
 * Generates DOCX or HTML files from optimized resumes
 * 
 * POST /api/resumes/export
 * Body: { resume_id: string, format: "docx" | "html", layout?: "classic" | "modern" | "compact" }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOptimizedResumeById, getOrCreateUser } from "@/lib/db"
import { generateDOCX, generateDOCXFromMarkdown, type ResumeLayout } from "@/lib/export/docx-generator"
import type { ResumeJSON } from "@/lib/schemas-v2"

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse request
    const body = await request.json()
    const { resume_id, format = "docx", layout = "modern", job_title, company } = body

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
    const resume = await getOptimizedResumeById(resume_id, user.id)
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

    // Try to extract structured output if available
    let resumeData: ResumeJSON | null = null
    if (resume.structured_output && typeof resume.structured_output === "object") {
      const structuredOutput = resume.structured_output as any
      if (structuredOutput.resume_json) {
        resumeData = structuredOutput.resume_json as ResumeJSON
      }
    }

    // Generate file name
    const targetJobTitle = job_title || resume.job_title || "Resume"
    const targetCompany = company || resume.company_name || "Optimized"
    const fileName = `Resume_${targetJobTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${targetCompany.replace(/[^a-zA-Z0-9]/g, "_")}.${format === "html" ? "html" : "docx"}`

    // Generate file based on format
    if (format === "docx") {
      let buffer: Buffer

      if (resumeData) {
        buffer = await generateDOCX(resumeData, {
          fileName,
          includePageNumbers: true,
          layout: layout as ResumeLayout,
        })
      } else {
        buffer = await generateDOCXFromMarkdown(optimizedContent, resume.title || "Resume", {
          fileName,
          includePageNumbers: true,
          layout: layout as ResumeLayout,
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
      const html = generateHTMLFromMarkdown(optimizedContent, resume.title || "Resume", layout as ResumeLayout)

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
      { error: "Failed to export resume", message: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const resume_id = searchParams.get("resume_id")
    const format = searchParams.get("format") || "docx"
    const layout = searchParams.get("layout") || "modern"
    const job_title = searchParams.get("job_title") || undefined
    const company = searchParams.get("company") || undefined

    if (!resume_id) {
      return NextResponse.json({ error: "Missing resume_id" }, { status: 400 })
    }

    const mockRequest = new Request(request.url, {
      method: "POST",
      body: JSON.stringify({ resume_id, format, layout, job_title, company }),
    })

    return await POST(mockRequest as NextRequest)
  } catch (error: any) {
    console.error("Export GET error:", error)
    return NextResponse.json(
      { error: "Failed to export resume", message: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}

/**
 * Enhanced HTML generation with layout styles
 */
function generateHTMLFromMarkdown(markdown: string, title: string, layout: ResumeLayout = 'modern'): string {
  const configs = {
    classic: {
      font: "'Times New Roman', serif",
      size: "11pt",
      lineHeight: "1.4",
      margin: "0.75in",
      h1Size: "18pt",
      h2Size: "13pt",
      h2Border: "1px solid #333",
    },
    modern: {
      font: "Arial, sans-serif",
      size: "10.5pt",
      lineHeight: "1.6",
      margin: "0.75in",
      h1Size: "20pt",
      h2Size: "14pt",
      h2Border: "2px solid #eee",
    },
    compact: {
      font: "Calibri, sans-serif",
      size: "9.5pt",
      lineHeight: "1.3",
      margin: "0.5in",
      h1Size: "16pt",
      h2Size: "11pt",
      h2Border: "1px solid #ddd",
    }
  }

  const config = configs[layout] || configs.modern

  let html = markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
  html = html.replace(/<\/ul>\s*<ul>/g, '')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: ${config.font};
      max-width: 8.5in;
      margin: 0 auto;
      padding: ${config.margin};
      line-height: ${config.lineHeight};
      font-size: ${config.size};
      color: #333;
    }
    h1 { font-size: ${config.h1Size}; text-align: center; margin-bottom: 15px; text-transform: uppercase; }
    h2 { font-size: ${config.h2Size}; text-transform: uppercase; border-bottom: ${config.h2Border}; padding-bottom: 3px; margin-top: 20px; margin-bottom: 10px; font-weight: bold; }
    h3 { font-size: ${config.size}; margin-top: 15px; margin-bottom: 5px; font-weight: bold; }
    ul { padding-left: 20px; margin: 8px 0; }
    li { margin-bottom: 4px; }
    p { margin: 8px 0; }
    @page { size: letter; margin: 0; }
    @media print {
      body { margin: 0; padding: ${config.margin}; }
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`
}
