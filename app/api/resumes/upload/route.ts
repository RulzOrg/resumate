import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createResume, getOrCreateUser } from "@/lib/db"

import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or create user in our database
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string

    if (!file || !title) {
      return NextResponse.json({ error: "File and title are required" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Please upload a PDF or Word document." }, { status: 400 })
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    // Convert file to base64 for storage (in a real app, you'd upload to cloud storage)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const fileUrl = `data:${file.type};base64,${base64}`

    let contentText = ""
    try {
      const { text } = await generateText({
        model: openai.responses("gpt-5"),
        prompt: `Extract all text content from this resume file. The file is in ${file.type} format.
        
        Please extract and organize the content with clear section headers:
        
        PERSONAL INFORMATION:
        - Name, contact details, location, LinkedIn, portfolio, etc.
        
        PROFESSIONAL SUMMARY/OBJECTIVE:
        - Any summary or objective statement
        
        WORK EXPERIENCE:
        - Job titles, companies, dates, descriptions, achievements
        
        EDUCATION:
        - Degrees, institutions, dates, GPA if mentioned
        
        SKILLS:
        - Technical skills, soft skills, languages, certifications
        
        ADDITIONAL SECTIONS:
        - Projects, publications, awards, volunteer work, etc.
        
        Extract ALL text content accurately, maintaining the structure and formatting where possible.
        
        File data: ${base64.substring(0, 2000)}...`,
      })
      contentText = text
    } catch (extractionError) {
      console.error("Content extraction error:", extractionError)
      // Fallback content if extraction fails
      contentText = `Resume content from ${file.name}. Content extraction in progress - please re-upload if optimization doesn't work properly.`
    }

    const resume = await createResume({
      user_id: user.id,
      title,
      file_name: file.name,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
      content_text: contentText,
    })

    return NextResponse.json({ resume })
  } catch (error) {
    console.error("Resume upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
