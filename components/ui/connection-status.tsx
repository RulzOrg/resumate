"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOnlineStatus, useIsOnline } from "@/hooks/use-online-status"

interface ConnectionStatusProps {
  className?: string
  /** Show as a floating banner (default) or inline */
  variant?: "banner" | "inline" | "minimal"
  /** Whether to auto-hide when online (default: true) */
  autoHide?: boolean
  /** Callback when connection is restored */
  onReconnect?: () => void
}

/**
 * Displays connection status with offline warning
 *
 * @example
 * ```tsx
 * // As a floating banner at top of page
 * <ConnectionStatus variant="banner" />
 *
 * // Inline in a form
 * <ConnectionStatus variant="inline" />
 * ```
 */
export function ConnectionStatus({
  className,
  variant = "banner",
  autoHide = true,
  onReconnect,
}: ConnectionStatusProps) {
  const { isOnline, isConnected, isChecking, checkConnection, error } = useOnlineStatus({
    enablePing: true,
    pingInterval: 30000,
  })

  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  // Track reconnection
  useEffect(() => {
    if (!isOnline || !isConnected) {
      setWasOffline(true)
    } else if (wasOffline && isOnline && isConnected) {
      setShowReconnected(true)
      onReconnect?.()
      // Hide reconnected message after 3 seconds
      const timer = setTimeout(() => {
        setShowReconnected(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, isConnected, wasOffline, onReconnect])

  // Don't show anything if online and autoHide is enabled
  if (autoHide && isOnline && isConnected && !showReconnected) {
    return null
  }

  // Reconnected state
  if (showReconnected) {
    if (variant === "minimal") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400",
            className
          )}
        >
          <CheckCircle2 className="w-3 h-3" />
          Connected
        </span>
      )
    }

    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg",
          "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20",
          variant === "banner" && "fixed top-4 left-1/2 -translate-x-1/2 z-50 shadow-lg",
          className
        )}
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Connection restored
        </span>
      </div>
    )
  }

  // Offline state
  if (!isOnline || !isConnected) {
    if (variant === "minimal") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400",
            className
          )}
        >
          <WifiOff className="w-3 h-3" />
          Offline
        </span>
      )
    }

    if (variant === "inline") {
      return (
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-3 rounded-lg",
            "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20",
            className
          )}
        >
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                You're offline
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">
                {error || "Check your internet connection"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkConnection}
            disabled={isChecking}
            className="shrink-0 border-red-300 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20"
          >
            {isChecking ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </>
            )}
          </Button>
        </div>
      )
    }

    // Banner variant
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-4 py-3 rounded-lg shadow-lg",
          "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20",
          "fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              No internet connection
            </p>
            <p className="text-xs text-red-600/70 dark:text-red-400/70">
              {error || "Please check your connection and try again"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkConnection}
          disabled={isChecking}
          className="shrink-0 border-red-300 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20"
        >
          {isChecking ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>
    )
  }

  return null
}

/**
 * Wrapper that prevents children from rendering when offline
 */
export function OnlineOnly({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const isOnline = useIsOnline()

  if (!isOnline) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}

/**
 * Hook-style component that provides offline-aware submit handler
 */
export function useOfflineAwareSubmit(
  onSubmit: () => Promise<void>,
  options?: { onOffline?: () => void }
) {
  const isOnline = useIsOnline()

  const handleSubmit = async () => {
    if (!isOnline) {
      options?.onOffline?.()
      return
    }
    await onSubmit()
  }

  return {
    handleSubmit,
    isOnline,
  }
}
