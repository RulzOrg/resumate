import { NextRequest, NextResponse } from "next/server"

/**
 * Health check endpoint for connection status monitoring
 *
 * GET /api/health
 *
 * Returns a simple 200 OK response to verify API connectivity.
 * Used by the connection status indicator to verify internet access.
 *
 * Rate limited to 60 requests per minute per IP to prevent abuse.
 */

// Simple in-memory rate limiter
const rateLimit = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX = 60 // 60 requests per minute

// Clean up old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [ip, timestamps] of rateLimit.entries()) {
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)
    if (recent.length === 0) {
      rateLimit.delete(ip)
    } else {
      rateLimit.set(ip, recent)
    }
  }
}, RATE_LIMIT_WINDOW)

function getClientIp(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }
  // Fallback to a default identifier
  return "unknown"
}

function isRateLimited(ip: string): { limited: boolean; remaining: number } {
  const now = Date.now()
  const requests = rateLimit.get(ip) || []
  const recentRequests = requests.filter((t) => now - t < RATE_LIMIT_WINDOW)

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return { limited: true, remaining: 0 }
  }

  recentRequests.push(now)
  rateLimit.set(ip, recentRequests)
  return { limited: false, remaining: RATE_LIMIT_MAX - recentRequests.length }
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const { limited, remaining } = isRateLimited(ip)

  if (limited) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: 60 },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": String(remaining),
      },
    }
  )
}

// Also support HEAD requests for lightweight pings
export async function HEAD(request: NextRequest) {
  const ip = getClientIp(request)
  const { limited, remaining } = isRateLimited(ip)

  if (limited) {
    return new NextResponse(null, {
      status: 429,
      headers: {
        "Retry-After": "60",
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": "0",
      },
    })
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
      "X-RateLimit-Remaining": String(remaining),
    },
  })
}
