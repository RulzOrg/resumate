import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, updateResumeContent, getOrCreateUser } from "@/lib/db"
// No direct S3 SDK usage here; we fetch via HTTPS using the stored URL.
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { resume_id } = await request.json()
    if (!resume_id) {
      return NextResponse.json({ error: "Resume ID is required" }, { status: 400 })
    }

    const resume = await getResumeById(resume_id, user.id)
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    let base64Data: string | null = null
    // Legacy support: data URLs stored previously
    if (resume.file_url.startsWith("data:")) {
      base64Data = resume.file_url.split(",")[1] || null
    } else {
      // Assume external URL (S3 or CDN). Fetch the file and convert to base64 for the current AI extraction path
      try {
        let downloadUrl = resume.file_url
        // If this looks like an S3 key (rare case), generate signed URL. Otherwise, use as-is.
        // For now, treat resume.file_url as a full URL; if your DB stores keys, add logic to detect and sign.
        let response = await fetch(downloadUrl)
        if (!response.ok && resume.source_metadata && typeof resume.source_metadata === "object") {
          const key = (resume.source_metadata as any).key as string | undefined
          if (key) {
            try {
              // Attempt to presign in case the object is private
              const { getSignedDownloadUrl } = await import("@/lib/storage")
              downloadUrl = await getSignedDownloadUrl(key, 300)
              response = await fetch(downloadUrl)
            } catch (e) {
              console.warn("Presign fallback failed:", e)
            }
          }
        }
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)
        const arrayBuf = await response.arrayBuffer()
        base64Data = Buffer.from(arrayBuf).toString("base64")
      } catch (e) {
        console.error("Failed to fetch resume file from URL:", e)
        return NextResponse.json({ error: "Unable to fetch resume file for extraction" }, { status: 400 })
      }
    }

    // Use AI to extract structured content with vision/document capabilities
    const safeBase64 = base64Data ?? ""
    const { text } = await generateText({
      model: openai("gpt-4o"),  // Use full gpt-4o for vision/document processing
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract and structure ALL text content from this resume document.

IMPORTANT: Extract COMPLETE information from ALL sections, not summaries.

Please extract all sections clearly:

**PERSONAL INFORMATION**
- Full name, email, phone, location, LinkedIn/Portfolio URLs

**PROFESSIONAL SUMMARY**
- Complete professional overview

**WORK EXPERIENCE**
- ALL job titles, companies, employment dates
- COMPLETE descriptions of responsibilities and achievements
- All quantified results and metrics
- Every bullet point and detail

**EDUCATION**
- ALL degrees, institutions, graduation dates
- Complete coursework, honors, GPA if mentioned

**SKILLS**
- ALL technical skills, soft skills, tools, languages, frameworks, certifications

**ADDITIONAL SECTIONS**
- ALL projects with complete descriptions
- ALL publications, awards, honors
- Volunteer work, languages, etc.

Extract EVERYTHING - do not summarize or truncate. The full content will be used for job-specific resume optimization.`,
            },
            {
              type: "image",
              image: safeBase64,
              mimeType: resume.file_type,
            },
          ],
        },
      ],
    })

    // Update the resume with extracted content
    await updateResumeContent(resume_id, text)

    return NextResponse.json({
      success: true,
      content: text,
      message: "Content extracted successfully",
    })
  } catch (error) {
    console.error("Content extraction error:", error)
    return NextResponse.json({ error: "Failed to extract content" }, { status: 500 })
  }
}
