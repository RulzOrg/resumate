import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, updateResumeContent, getOrCreateUser } from "@/lib/db"
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

    // Extract base64 data from the stored file URL
    const base64Data = resume.file_url.split(",")[1]
    if (!base64Data) {
      return NextResponse.json({ error: "Invalid file data" }, { status: 400 })
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
