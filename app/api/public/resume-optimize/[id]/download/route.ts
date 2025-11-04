/**
 * Public API Route: Download Optimized Resume
 * GET /api/public/resume-optimize/[id]/download
 *
 * Provides a download URL for the optimized resume
 * Tracks download events for analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getLeadMagnetSubmission,
  markAsDownloaded,
  getLeadMagnetDownloadUrl,
} from '@/lib/lead-magnet';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get submission
    const submission = await getLeadMagnetSubmission(id);

    if (!submission) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Submission not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if optimization is complete
    if (submission.status !== 'completed') {
      return NextResponse.json(
        {
          status: 'error',
          error:
            submission.status === 'processing'
              ? 'Your resume is still being optimized. Please wait.'
              : 'Resume optimization incomplete. Please try again.',
          code: 'NOT_READY',
        },
        { status: 400 }
      );
    }

    // Check if expired
    if (
      submission.download_expires_at &&
      new Date(submission.download_expires_at) < new Date()
    ) {
      return NextResponse.json(
        {
          status: 'error',
          error:
            'This download link has expired. Please submit your resume again.',
          code: 'EXPIRED',
        },
        { status: 410 }
      );
    }

    // Generate fresh download URL
    const downloadUrl = await getLeadMagnetDownloadUrl(id);

    if (!downloadUrl) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Failed to generate download link',
          code: 'DOWNLOAD_FAILED',
        },
        { status: 500 }
      );
    }

    // Mark as downloaded (first time only)
    if (!submission.downloaded_at) {
      await markAsDownloaded(id);
    }

    console.log('[Lead Magnet] Download URL generated:', {
      id,
      email: submission.email,
    });

    return NextResponse.json({
      status: 'success',
      data: {
        downloadUrl,
        fileName: submission.original_file_name.replace(
          /\.(pdf|docx|txt)$/i,
          '-optimized.txt'
        ),
        expiresAt: submission.download_expires_at,
      },
    });
  } catch (error: any) {
    console.error('[Lead Magnet] Download failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to get download URL. Please try again.',
        code: 'DOWNLOAD_FAILED',
      },
      { status: 500 }
    );
  }
}
