/**
 * Resume Export API Endpoint
 * Generates DOCX or PDF files from optimized resumes
 * 
 * POST /api/resumes/export
 * Body: { resume_id: string, format: "docx" | "pdf" | "html" }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOptimizedResumeById } from "@/lib/db"
import { generateDOCX, generateFileName } from "@/lib/export/docx-generator"
import { generatePDF } from "@/lib/export/pdf-generator"
import { generateResumeHTML } from "@/lib/export/html-template"
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

    if (!["docx", "pdf", "html"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be docx, pdf, or html" },
        { status: 400 }
      )
    }

    // Fetch optimized resume (note: function signature is (id, user_id))
    const resume = await getOptimizedResumeById(resume_id, userId)
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    // Extract structured output
    let resumeData: ResumeJSON | null = null

    if (resume.structured_output && typeof resume.structured_output === "object") {
      // v2 format with structured output
      const structuredOutput = resume.structured_output as any
      if (structuredOutput.resume_json) {
        resumeData = structuredOutput.resume_json as ResumeJSON
      }
    }

    if (!resumeData) {
      return NextResponse.json(
        { error: "Resume does not have structured output. Please re-optimize with v2." },
        { status: 400 }
      )
    }

    // Generate file name
    const nameParts = resumeData.name.split(" ")
    const firstName = nameParts[0] || "Resume"
    const lastName = nameParts.slice(1).join(" ") || ""
    const targetJobTitle = job_title || resumeData.headline || "Position"
    const targetCompany = company || "Company"

    const fileName = generateFileName(
      firstName,
      lastName,
      targetJobTitle,
      targetCompany,
      format as "docx" | "pdf" | "html"
    )

    // Generate file based on format
    if (format === "docx") {
      const buffer = await generateDOCX(resumeData, {
        fileName,
        includePageNumbers: true, // Enable page numbers for professional appearance
      })

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": buffer.length.toString(),
        },
      })
    } else if (format === "pdf") {
      try {
        const buffer = await generatePDF(resumeData)

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${fileName}"`,
            "Content-Length": buffer.length.toString(),
          },
        })
      } catch (error: any) {
        console.error("PDF generation failed:", error)
        
        // Fallback: Return HTML for client-side printing
        return NextResponse.json(
          {
            error: "PDF generation unavailable",
            message: error.message || "Please use DOCX format or HTML preview",
            fallback: "html",
          },
          { status: 503 }
        )
      }
    } else if (format === "html") {
      const html = generateResumeHTML(resumeData)

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
 * GET /api/resumes/export?resume_id=xxx&format=docx&job_title=xxx&company=xxx
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
