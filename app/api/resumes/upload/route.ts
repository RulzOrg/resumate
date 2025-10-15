import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createResume, getOrCreateUser } from "@/lib/db"
import { buildS3Key, uploadBufferToS3 } from "@/lib/storage"
import { indexResume } from "@/lib/resume-indexer"

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

    // Upload file to S3 and store URL
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const key = buildS3Key({ userId: user.id, kind: "uploaded", fileName: file.name })
    const { url: fileUrl } = await uploadBufferToS3({ buffer, key, contentType: file.type })

    let extractionSuccess = false
    let contentText = ""
    try {
      const base64 = buffer.toString("base64")
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
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
      extractionSuccess = true
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
      kind: "uploaded",
      processing_status: extractionSuccess ? "completed" : "failed",
      extracted_at: new Date().toISOString(),
      source_metadata: { storage: "r2", key },
    })

    // Index resume into Qdrant for evidence search
    let indexingResult = null
    if (extractionSuccess && contentText.length > 50) {
      try {
        console.log(`[upload] Starting indexing for resume ${resume.id}...`)
        indexingResult = await indexResume({
          resumeId: resume.id,
          userId: user.id,
          content: contentText,
          metadata: {
            file_name: file.name,
            file_type: file.type,
            title: title,
            indexed_at: new Date().toISOString()
          }
        })

        if (indexingResult.success) {
          console.log(`[upload] ✓ Resume ${resume.id} indexed: ${indexingResult.chunksIndexed} chunks`)
        } else {
          console.warn(`[upload] ✗ Resume ${resume.id} indexing failed: ${indexingResult.error}`)
        }
      } catch (err: any) {
        console.error(`[upload] Resume indexing error for ${resume.id}:`, err.message)
        // Don't fail the upload if indexing fails
      }
    }

    return NextResponse.json({
      resume,
      indexing: indexingResult ? {
        success: indexingResult.success,
        chunksIndexed: indexingResult.chunksIndexed,
        error: indexingResult.error
      } : null
    })
  } catch (error) {
    console.error("Resume upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
