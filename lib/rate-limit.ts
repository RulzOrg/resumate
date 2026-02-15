import { Redis } from "@upstash/redis"

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter: number
}

interface RateLimitBackend {
  consume(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult>
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class InMemoryRateLimitBackend implements RateLimitBackend {
  private store: RateLimitStore = {}

  async consume(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now()

    if (this.store[identifier] && now > this.store[identifier].resetTime) {
      delete this.store[identifier]
    }

    if (!this.store[identifier]) {
      this.store[identifier] = {
        count: 0,
        resetTime: now + windowMs,
      }
    }

    if (this.store[identifier].count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((this.store[identifier].resetTime - now) / 1000))
      return {
        success: false,
        limit,
        remaining: 0,
        resetTime: this.store[identifier].resetTime,
        retryAfter,
      }
    }

    this.store[identifier].count += 1

    return {
      success: true,
      limit,
      remaining: limit - this.store[identifier].count,
      resetTime: this.store[identifier].resetTime,
      retryAfter: 0,
    }
  }
}

class DistributedRateLimitBackend implements RateLimitBackend {
  constructor(private readonly redis: Redis) {}

  async consume(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`
    const count = await this.redis.incr(key)

    if (count === 1) {
      await this.redis.pexpire(key, windowMs)
    }

    let ttl = await this.redis.pttl(key)
    if (ttl < 0) {
      await this.redis.pexpire(key, windowMs)
      ttl = windowMs
    }

    const now = Date.now()
    const resetTime = now + ttl
    const success = count <= limit

    return {
      success,
      limit,
      remaining: success ? limit - count : 0,
      resetTime,
      retryAfter: success ? 0 : Math.max(1, Math.ceil(ttl / 1000)),
    }
  }
}

let backend: RateLimitBackend | null = null

function getBackend(): RateLimitBackend {
  if (backend) {
    return backend
  }

  const wantsDistributed = process.env.RATE_LIMIT_BACKEND === "distributed"
  const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

  if (wantsDistributed && hasRedis) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    backend = new DistributedRateLimitBackend(redis)
    return backend
  }

  backend = new InMemoryRateLimitBackend()
  return backend
}

export async function rateLimit(identifier: string, limit = 10, windowMs = 60000): Promise<RateLimitResult> {
  return getBackend().consume(identifier, limit, windowMs)
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
    ...(result.retryAfter > 0 && { "Retry-After": result.retryAfter.toString() }),
  }
}
