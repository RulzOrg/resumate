import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOptimizedResumeById, getOrCreateUser } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const resumeId = searchParams.get("id")
    const format = searchParams.get("format") || "pdf"

    if (!resumeId) {
      return NextResponse.json({ error: "Resume ID is required" }, { status: 400 })
    }

    const optimizedResume = await getOptimizedResumeById(resumeId, user.id)
    if (!optimizedResume) {
      return NextResponse.json({ error: "Optimized resume not found" }, { status: 404 })
    }

    // Generate filename
    const sanitizedTitle = optimizedResume.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")
    const filename = `${sanitizedTitle}.${format}`

    if (format === "pdf") {
      // For PDF generation, we'll use a simple HTML to PDF approach
      // In production, you'd use a proper PDF library like puppeteer or jsPDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${optimizedResume.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 30px; }
            .section { margin-bottom: 25px; }
            .match-score { background: #f0f8ff; padding: 10px; border-left: 4px solid #007acc; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>${optimizedResume.title}</h1>
          <div class="match-score">
            <strong>Match Score: ${optimizedResume.match_score || "N/A"}%</strong>
          </div>
          <div class="section">
            ${optimizedResume.optimized_content.replace(/\n/g, "<br>")}
          </div>
        </body>
        </html>
      `

      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="${filename.replace(".pdf", ".html")}"`,
        },
      })
    } else if (format === "docx" || format === "txt") {
      // For text/Word format, return plain text
      const textContent = `${optimizedResume.title}\n\nMatch Score: ${optimizedResume.match_score || "N/A"}%\n\n${optimizedResume.optimized_content}`

      return new NextResponse(textContent, {
        headers: {
          "Content-Type":
            format === "docx"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "text/plain",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    } else {
      return NextResponse.json({ error: "Unsupported format. Use pdf, docx, or txt" }, { status: 400 })
    }
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Failed to download resume" }, { status: 500 })
  }
}
