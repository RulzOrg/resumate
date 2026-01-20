"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Check, CloudOff, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import type { SaveStatus } from "@/hooks/use-auto-save"

interface SaveStatusIndicatorProps {
  status: SaveStatus
  lastSavedAt: Date | null
  error: string | null
  isOnline?: boolean
  onRetry?: () => void
  className?: string
  /** Position variant */
  variant?: "inline" | "floating"
  /** Auto-hide success status after delay (ms) */
  autoHideDelay?: number
}

function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

/**
 * Non-intrusive save status indicator
 *
 * Shows saving state, success confirmation, error with retry, and offline status.
 *
 * @example
 * ```tsx
 * <SaveStatusIndicator
 *   status={autoSave.state.status}
 *   lastSavedAt={autoSave.state.lastSavedAt}
 *   error={autoSave.state.error}
 *   isOnline={autoSave.isOnline}
 *   onRetry={() => autoSave.flush()}
 * />
 * ```
 */
export function SaveStatusIndicator({
  status,
  lastSavedAt,
  error,
  isOnline = true,
  onRetry,
  className,
  variant = "inline",
  autoHideDelay = 3000,
}: SaveStatusIndicatorProps) {
  const [visible, setVisible] = useState(false)
  const [displayTime, setDisplayTime] = useState<string>("")

  // Show/hide based on status
  useEffect(() => {
    if (status === "saving" || status === "error" || !isOnline) {
      setVisible(true)
    } else if (status === "success") {
      setVisible(true)
      // Auto-hide after delay
      const timeout = setTimeout(() => {
        setVisible(false)
      }, autoHideDelay)
      return () => clearTimeout(timeout)
    } else {
      // idle - show if we have a lastSavedAt
      setVisible(!!lastSavedAt)
    }
  }, [status, isOnline, lastSavedAt, autoHideDelay])

  // Update relative time every 10 seconds
  useEffect(() => {
    if (!lastSavedAt) return

    const updateTime = () => {
      setDisplayTime(getRelativeTime(lastSavedAt))
    }

    updateTime()
    const interval = setInterval(updateTime, 10000)
    return () => clearInterval(interval)
  }, [lastSavedAt])

  if (!visible && status === "idle" && isOnline) {
    return null
  }

  const isFloating = variant === "floating"

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs font-medium transition-all duration-300",
        isFloating && "fixed bottom-4 right-4 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm",
        isFloating && "bg-background/95 border border-border dark:border-white/10",
        !visible && "opacity-0 pointer-events-none",
        visible && "opacity-100",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Offline State */}
      {!isOnline && (
        <>
          <CloudOff className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-600 dark:text-amber-400">
            Offline — will save when connected
          </span>
        </>
      )}

      {/* Saving State */}
      {isOnline && status === "saving" && (
        <>
          <Loader2 className="w-3.5 h-3.5 text-foreground/50 dark:text-white/50 animate-spin" />
          <span className="text-foreground/60 dark:text-white/60">Saving...</span>
        </>
      )}

      {/* Success State */}
      {isOnline && status === "success" && (
        <>
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20">
            <Check className="w-2.5 h-2.5 text-emerald-500" />
          </div>
          <span className="text-emerald-600 dark:text-emerald-400">
            Saved {displayTime && `· ${displayTime}`}
          </span>
        </>
      )}

      {/* Error State */}
      {isOnline && status === "error" && (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-red-600 dark:text-red-400">
            {error || "Save failed"}
          </span>
          {onRetry && (
            <button
              onClick={onRetry}
              className={cn(
                "ml-1 flex items-center gap-1 px-2 py-0.5 rounded",
                "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400",
                "transition-colors"
              )}
              aria-label="Retry save"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </>
      )}

      {/* Idle with last saved time */}
      {isOnline && status === "idle" && lastSavedAt && visible && (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
          <span className="text-foreground/40 dark:text-white/40">
            Saved {displayTime}
          </span>
        </>
      )}
    </div>
  )
}
