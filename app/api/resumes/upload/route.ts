import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createResume, getOrCreateUser } from "@/lib/db"
import { buildS3Key, uploadBufferToS3 } from "@/lib/storage"
import { validateFileUpload, sanitizeFilename, basicMalwareScan } from "@/lib/file-validation"
import { extractText } from "@/lib/extract"
import { validateResumeContent } from "@/lib/llm-resume-extractor"

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

    // Validate file upload with comprehensive security checks
    const validation = await validateFileUpload(request)
    if (!validation.valid || !validation.file || !validation.formData) {
      return NextResponse.json(
        { error: validation.error || "Invalid file upload" },
        { status: 400 }
      )
    }

    const file = validation.file
    const formData = validation.formData
    const title = formData.get("title") as string

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Sanitize filename for storage
    const sanitizedFilename = sanitizeFilename(file.name)

    // Read file content for additional validation and upload
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Basic malware scan
    const malwareScan = basicMalwareScan(buffer)
    if (!malwareScan.valid) {
      return NextResponse.json(
        { error: malwareScan.error || "File failed security scan" },
        { status: 400 }
      )
    }

    // Upload file to S3 with sanitized filename
    const key = buildS3Key({ userId: user.id, kind: "master", fileName: sanitizedFilename })
    const { url: fileUrl } = await uploadBufferToS3({ 
      buffer, 
      key, 
      contentType: validation.validationResult?.fileType || file.type 
    })

    // Extract text synchronously (MVP simplified flow)
    console.log(`[upload] Extracting text from resume...`)
    const extractResult = await extractText(buffer, file.type)
    
    const contentText = extractResult.text || ""

    // Check if we got enough text
    if (contentText.length < 50) {
      return NextResponse.json(
        { error: "Could not extract sufficient text from the document. Please try uploading a different format (PDF or DOCX recommended)." },
        { status: 400 }
      )
    }

    // CRITICAL: Validate that the content is actually a resume
    console.log(`[upload] Validating document content...`)
    const contentValidation = await validateResumeContent(contentText)

    if (!contentValidation.isResume) {
      console.log(`[upload] Document rejected: ${contentValidation.documentType} - ${contentValidation.message}`)
      return NextResponse.json(
        { error: contentValidation.message },
        { status: 400 }
      )
    }

    console.log(`[upload] Document validated as resume (confidence: ${contentValidation.confidence})`)

    const processingStatus = "completed"
    const processingError = null

    // Create resume record with extracted content
    console.log('[upload] Creating resume record:', {
      user_id: user.id,
      clerk_user_id: user.clerk_user_id,
      title,
      file_type: file.type,
      content_length: contentText.length,
    })
    
    const resume = await createResume({
      user_id: user.id,
      title,
      file_name: file.name,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
      content_text: contentText,
      kind: "master",
      processing_status: processingStatus,
      processing_error: processingError,
      source_metadata: { 
        storage: "r2", 
        key,
        extraction: {
          chars: extractResult.total_chars,
          warnings: extractResult.warnings,
          mode: extractResult.mode_used,
        }
      },
    })

    console.log(`[upload] Resume created successfully:`, {
      resume_id: resume.id,
      user_id: resume.user_id,
      title: resume.title,
      content_length: contentText.length,
      status: processingStatus,
    })

    return NextResponse.json({
      resume,
      processing: {
        status: processingStatus,
        message: processingStatus === "completed" 
          ? "Resume uploaded and processed successfully."
          : processingError,
        chars_extracted: extractResult.total_chars,
        warnings: extractResult.warnings,
      }
    })
  } catch (error) {
    console.error("Resume upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
