"use client"

import { useState, useEffect, useCallback } from "react"

export interface OnlineStatusState {
  /** Whether the browser reports being online */
  isOnline: boolean
  /** Whether we've verified connectivity with a ping */
  isConnected: boolean
  /** Whether we're currently checking connectivity */
  isChecking: boolean
  /** Last time connectivity was checked */
  lastChecked: Date | null
  /** Error message if connectivity check failed */
  error: string | null
}

export interface UseOnlineStatusOptions {
  /** Whether to perform periodic connectivity checks (default: true) */
  enablePing?: boolean
  /** Interval between connectivity checks in ms (default: 30000) */
  pingInterval?: number
  /** URL to ping for connectivity check (default: /api/health or window.origin) */
  pingUrl?: string
  /** Timeout for ping requests in ms (default: 5000) */
  pingTimeout?: number
}

const DEFAULT_OPTIONS: Required<UseOnlineStatusOptions> = {
  enablePing: true,
  pingInterval: 30000, // 30 seconds
  pingUrl: "/api/health",
  pingTimeout: 5000,
}

/**
 * Hook to detect online/offline status with optional ping verification
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOnline, isConnected, checkConnection } = useOnlineStatus()
 *
 *   if (!isOnline) {
 *     return <OfflineBanner />
 *   }
 *
 *   return <MainContent />
 * }
 * ```
 */
export function useOnlineStatus(options?: UseOnlineStatusOptions): OnlineStatusState & {
  /** Manually trigger a connectivity check */
  checkConnection: () => Promise<boolean>
} {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const [state, setState] = useState<OnlineStatusState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isConnected: typeof navigator !== "undefined" ? navigator.onLine : true,
    isChecking: false,
    lastChecked: null,
    error: null,
  })

  // Check connectivity by making a lightweight request
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isChecking: true, error: null }))

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), opts.pingTimeout)

      // Try to fetch with minimal overhead
      const response = await fetch(opts.pingUrl, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const isConnected = response.ok
      setState((prev) => ({
        ...prev,
        isConnected,
        isChecking: false,
        lastChecked: new Date(),
        error: isConnected ? null : `Server returned ${response.status}`,
      }))

      return isConnected
    } catch (error) {
      // Network error or timeout
      const errorMessage =
        error instanceof Error
          ? error.name === "AbortError"
            ? "Connection timeout"
            : error.message
          : "Connection failed"

      setState((prev) => ({
        ...prev,
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
        error: errorMessage,
      }))

      return false
    }
  }, [opts.pingUrl, opts.pingTimeout])

  // Listen to browser online/offline events
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }))
      // Verify with a ping when coming back online
      if (opts.enablePing) {
        checkConnection()
      }
    }

    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        isOnline: false,
        isConnected: false,
        error: "Browser reports offline",
      }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [opts.enablePing, checkConnection])

  // Periodic connectivity checks
  useEffect(() => {
    if (!opts.enablePing || typeof window === "undefined") return

    // Initial check
    checkConnection()

    // Periodic checks
    const intervalId = setInterval(checkConnection, opts.pingInterval)

    return () => clearInterval(intervalId)
  }, [opts.enablePing, opts.pingInterval, checkConnection])

  // Check on visibility change (when user returns to tab)
  useEffect(() => {
    if (typeof document === "undefined" || !opts.enablePing) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkConnection()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [opts.enablePing, checkConnection])

  return {
    ...state,
    checkConnection,
  }
}

/**
 * Simplified hook that just returns online/offline boolean
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}
