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

    // Use AI to extract structured content
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Extract and structure the text content from this resume file (${resume.file_type}).
      
      Please extract all sections clearly:
      
      **PERSONAL INFORMATION**
      - Full name
      - Email address
      - Phone number
      - Location
      - LinkedIn/Portfolio URLs
      
      **PROFESSIONAL SUMMARY**
      - Brief professional overview
      
      **WORK EXPERIENCE**
      - Job titles, companies, dates
      - Key responsibilities and achievements
      - Quantified results where possible
      
      **EDUCATION**
      - Degrees, institutions, graduation dates
      - Relevant coursework, honors
      
      **SKILLS**
      - Technical skills
      - Soft skills
      - Certifications
      
      **ADDITIONAL SECTIONS**
      - Projects, publications, awards, etc.
      
      Format the output as clean, structured text with clear section headers.
      
      File data: ${base64Data.substring(0, 2000)}...`,
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
