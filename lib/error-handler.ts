/**
 * Enhanced error handling utilities
 */

export interface ApiError {
  message: string
  code?: string
  statusCode?: number
  details?: any
  suggestion?: string
}

/**
 * Parse and enhance API errors with actionable suggestions
 */
export function parseApiError(error: any): ApiError {
  // Network errors
  if (error.message === 'Failed to fetch' || error.code === 'ECONNREFUSED') {
    return {
      message: 'Unable to connect to server',
      code: 'NETWORK_ERROR',
      suggestion: 'Please check your internet connection and try again.'
    }
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
    return {
      message: 'Request timed out',
      code: 'TIMEOUT',
      suggestion: 'The server is taking too long to respond. Please try again.'
    }
  }

  // HTTP errors
  if (error.response) {
    const status = error.response.status
    const data = error.response.data

    switch (status) {
      case 400:
        return {
          message: data?.message || 'Invalid request',
          code: 'BAD_REQUEST',
          statusCode: 400,
          suggestion: 'Please check your input and try again.'
        }
      
      case 401:
        return {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          statusCode: 401,
          suggestion: 'Please log in to continue.'
        }
      
      case 403:
        return {
          message: 'Access denied',
          code: 'FORBIDDEN',
          statusCode: 403,
          suggestion: 'You don\'t have permission to perform this action.'
        }
      
      case 404:
        return {
          message: 'Resource not found',
          code: 'NOT_FOUND',
          statusCode: 404,
          suggestion: 'The requested resource could not be found.'
        }
      
      case 429:
        return {
          message: 'Too many requests',
          code: 'RATE_LIMIT',
          statusCode: 429,
          suggestion: 'Please wait a moment before trying again.'
        }
      
      case 500:
      case 502:
      case 503:
        return {
          message: 'Server error',
          code: 'SERVER_ERROR',
          statusCode: status,
          suggestion: 'Our servers are experiencing issues. Please try again in a few moments.'
        }
      
      default:
        return {
          message: data?.message || 'An unexpected error occurred',
          code: 'UNKNOWN',
          statusCode: status,
          suggestion: 'Please try again or contact support if the problem persists.'
        }
    }
  }

  // Generic error
  return {
    message: error.message || 'An unexpected error occurred',
    code: 'UNKNOWN',
    suggestion: 'Please try again. If the problem persists, contact support.'
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    onRetry?: (attempt: number, error: any) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on client errors (400-499) except 429 (rate limit)
      const statusCode = (error as any)?.response?.status
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        throw error
      }

      if (attempt < maxRetries) {
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt),
          maxDelay
        )
        
        if (onRetry) {
          onRetry(attempt + 1, error)
        }

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error.message === 'Failed to fetch' || error.code === 'ECONNREFUSED') {
    return true
  }

  // Timeout errors are retryable
  if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
    return true
  }

  // Rate limit errors are retryable
  if (error.response?.status === 429) {
    return true
  }

  // Server errors (5xx) are retryable
  if (error.response?.status >= 500) {
    return true
  }

  return false
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: any): string {
  const apiError = parseApiError(error)
  
  if (apiError.suggestion) {
    return `${apiError.message}. ${apiError.suggestion}`
  }
  
  return apiError.message
}
