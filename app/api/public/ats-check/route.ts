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

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed file types
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc', 'txt']

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'No file provided',
          code: 'NO_FILE',
          userMessage: 'Please select a resume file to upload.',
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'File too large',
          code: 'FILE_TOO_LARGE',
          userMessage: 'File size must be under 10MB.',
        },
        { status: 400 }
      )
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    const hasValidExtension = ALLOWED_EXTENSIONS.includes(fileExtension)
    const hasValidMimeType = ALLOWED_TYPES.includes(file.type)
    
    if (!hasValidExtension || !hasValidMimeType) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Invalid file type',
          code: 'INVALID_FILE_TYPE',
          userMessage: 'Please upload a PDF, DOCX, or TXT file with a matching file extension and type.',
        },
        { status: 400 }
      )
    }

    // Generate check ID
    const checkId = uuidv4()

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate file signature (magic bytes) for security
    const fileSignature = buffer.subarray(0, 8)
    let isValidSignature = false

    if (fileExtension === 'pdf') {
      // PDF files start with %PDF
      isValidSignature = fileSignature.subarray(0, 4).toString() === '%PDF'
    } else if (fileExtension === 'docx') {
      // DOCX files are ZIP archives, start with PK (50 4B 03 04)
      isValidSignature = fileSignature[0] === 0x50 && fileSignature[1] === 0x4B && 
                         fileSignature[2] === 0x03 && fileSignature[3] === 0x04
    } else if (fileExtension === 'doc') {
      // DOC files start with D0 CF 11 E0 A1 B1 1A E1 (MS Office compound document)
      isValidSignature = fileSignature[0] === 0xD0 && fileSignature[1] === 0xCF && 
                         fileSignature[2] === 0x11 && fileSignature[3] === 0xE0 &&
                         fileSignature[4] === 0xA1 && fileSignature[5] === 0xB1 &&
                         fileSignature[6] === 0x1A && fileSignature[7] === 0xE1
    } else if (fileExtension === 'txt') {
      // TXT files should be readable text (check for non-binary content)
      // Allow if first 512 bytes contain mostly printable ASCII or UTF-8
      const sample = buffer.subarray(0, Math.min(512, buffer.length))
      const nonPrintableCount = sample.filter(byte => (byte < 0x20 && byte !== 0x09 && byte !== 0x0A && byte !== 0x0D) || byte > 0x7E).length
      isValidSignature = nonPrintableCount < sample.length * 0.1 // Less than 10% non-printable
    }

    if (!isValidSignature) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Invalid file signature',
          code: 'INVALID_FILE_SIGNATURE',
          userMessage: 'File content does not match the expected file type. Please ensure the file is not corrupted or renamed.',
        },
        { status: 400 }
      )
    }

    // Extract text from file first to validate content before uploading
    let extractedText: string
    try {
      const extractResult = await extractText(buffer, file.type || 'application/pdf')
      extractedText = extractResult.text

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
