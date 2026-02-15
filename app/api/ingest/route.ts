import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createResume, getOrCreateUser } from "@/lib/db"
import { buildS3Key, uploadBufferToS3 } from "@/lib/storage"
import { validateFileUpload, sanitizeFilename, basicMalwareScan } from "@/lib/file-validation"
import { extractText } from "@/lib/extract"
import { validateResumeContent } from "@/lib/llm-resume-extractor"
import { createHash } from "crypto"
import type { IngestResponse } from "@/lib/schemas"

/**
 * POST /api/ingest
 *
 * Hardened resume upload endpoint with content validation.
 * Validates that uploaded documents are actually resumes before processing.
 */
export async function POST(request: NextRequest): Promise<NextResponse<IngestResponse>> {
  try {
    // 1. Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { status: "error", error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    // 2. Get or create user in database
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json(
        { status: "error", error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      )
    }

    // 3. Validate file upload (type, size, signature)
    const validation = await validateFileUpload(request)
    if (!validation.valid || !validation.file || !validation.formData) {
      return NextResponse.json(
        { status: "error", error: validation.error || "Invalid file upload", code: "INVALID_FILE" },
        { status: 400 }
      )
    }

    const file = validation.file
    const sanitizedFilename = sanitizeFilename(file.name)

    // 4. Read file content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 5. Malware scan
    const malwareScan = basicMalwareScan(buffer)
    if (!malwareScan.valid) {
      return NextResponse.json(
        { status: "error", error: malwareScan.error || "File failed security scan", code: "MALWARE_DETECTED" },
        { status: 400 }
      )
    }

    // 6. Calculate file hash for deduplication
    const fileHash = createHash("sha256").update(buffer).digest("hex")

    // 7. Extract text content
    console.log(`[ingest] Extracting text from file: ${file.name}`)
    const detectedFileType = validation.validationResult?.fileType || file.type
    const extractResult = await extractText(buffer, detectedFileType)
    const contentText = extractResult.text || ""

    // 8. Check if we got enough text
    if (contentText.length < 50) {
      return NextResponse.json(
        {
          status: "error",
          error: "Could not extract sufficient text from the document. Please try uploading a different format (PDF or DOCX recommended).",
          code: "EXTRACTION_FAILED"
        },
        { status: 400 }
      )
    }

    // 9. CRITICAL: Validate that the content is actually a resume
    console.log(`[ingest] Validating document content...`)
    const contentValidation = await validateResumeContent(contentText)

    if (!contentValidation.isResume) {
      console.log(`[ingest] Document rejected: ${contentValidation.documentType} - ${contentValidation.message}`)
      return NextResponse.json(
        {
          status: "error",
          error: contentValidation.message,
          code: "NOT_A_RESUME"
        },
        { status: 400 }
      )
    }

    console.log(`[ingest] Document validated as resume (confidence: ${contentValidation.confidence})`)

    // 10. Upload to storage
    const key = buildS3Key({ userId: user.id, kind: "master", fileName: sanitizedFilename })
    const { url: fileUrl } = await uploadBufferToS3({
      buffer,
      key,
      contentType: detectedFileType
    })

    // 11. Create resume record
    const resume = await createResume({
      user_id: user.id,
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
      file_name: file.name,
      file_url: fileUrl,
      file_type: detectedFileType,
      file_size: file.size,
      file_hash: fileHash,
      content_text: contentText,
      kind: "master",
      processing_status: "completed",
      source_metadata: {
        storage: "supabase",
        key,
        extraction: {
          chars: extractResult.total_chars,
          warnings: extractResult.warnings,
          mode: extractResult.mode_used,
          provider: extractResult.provider || extractResult.mode_used,
          retries: extractResult.retries || 0,
          confidence: extractResult.confidence ?? 0,
        },
        validation: {
          documentType: contentValidation.documentType,
          confidence: contentValidation.confidence,
        }
      },
    })

    console.log(`[ingest] Resume created successfully: ${resume.id}`)

    // 12. Return success response
    // Note: For now we return success. In future, we can implement fallback
    // logic if structured extraction fails
    return NextResponse.json({
      status: "success",
      resumeId: resume.id,
      parsed: {
        name: undefined, // Will be extracted later during optimization
        summary: undefined,
        skills: [],
      },
      evidenceCount: 0, // Will be populated later
      fileHash,
    })

  } catch (error: any) {
    console.error("[ingest] Upload error:", error)
    return NextResponse.json(
      { status: "error", error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}
