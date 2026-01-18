"use client"

import { cn } from "@/lib/utils"
import { RefreshCw, AlertCircle, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RetryState } from "@/lib/utils/api-retry"

interface RetryIndicatorProps {
  /** The current retry state */
  retryState: RetryState
  /** Error message to display when all retries failed */
  error?: string | null
  /** Callback to manually trigger a retry */
  onRetry?: () => void
  /** Whether a manual retry is in progress */
  isRetrying?: boolean
  /** Additional CSS classes */
  className?: string
  /** Maximum retries for display purposes (default: 3) */
  maxRetries?: number
}

/**
 * Displays retry status and allows manual retry
 *
 * @example
 * ```tsx
 * <RetryIndicator
 *   retryState={retryState}
 *   error={error}
 *   onRetry={handleRetry}
 * />
 * ```
 */
export function RetryIndicator({
  retryState,
  error,
  onRetry,
  isRetrying,
  className,
  maxRetries = 3,
}: RetryIndicatorProps) {
  // Don't show anything if there's no retry activity and no error
  if (!retryState.isRetrying && !error) {
    return null
  }

  // Show retry in progress
  if (retryState.isRetrying) {
    const progressPercent = retryState.nextRetryIn
      ? Math.max(0, 100 - (retryState.nextRetryIn / 1000) * 10)
      : 0

    return (
      <div
        className={cn(
          "rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400">
              Connection Issue - Retrying...
            </h4>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
              Attempt {retryState.retryCount} of {maxRetries}
              {retryState.nextRetryIn && (
                <> • Retrying in {Math.ceil(retryState.nextRetryIn / 1000)}s</>
              )}
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-amber-200 dark:bg-amber-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error with retry option
  if (error) {
    const isNetworkError =
      error.toLowerCase().includes("network") ||
      error.toLowerCase().includes("fetch") ||
      error.toLowerCase().includes("connection")

    return (
      <div
        className={cn(
          "rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            {isNetworkError ? (
              <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-red-700 dark:text-red-400">
              {isNetworkError ? "Connection Failed" : "Request Failed"}
            </h4>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
              {error}
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="mt-3 border-red-300 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}

/**
 * Compact inline version of retry indicator
 */
export function RetryIndicatorInline({
  retryState,
  error,
  className,
}: Pick<RetryIndicatorProps, "retryState" | "error" | "className">) {
  if (!retryState.isRetrying && !error) {
    return null
  }

  if (retryState.isRetrying) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400",
          className
        )}
      >
        <RefreshCw className="w-3 h-3 animate-spin" />
        Retrying ({retryState.retryCount}/3)...
      </span>
    )
  }

  if (error) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400",
          className
        )}
      >
        <AlertCircle className="w-3 h-3" />
        {error}
      </span>
    )
  }

  return null
}
