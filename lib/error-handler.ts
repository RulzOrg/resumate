export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code?: string,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function handleApiError(error: unknown) {
  console.error("API Error:", error)

  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()

    // Configuration-related errors
    if (msg.includes("database_url") || msg.includes("neon") || msg.includes("connection refused")) {
      return {
        error: "Database not configured or unreachable. Please set DATABASE_URL and verify connectivity.",
        code: "DB_CONFIG_ERROR",
        statusCode: 500,
      }
    }

    if (msg.includes("openai") || msg.includes("api key") || msg.includes("unauthorized")) {
      return {
        error: "AI backend not configured or unauthorized. Please verify OPENAI_API_KEY.",
        code: "OPENAI_CONFIG_ERROR",
        statusCode: msg.includes("unauthorized") ? 401 : 500,
      }
    }

    if (msg.includes("clerk") || msg.includes("authentication")) {
      return {
        error: "Authentication backend not fully configured. Please verify Clerk keys.",
        code: "AUTH_CONFIG_ERROR",
        statusCode: 500,
      }
    }

    // Handle specific error types
    if (error.message.includes("rate limit")) {
      return {
        error: "Rate limit exceeded. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
        statusCode: 429,
      }
    }

    if (error.message.includes("timeout")) {
      return {
        error: "Request timeout. Please try again.",
        code: "REQUEST_TIMEOUT",
        statusCode: 408,
      }
    }

    if (error.message.includes("unauthorized")) {
      return {
        error: "Unauthorized access.",
        code: "UNAUTHORIZED",
        statusCode: 401,
      }
    }
  }

  return {
    error: "An unexpected error occurred. Please try again.",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  }
}

export function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  return new Promise(async (resolve, reject) => {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn()
        resolve(result)
        return
      } catch (error) {
        lastError = error as Error

        if (attempt === maxRetries) {
          reject(lastError)
          return
        }

        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  })
}
