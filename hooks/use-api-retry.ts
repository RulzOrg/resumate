/**
 * React hook for API calls with retry functionality
 *
 * Provides state management and UI feedback for API calls with automatic retry.
 */

import { useState, useCallback, useRef } from 'react'
import { fetchWithRetry, ApiError, RetryOptions, initialRetryState, RetryState } from '@/lib/utils/api-retry'

export interface UseApiRetryOptions extends RetryOptions {
  /** Whether to show retry countdown in the UI */
  showCountdown?: boolean
}

export interface UseApiRetryResult<T> {
  /** Execute the API call */
  execute: () => Promise<T | null>
  /** Current loading state */
  isLoading: boolean
  /** Current retry state */
  retryState: RetryState
  /** The successful response data */
  data: T | null
  /** Error message if the request failed */
  error: string | null
  /** Reset the state */
  reset: () => void
}

/**
 * Hook for making API calls with automatic retry
 *
 * @example
 * ```tsx
 * function AnalysisStep() {
 *   const {
 *     execute,
 *     isLoading,
 *     retryState,
 *     data,
 *     error,
 *   } = useApiRetry<AnalysisResult>({
 *     url: '/api/optimize-flow/analyze',
 *     method: 'POST',
 *     body: { resume_id: resumeId, job_description: jobDescription },
 *   })
 *
 *   return (
 *     <div>
 *       {retryState.isRetrying && (
 *         <div>Retrying... Attempt {retryState.retryCount} of 3</div>
 *       )}
 *       {error && <div className="error">{error}</div>}
 *       <button onClick={execute} disabled={isLoading}>
 *         {isLoading ? 'Analyzing...' : 'Start Analysis'}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useApiRetry<T>(config: {
  url: string
  method?: string
  body?: any
  headers?: HeadersInit
  options?: UseApiRetryOptions
}): UseApiRetryResult<T> {
  const [isLoading, setIsLoading] = useState(false)
  const [retryState, setRetryState] = useState<RetryState>(initialRetryState)
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Use ref to track countdown interval
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const execute = useCallback(async (): Promise<T | null> => {
    setIsLoading(true)
    setError(null)
    setRetryState(initialRetryState)
    clearCountdown()

    try {
      const response = await fetchWithRetry(
        config.url,
        {
          method: config.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...config.headers,
          },
          body: config.body ? JSON.stringify(config.body) : undefined,
        },
        {
          ...config.options,
          onRetry: (attempt, err, delay) => {
            setRetryState({
              isRetrying: true,
              retryCount: attempt,
              lastError: err,
              nextRetryIn: delay,
            })

            // Start countdown if enabled
            if (config.options?.showCountdown) {
              let remaining = delay
              countdownRef.current = setInterval(() => {
                remaining -= 100
                if (remaining <= 0) {
                  clearCountdown()
                } else {
                  setRetryState((prev) => ({
                    ...prev,
                    nextRetryIn: remaining,
                  }))
                }
              }, 100)
            }

            config.options?.onRetry?.(attempt, err, delay)
          },
          onFinalError: (err, attempts) => {
            clearCountdown()
            setRetryState({
              isRetrying: false,
              retryCount: 0,
              lastError: err,
              nextRetryIn: null,
            })
            config.options?.onFinalError?.(err, attempts)
          },
        }
      )

      clearCountdown()
      const result = await response.json()
      setData(result)
      setRetryState(initialRetryState)
      return result
    } catch (err) {
      clearCountdown()
      const message = err instanceof ApiError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'An unexpected error occurred'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [config.url, config.method, config.body, config.headers, config.options, clearCountdown])

  const reset = useCallback(() => {
    clearCountdown()
    setIsLoading(false)
    setRetryState(initialRetryState)
    setData(null)
    setError(null)
  }, [clearCountdown])

  return {
    execute,
    isLoading,
    retryState,
    data,
    error,
    reset,
  }
}

/**
 * Simplified hook for POST requests with JSON body
 */
export function useApiPost<TBody, TResponse>(
  url: string,
  options?: UseApiRetryOptions
) {
  const [isLoading, setIsLoading] = useState(false)
  const [retryState, setRetryState] = useState<RetryState>(initialRetryState)
  const [error, setError] = useState<string | null>(null)

  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const post = useCallback(async (body: TBody): Promise<TResponse | null> => {
    setIsLoading(true)
    setError(null)
    setRetryState(initialRetryState)
    clearCountdown()

    try {
      const response = await fetchWithRetry(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        {
          ...options,
          onRetry: (attempt, err, delay) => {
            setRetryState({
              isRetrying: true,
              retryCount: attempt,
              lastError: err,
              nextRetryIn: delay,
            })

            if (options?.showCountdown) {
              let remaining = delay
              countdownRef.current = setInterval(() => {
                remaining -= 100
                if (remaining <= 0) {
                  clearCountdown()
                } else {
                  setRetryState((prev) => ({
                    ...prev,
                    nextRetryIn: remaining,
                  }))
                }
              }, 100)
            }

            options?.onRetry?.(attempt, err, delay)
          },
          onFinalError: (err, attempts) => {
            clearCountdown()
            setRetryState({
              isRetrying: false,
              retryCount: 0,
              lastError: err,
              nextRetryIn: null,
            })
            options?.onFinalError?.(err, attempts)
          },
        }
      )

      clearCountdown()
      const result = await response.json()
      setRetryState(initialRetryState)
      return result as TResponse
    } catch (err) {
      clearCountdown()
      const message = err instanceof ApiError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'An unexpected error occurred'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [url, options, clearCountdown])

  const reset = useCallback(() => {
    clearCountdown()
    setIsLoading(false)
    setRetryState(initialRetryState)
    setError(null)
  }, [clearCountdown])

  return {
    post,
    isLoading,
    retryState,
    error,
    reset,
  }
}
