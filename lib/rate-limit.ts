interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export function rateLimit(identifier: string, limit = 10, windowMs = 60000) {
  const now = Date.now()
  const key = identifier

  // Clean up expired entries
  if (store[key] && now > store[key].resetTime) {
    delete store[key]
  }

  // Initialize or get current count
  if (!store[key]) {
    store[key] = {
      count: 0,
      resetTime: now + windowMs,
    }
  }

  // Check if limit exceeded
  if (store[key].count >= limit) {
    const timeUntilReset = Math.ceil((store[key].resetTime - now) / 1000)
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: store[key].resetTime,
      retryAfter: timeUntilReset,
    }
  }

  // Increment count
  store[key].count++

  return {
    success: true,
    limit,
    remaining: limit - store[key].count,
    resetTime: store[key].resetTime,
    retryAfter: 0,
  }
}

export function getRateLimitHeaders(result: ReturnType<typeof rateLimit>) {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
    ...(result.retryAfter > 0 && { "Retry-After": result.retryAfter.toString() }),
  }
}
