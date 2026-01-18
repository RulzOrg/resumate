/**
 * API Retry Utility for Resume Optimization Flow
 *
 * Provides retry logic with exponential backoff for API calls,
 * helping handle transient network errors gracefully.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelay?: number
  /** Maximum delay in ms between retries (default: 10000) */
  maxDelay?: number
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatuses?: number[]
  /** Callback called before each retry attempt */
  onRetry?: (attempt: number, error: Error, delay: number) => void
  /** Callback called when all retries are exhausted */
  onFinalError?: (error: Error, attempts: number) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'onFinalError'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Determines if an error should trigger a retry
 */
function isRetryableError(error: unknown, retryableStatuses: number[]): boolean {
  // Network errors (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }

  // Our custom API error with status
  if (error instanceof ApiError) {
    return error.retryable || (error.status ? retryableStatuses.includes(error.status) : false)
  }

  // Generic error with status property
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as any).status
    return typeof status === 'number' && retryableStatuses.includes(status)
  }

  return false
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay for a retry attempt with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1)
  const cappedDelay = Math.min(exponentialDelay, maxDelay)
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() - 0.5) * 2
  return Math.round(cappedDelay + jitter)
}

/**
 * Fetch with automatic retry on failure
 *
 * @example
 * ```ts
 * const response = await fetchWithRetry('/api/analyze', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * }, {
 *   maxRetries: 3,
 *   onRetry: (attempt, error, delay) => {
 *     console.log(`Retry ${attempt} in ${delay}ms`)
 *   }
 * })
 * ```
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, init)

      // If response is successful, return it
      if (response.ok) {
        return response
      }

      // Check if the status code is retryable
      if (opts.retryableStatuses.includes(response.status) && attempt < opts.maxRetries) {
        const data = await response.json().catch(() => ({}))
        const error = new ApiError(
          data.error || `Request failed with status ${response.status}`,
          response.status,
          data.code,
          true
        )
        lastError = error

        const delay = calculateDelay(attempt + 1, opts.initialDelay, opts.maxDelay, opts.backoffMultiplier)
        opts.onRetry?.(attempt + 1, error, delay)
        await sleep(delay)
        continue
      }

      // Non-retryable error, throw immediately
      const data = await response.json().catch(() => ({}))
      throw new ApiError(
        data.error || `Request failed with status ${response.status}`,
        response.status,
        data.code,
        false
      )
    } catch (error) {
      // Handle network errors and other exceptions
      if (error instanceof ApiError && !error.retryable) {
        throw error
      }

      const isNetworkError = error instanceof TypeError && error.message.includes('fetch')
      const shouldRetry = isNetworkError || isRetryableError(error, opts.retryableStatuses)

      if (shouldRetry && attempt < opts.maxRetries) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const delay = calculateDelay(attempt + 1, opts.initialDelay, opts.maxDelay, opts.backoffMultiplier)
        opts.onRetry?.(attempt + 1, lastError, delay)
        await sleep(delay)
        continue
      }

      // Either not retryable or out of retries
      lastError = error instanceof Error ? error : new Error(String(error))
      break
    }
  }

  // All retries exhausted
  const finalError = lastError || new Error('Request failed after retries')
  opts.onFinalError?.(finalError, opts.maxRetries + 1)
  throw finalError
}

/**
 * React hook style helper to track retry state
 */
export interface RetryState {
  isRetrying: boolean
  retryCount: number
  lastError: Error | null
  nextRetryIn: number | null
}

/**
 * Create a retry state manager for use in React components
 *
 * @example
 * ```ts
 * const [retryState, setRetryState] = useState<RetryState>(initialRetryState)
 *
 * const response = await fetchWithRetry('/api/analyze', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * }, {
 *   onRetry: (attempt, error, delay) => {
 *     setRetryState({
 *       isRetrying: true,
 *       retryCount: attempt,
 *       lastError: error,
 *       nextRetryIn: delay,
 *     })
 *   },
 *   onFinalError: (error) => {
 *     setRetryState({
 *       isRetrying: false,
 *       retryCount: 0,
 *       lastError: error,
 *       nextRetryIn: null,
 *     })
 *   }
 * })
 * ```
 */
export const initialRetryState: RetryState = {
  isRetrying: false,
  retryCount: 0,
  lastError: null,
  nextRetryIn: null,
}

/**
 * Higher-order function that wraps an async function with retry logic
 *
 * @example
 * ```ts
 * const analyzeWithRetry = withRetry(async (data) => {
 *   const response = await fetch('/api/analyze', {
 *     method: 'POST',
 *     body: JSON.stringify(data),
 *   })
 *   if (!response.ok) throw new Error('Failed')
 *   return response.json()
 * })
 *
 * const result = await analyzeWithRetry(data)
 * ```
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): T {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        return await fn(...args)
      } catch (error) {
        const shouldRetry = isRetryableError(error, opts.retryableStatuses)

        if (shouldRetry && attempt < opts.maxRetries) {
          lastError = error instanceof Error ? error : new Error(String(error))
          const delay = calculateDelay(attempt + 1, opts.initialDelay, opts.maxDelay, opts.backoffMultiplier)
          opts.onRetry?.(attempt + 1, lastError, delay)
          await sleep(delay)
          continue
        }

        lastError = error instanceof Error ? error : new Error(String(error))
        break
      }
    }

    const finalError = lastError || new Error('Function failed after retries')
    opts.onFinalError?.(finalError, opts.maxRetries + 1)
    throw finalError
  }) as T
}
