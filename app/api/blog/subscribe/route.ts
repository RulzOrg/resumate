import { NextRequest, NextResponse } from 'next/server'
import { subscribeUser, isBeehiivEnabled, safeBeehiivOperation } from '@/lib/beehiiv'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

// Rate limiter for public newsletter subscription
// Limit: 5 subscriptions per hour per IP to prevent abuse
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      analytics: true,
      prefix: 'ratelimit:blog-subscribe',
    })
  : null

// Validation schema
const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  source: z.string().optional().default('blog'),
})

/**
 * POST /api/blog/subscribe
 *
 * Public endpoint for blog visitors to subscribe to the newsletter
 * No authentication required
 */
export async function POST(req: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               'anonymous'

    // Check rate limit
    if (ratelimit) {
      const { success, reset } = await ratelimit.limit(ip)
      if (!success) {
        const resetDate = new Date(reset)
        return NextResponse.json(
          {
            error: `Too many subscription attempts. Please try again after ${resetDate.toLocaleTimeString()}.`,
            success: false,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        )
      }
    }

    // Check if Beehiiv is enabled
    if (!isBeehiivEnabled()) {
      return NextResponse.json(
        {
          error: 'Newsletter subscription is temporarily unavailable',
          success: false,
        },
        { status: 503 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const parseResult = subscribeSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.errors[0]?.message || 'Invalid input',
          success: false,
        },
        { status: 400 }
      )
    }

    const { email, source } = parseResult.data

    // Subscribe to Beehiiv
    const result = await safeBeehiivOperation(
      () =>
        subscribeUser({
          email,
          utmSource: 'useresumate',
          utmMedium: 'blog',
          utmCampaign: source,
          reactivateExisting: true,
          sendWelcomeEmail: true,
        }),
      'blog_subscribe'
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "You're subscribed! Check your inbox for a confirmation email.",
      })
    } else {
      // Handle specific error cases
      if (result.error.error === 'DISABLED') {
        return NextResponse.json(
          {
            error: 'Newsletter subscription is temporarily unavailable',
            success: false,
          },
          { status: 503 }
        )
      }

      console.error('[Blog Subscribe] Failed:', result.error)

      return NextResponse.json(
        {
          error: 'Unable to subscribe at this time. Please try again later.',
          success: false,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Blog Subscribe] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again.',
        success: false,
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
