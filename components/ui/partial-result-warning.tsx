"use client"

import { cn } from "@/lib/utils"
import { AlertTriangle, Info, AlertCircle } from "lucide-react"
import type { PartialResultWarning } from "@/lib/utils/response-parser"

interface PartialResultWarningProps {
  warnings: PartialResultWarning[]
  isPartial: boolean
  className?: string
  /** Whether to show in compact mode (single line) */
  compact?: boolean
}

/**
 * Displays warnings when LLM responses are partial or have issues
 */
export function PartialResultWarningBanner({
  warnings,
  isPartial,
  className,
  compact = false,
}: PartialResultWarningProps) {
  // Don't show anything if no warnings and not partial
  if (!isPartial && warnings.length === 0) {
    return null
  }

  // Compact mode: single line
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
          "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400",
          className
        )}
      >
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          {warnings.length > 0
            ? warnings[0].message
            : "Some results may be incomplete"}
        </span>
        {warnings.length > 1 && (
          <span className="text-xs opacity-70">+{warnings.length - 1} more</span>
        )}
      </div>
    )
  }

  // Full mode: show all warnings
  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-1">
            Partial Results
          </h4>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mb-2">
            Some data may be incomplete. You can still proceed or try regenerating.
          </p>
          {warnings.length > 0 && (
            <ul className="space-y-1">
              {warnings.slice(0, 3).map((warning, index) => (
                <li key={index} className="flex items-start gap-2 text-xs">
                  {warning.severity === "error" ? (
                    <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                  ) : warning.severity === "warning" ? (
                    <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <Info className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                  )}
                  <span className="text-amber-700 dark:text-amber-300">
                    {warning.message}
                  </span>
                </li>
              ))}
              {warnings.length > 3 && (
                <li className="text-xs text-amber-600/50 dark:text-amber-400/50 pl-5">
                  +{warnings.length - 3} more issues
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Inline version for use in smaller spaces
 */
export function PartialResultBadge({
  isPartial,
  className,
}: {
  isPartial: boolean
  className?: string
}) {
  if (!isPartial) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
        className
      )}
    >
      <AlertTriangle className="w-3 h-3" />
      Partial
    </span>
  )
}
