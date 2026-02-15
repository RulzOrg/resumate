/**
 * POST /api/public/ats-check
 * Upload resume for ATS checking (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { uploadLeadMagnetFile } from '@/lib/supabase-storage'
import { createATSCheck, getQuickPreview } from '@/lib/ats-checker'
import { extractText } from '@/lib/extract'
import { validateResumeContent } from '@/lib/llm-resume-extractor'
import { validateUploadedFile } from '@/lib/file-validation'
import { getFileExtension } from '@/lib/resume-upload-config'

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Parse form data
    const formData = await request.formData()
    const validation = await validateUploadedFile(formData, 'file')
    const file = formData.get('file') as File | null

    if (!validation.valid || !file) {
      return NextResponse.json(
        {
          status: 'error',
          error: validation.error || 'No file provided',
          code: 'INVALID_FILE_TYPE',
          userMessage: validation.error || 'Please upload a PDF, DOCX, DOC, or TXT file.',
        },
        { status: 400 }
      )
    }
    const fileExtension = getFileExtension(file.name).replace('.', '')

    // Generate check ID
    const checkId = uuidv4()

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from file first to validate content before uploading
    let extractedText: string
    let extractionMode = "unknown"
    let extractionProvider = "unknown"
    try {
      const extractResult = await extractText(buffer, validation.fileType || file.type || 'application/pdf')
      extractedText = extractResult.text
      extractionMode = extractResult.mode_used
      extractionProvider = extractResult.provider || extractResult.mode_used

      // Basic validation - check if it looks like a resume
      if (extractedText.length < 100) {
        return NextResponse.json(
          {
            status: 'error',
            error: 'File content too short',
            code: 'NOT_A_RESUME',
            userMessage: 'This file appears to be empty or too short to be a resume.',
          },
          { status: 400 }
        )
      }

      // CRITICAL: Validate that the content is actually a resume (not a bank statement, invoice, etc.)
      const contentValidation = await validateResumeContent(extractedText)

      if (!contentValidation.isResume) {
        console.log('[ATS Check] Document rejected - not a resume:', {
          documentType: contentValidation.documentType,
          confidence: contentValidation.confidence,
          message: contentValidation.message,
        })
        return NextResponse.json(
          {
            status: 'error',
            error: contentValidation.message,
            code: 'NOT_A_RESUME',
            userMessage: contentValidation.message,
            documentType: contentValidation.documentType,
          },
          { status: 400 }
        )
      }
    } catch (extractError) {
      console.error('[ATS Check] Text extraction failed:', extractError)
      return NextResponse.json(
        {
          status: 'error',
          error: 'Text extraction failed',
          code: 'EXTRACTION_FAILED',
          userMessage: 'Could not read the file content. Please ensure it\'s a valid PDF or DOCX.',
        },
        { status: 400 }
      )
    }

    // Upload file to storage (only after successful extraction and validation)
    let fileUrl: string
    let fileHash: string
    try {
      const uploadResult = await uploadLeadMagnetFile(
        checkId,
        file.name,
        buffer,
        file.type || 'application/octet-stream'
      )
      fileUrl = uploadResult.url
      fileHash = uploadResult.hash
    } catch (uploadError) {
      console.error('[ATS Check] Upload failed:', uploadError)
      return NextResponse.json(
        {
          status: 'error',
          error: 'Upload failed',
          code: 'UPLOAD_FAILED',
          userMessage: 'Failed to upload file. Please try again.',
        },
        { status: 500 }
      )
    }

    // Get UTM params from query string
    const utmSource = request.nextUrl.searchParams.get('utm_source') || undefined
    const utmMedium = request.nextUrl.searchParams.get('utm_medium') || undefined
    const utmCampaign = request.nextUrl.searchParams.get('utm_campaign') || undefined
    const referrer = request.headers.get('referer') || undefined

    // Create database record
    const atsCheck = await createATSCheck({
      originalFileName: file.name,
      originalFileUrl: fileUrl,
      originalFileHash: fileHash,
      fileType: fileExtension,
      fileSize: file.size,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || undefined,
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
    })

    // Get quick preview stats (before email capture)
    const preview = getQuickPreview(extractedText)

    console.log('[ATS Check] Upload successful:', {
      checkId: atsCheck.id,
      fileName: file.name,
      fileSize: file.size,
      extractionMode,
      extractionProvider,
      preview,
    })

    return NextResponse.json({
      status: 'success',
      data: {
        checkId: atsCheck.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: fileExtension,
        preview,
      },
    })
  } catch (error) {
    console.error('[ATS Check] Unexpected error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        userMessage: 'Something went wrong. Please try again.',
      },
      { status: 500 }
    )
  }
}
