/**
 * Public API Route: Resume Upload for Lead Magnet
 * POST /api/public/resume-optimize
 *
 * Accepts resume uploads without authentication
 * Returns upload ID for subsequent optimization request
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { sql } from '@/lib/db';
import { primaryExtract } from '@/lib/extract';
import {
  createLeadMagnetSubmission,
  uploadLeadMagnetFile,
} from '@/lib/lead-magnet';

// Rate limiter for public uploads (5 per hour per IP)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const uploadRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      analytics: true,
      prefix: 'ratelimit:public:upload',
    })
  : null;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export async function POST(request: NextRequest) {
  try {
    // Get IP address for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit
    if (uploadRateLimit) {
      const rateLimitResult = await uploadRateLimit.limit(ip);

      if (!rateLimitResult.success) {
        const resetDate = new Date(rateLimitResult.reset);
        return NextResponse.json(
          {
            status: 'error',
            error: `Too many uploads. Please try again after ${resetDate.toLocaleTimeString()}`,
            code: 'RATE_LIMIT_EXCEEDED',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            },
          }
        );
      }
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'No file provided',
          code: 'NO_FILE',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Invalid file type. Please upload PDF, DOCX, or TXT files only.',
          code: 'INVALID_FILE_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'File too large. Maximum size is 10MB.',
          code: 'FILE_TOO_LARGE',
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Create temporary submission (without email)
    const tempSubmission = await createLeadMagnetSubmission({
      email: 'pending@temp.com', // Temporary email, will be updated when user submits
      originalFileName: file.name,
      originalFileUrl: 'pending', // Will be updated after upload
      originalFileHash: '', // Will be calculated during upload
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Upload file to storage
    const uploadResult = await uploadLeadMagnetFile(
      fileBuffer,
      file.name,
      file.type,
      tempSubmission.id
    );

    // Update submission with actual file info
    await sql`
      UPDATE lead_magnet_submissions
      SET
        original_file_url = ${uploadResult.key},
        original_file_hash = ${uploadResult.hash}
      WHERE id = ${tempSubmission.id}
    `;

    // Extract resume text (for analysis later)
    console.log('[Lead Magnet] Extracting resume content:', tempSubmission.id);
    const extractResult = await primaryExtract(
      fileBuffer,
      file.type,
      tempSubmission.id
    );

    // Store extracted text in metadata for later use
    await sql`
      UPDATE lead_magnet_submissions
      SET improvements_summary = ${JSON.stringify({ extractedText: extractResult.text })}
      WHERE id = ${tempSubmission.id}
    `;

    console.log('[Lead Magnet] Upload successful:', {
      id: tempSubmission.id,
      fileName: file.name,
      size: file.size,
      extractedChars: extractResult.text.length,
    });

    return NextResponse.json({
      status: 'success',
      data: {
        uploadId: tempSubmission.id,
        fileName: file.name,
        fileSize: file.size,
      },
    });
  } catch (error: any) {
    console.error('[Lead Magnet] Upload failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to upload resume. Please try again.',
        code: 'UPLOAD_FAILED',
      },
      { status: 500 }
    );
  }
}
