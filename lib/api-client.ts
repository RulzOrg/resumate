/**
 * API client with automatic retry and better error handling
 */

import { retryWithBackoff, parseApiError, isRetryableError } from './error-handler'

interface FetchOptions extends RequestInit {
  retry?: boolean
  maxRetries?: number
  timeout?: number
}

/**
 * Enhanced fetch with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    retry = true,
    maxRetries = 3,
    timeout = 30000,
    ...fetchOptions
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const fetchFn = async () => {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}`)
        error.response = {
          status: response.status,
          data: await response.json().catch(() => ({}))
        }
        throw error
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  if (retry) {
    return retryWithBackoff(fetchFn, {
      maxRetries,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt}/${maxRetries}`, error.message)
      }
    })
  }

  return fetchFn()
}

/**
 * POST request with retry
 */
export async function postWithRetry<T = any>(
  url: string,
  data: any,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data),
    ...options
  })

  return response.json()
}

/**
 * GET request with retry
 */
export async function getWithRetry<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'GET',
    ...options
  })

  return response.json()
}

/**
 * PATCH request with retry
 */
export async function patchWithRetry<T = any>(
  url: string,
  data: any,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data),
    ...options
  })

  return response.json()
}

/**
 * DELETE request with retry
 */
export async function deleteWithRetry<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'DELETE',
    ...options
  })

  return response.json()
}
