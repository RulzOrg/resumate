import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createResume, getOrCreateUser } from "@/lib/db"
import { buildS3Key, uploadBufferToS3 } from "@/lib/storage"
import { validateFileUpload, sanitizeFilename, basicMalwareScan } from "@/lib/file-validation"
import { extractText } from "@/lib/extract"

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
    if (!validation.valid || !validation.file) {
      return NextResponse.json(
        { error: validation.error || "Invalid file upload" },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = validation.file
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
    const key = buildS3Key({ userId: user.id, kind: "uploaded", fileName: sanitizedFilename })
    const { url: fileUrl } = await uploadBufferToS3({ 
      buffer, 
      key, 
      contentType: validation.validationResult?.fileType || file.type 
    })

    // Extract text synchronously (MVP simplified flow)
    console.log(`[upload] Extracting text from resume...`)
    const extractResult = await extractText(buffer, file.type)
    
    const contentText = extractResult.text || ""
    const processingStatus = contentText.length > 50 ? "completed" : "failed"
    const processingError = contentText.length <= 50 
      ? "Could not extract sufficient text from the resume. Please try uploading a different format (DOCX recommended)."
      : null

    // Create resume record with extracted content
    const resume = await createResume({
      user_id: user.id,
      title,
      file_name: file.name,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
      content_text: contentText,
      kind: "uploaded",
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

    console.log(`[upload] Resume ${resume.id} created with ${contentText.length} chars extracted`)

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
