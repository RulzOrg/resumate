/**
 * Rate limiting utilities using Upstash Redis
 * Provides rate limits for ingest and rewrite endpoints
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Initialize Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

/**
 * Rate limiter for file ingest endpoint
 * Limit: 10 uploads per hour per user
 */
export const ingestRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      analytics: true,
      prefix: "ratelimit:ingest",
    })
  : null

/**
 * Rate limiter for paragraph-to-bullet rewrite endpoint
 * Limit: 30 rewrites per hour per user
 */
export const rewriteRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 h"),
      analytics: true,
      prefix: "ratelimit:rewrite",
    })
  : null

/**
 * Rate limiter for index operations
 * Limit: 20 index operations per hour per user
 */
export const indexRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 h"),
      analytics: true,
      prefix: "ratelimit:index",
    })
  : null

/**
 * Check rate limit for a given identifier
 *
 * @param limiter - The rate limiter to use
 * @param identifier - User identifier (typically userId)
 * @returns Rate limit result with success status
 */
export async function checkRateLimit(
  limiter: typeof ingestRateLimit,
  identifier: string
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
  error?: string
}> {
  // If rate limiting is not configured, allow all requests
  if (!limiter) {
    console.warn("[RateLimit] Redis not configured, rate limiting disabled")
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    }
  }

  try {
    const result = await limiter.limit(identifier)

    if (!result.success) {
      const resetDate = new Date(result.reset)
      console.warn("[RateLimit] Rate limit exceeded:", {
        identifier: identifier.substring(0, 8) + "...", // Log partial ID only
        limit: result.limit,
        reset: resetDate.toISOString(),
      })

      return {
        success: false,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        error: `Rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}`,
      }
    }

    return {
      success: true,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error: any) {
    console.error("[RateLimit] Rate limit check failed:", {
      error: error.message,
    })

    // On error, allow the request but log it
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      error: "Rate limit check failed, allowing request",
    }
  }
}

/**
 * Format rate limit headers for HTTP response
 *
 * @param result - Rate limit result
 * @returns Headers object
 */
export function getRateLimitHeaders(result: {
  limit: number
  remaining: number
  reset: number
}): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  }
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitEnabled(): boolean {
  return redis !== null
}