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
let redis: Redis | null = null;
let uploadRateLimit: Ratelimit | null = null;

// Initialize Redis with error handling
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    uploadRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      analytics: true,
      prefix: 'ratelimit:public:upload',
    });
  } catch (error) {
    console.warn('[Lead Magnet] Redis initialization failed, rate limiting disabled:', error);
    redis = null;
    uploadRateLimit = null;
  }
}

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

    // Check rate limit with error handling
    if (uploadRateLimit) {
      try {
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
      } catch (rateLimitError) {
        // Log the error but continue processing without rate limiting
        console.warn('[Lead Magnet] Rate limit check failed, continuing without rate limiting:', rateLimitError);
      }
    } else {
      console.warn('[Lead Magnet] Rate limiting disabled - Redis not configured');
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
    console.error('[Lead Magnet] Error stack:', error.stack);
    console.error('[Lead Magnet] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });

    // Return more specific error message in development
    const isDev = process.env.NODE_ENV === 'development';
    const errorMessage = isDev && error.message
      ? `Upload failed: ${error.message}`
      : 'Failed to upload resume. Please try again.';

    return NextResponse.json(
      {
        status: 'error',
        error: errorMessage,
        code: 'UPLOAD_FAILED',
      },
      { status: 500 }
    );
  }
}
