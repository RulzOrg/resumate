/**
 * POST /api/public/ats-check
 * Upload resume for ATS checking (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { uploadLeadMagnetFile } from '@/lib/supabase-storage'
import { createATSCheck, getQuickPreview } from '@/lib/ats-checker'
import { extractText } from '@/lib/extract'

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
    if (!ALLOWED_EXTENSIONS.includes(fileExtension) && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Invalid file type',
          code: 'INVALID_FILE_TYPE',
          userMessage: 'Please upload a PDF, DOCX, or TXT file.',
        },
        { status: 400 }
      )
    }

    // Generate check ID
    const checkId = uuidv4()

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload file to storage
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

    // Extract text from file
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
