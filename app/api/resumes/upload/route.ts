import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createResume, getOrCreateUser } from "@/lib/db"
import { buildS3Key, uploadBufferToS3 } from "@/lib/storage"
import { validateFileUpload, sanitizeFilename, basicMalwareScan } from "@/lib/file-validation"
import { inngest } from "@/lib/inngest/client"

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
    const { url: fileUrl } = await uploadBufferToS3({ buffer, key, contentType: validation.validationResult?.fileType || file.type })

    // Create resume record with pending status - extraction will happen via Inngest
    const resume = await createResume({
      user_id: user.id,
      title,
      file_name: file.name,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
      content_text: "", // Will be populated by Inngest job
      kind: "uploaded",
      processing_status: "pending", // Set to pending - Inngest will update to completed/failed
      source_metadata: { storage: "r2", key },
    })

    console.log(`[upload] Resume ${resume.id} created, triggering Inngest processing...`)

    // Trigger Inngest background job for robust text extraction
    // This uses LlamaParse + fallback extractors + AI vision for comprehensive extraction
    try {
      await inngest.send({
        name: "resume/uploaded",
        data: {
          resumeId: resume.id,
          userId: user.id,
          fileKey: key,
          fileType: file.type,
          fileSize: file.size,
          enqueuedAt: new Date().toISOString(),
          deadlineAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minute deadline
        }
      })
      console.log(`[upload] ✓ Inngest job triggered for resume ${resume.id}`)
    } catch (inngestError: any) {
      console.error(`[upload] Failed to trigger Inngest job:`, inngestError.message)
      // Don't fail the upload - the resume is saved, user can manually trigger extraction
    }

    return NextResponse.json({
      resume,
      processing: {
        status: "pending",
        message: "Resume uploaded successfully. Text extraction is processing in the background. This usually takes 10-30 seconds."
      }
    })
  } catch (error) {
    console.error("Resume upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
