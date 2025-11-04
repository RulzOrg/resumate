/**
 * Public API Route: Submit Email and Optimize Resume
 * POST /api/public/resume-optimize/[id]/submit
 *
 * Accepts email for a previously uploaded resume
 * Triggers immediate optimization and sends email with optimized resume
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { sql } from '@/lib/db';
import {
  getLeadMagnetSubmission,
  updateLeadMagnetSubmission,
  uploadLeadMagnetFile,
} from '@/lib/lead-magnet';
import {
  analyzeResumeForATS,
  optimizeResumeForATS,
  getImprovementSummary,
} from '@/lib/ats-optimizer';
import { sendOptimizedResumeEmail } from '@/lib/email';
import { addBeehiivSubscriber } from '@/lib/beehiiv';
import { getDownloadUrl } from '@/lib/r2';

// Rate limiter for email submissions (10 per day per IP)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const emailRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '24 h'),
      analytics: true,
      prefix: 'ratelimit:public:email',
    })
  : null;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get IP address for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Parse request body
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Please provide a valid email address',
          code: 'INVALID_EMAIL',
        },
        { status: 400 }
      );
    }

    // Check rate limit (optional - gracefully handle Redis connection failures)
    if (emailRateLimit) {
      try {
        const rateLimitResult = await emailRateLimit.limit(ip);

        if (!rateLimitResult.success) {
          const resetDate = new Date(rateLimitResult.reset);
          return NextResponse.json(
            {
              status: 'error',
              error: `Too many submissions. Please try again after ${resetDate.toLocaleString()}`,
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
        // Log error but don't block the request
        console.warn('[Lead Magnet] Rate limit check failed, allowing request:', rateLimitError);
      }
    } else {
      console.warn('[Lead Magnet] Rate limiting disabled - Redis not configured');
    }

    // Get submission
    const submission = await getLeadMagnetSubmission(id);

    if (!submission) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Upload not found. Please upload your resume again.',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Update with email
    await sql`
      UPDATE lead_magnet_submissions
      SET email = ${email}, status = 'processing'
      WHERE id = ${id}
    `;

    // Get extracted text from metadata
    const metadata = submission.improvements_summary as any;
    const resumeText = metadata?.extractedText || '';

    if (!resumeText) {
      throw new Error('No extracted text available for optimization');
    }

    console.log('[Lead Magnet] Starting optimization:', {
      id,
      email,
      textLength: resumeText.length,
    });

    // Step 1: Analyze resume for ATS
    const analysis = await analyzeResumeForATS(resumeText);

    console.log('[Lead Magnet] Analysis complete:', {
      id,
      score: analysis.score,
      issues: analysis.issues.length,
    });

    // Step 2: Optimize resume
    const optimization = await optimizeResumeForATS(resumeText, analysis);

    console.log('[Lead Magnet] Optimization complete:', {
      id,
      changes: optimization.changes.length,
      keywordsAdded: optimization.keywords_added.length,
    });

    // Step 3: Upload optimized resume
    const optimizedFileName = submission.original_file_name.replace(
      /\.(pdf|docx|txt)$/i,
      '-optimized.txt'
    );
    const optimizedBuffer = Buffer.from(optimization.content, 'utf-8');

    const uploadResult = await uploadLeadMagnetFile(
      optimizedBuffer,
      optimizedFileName,
      'text/plain',
      id
    );

    // Step 4: Update submission with results
    const improvements = getImprovementSummary(analysis, optimization);

    await updateLeadMagnetSubmission(id, {
      status: 'completed',
      optimizedFileUrl: uploadResult.key,
      optimizedFileHash: uploadResult.hash,
      improvementsSummary: {
        analysis,
        optimization,
        improvements,
        extractedText: resumeText,
      },
    });

    // Step 5: Generate download URL (7 days expiry)
    const downloadUrl = await getDownloadUrl(uploadResult.key, 7 * 24 * 60 * 60);

    // Step 6: Send email with optimized resume
    const emailResult = await sendOptimizedResumeEmail({
      email,
      downloadUrl,
      improvements,
      expiresInDays: 7,
    });

    if (emailResult.success) {
      await updateLeadMagnetSubmission(id, {
        emailSentAt: new Date(),
      });
    }

    // Step 7: Add to Beehiiv newsletter (non-blocking)
    addBeehiivSubscriber(email, {
      utmSource: 'resume-builder',
      utmCampaign: 'lead-magnet',
      customFields: {
        ats_score: analysis.score.toString(),
        submission_id: id,
      },
    }).catch((error) => {
      console.warn('[Lead Magnet] Beehiiv subscription failed:', error);
      // Don't fail the request if newsletter signup fails
    });

    console.log('[Lead Magnet] Optimization complete and email sent:', {
      id,
      email,
      emailSent: emailResult.success,
    });

    return NextResponse.json({
      status: 'success',
      data: {
        submissionId: id,
        downloadUrl,
        improvements: improvements.slice(0, 3), // Return top 3 for display
        score: analysis.score,
        emailSent: emailResult.success,
      },
    });
  } catch (error: any) {
    console.error('[Lead Magnet] Optimization failed:', error);

    // Update submission with error
    try {
      await updateLeadMagnetSubmission(params.id, {
        status: 'failed',
        processingError: error.message,
      });
    } catch (updateError) {
      console.error('[Lead Magnet] Failed to update error status:', updateError);
    }

    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to optimize resume. Please try again or contact support.',
        code: 'OPTIMIZATION_FAILED',
      },
      { status: 500 }
    );
  }
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
