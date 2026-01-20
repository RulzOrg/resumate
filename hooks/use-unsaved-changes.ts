"use client"

import { useEffect, useCallback } from "react"

export interface UseUnsavedChangesOptions {
  /** Whether the warning is enabled */
  enabled?: boolean
  /** Custom message to show (browsers may override this) */
  message?: string
  /** Callback to run before unload (e.g., flush pending saves) */
  onBeforeUnload?: () => void | Promise<void>
}

const DEFAULT_MESSAGE = "You have unsaved changes. Are you sure you want to leave?"

/**
 * Hook to warn users before leaving the page with unsaved changes
 *
 * @example
 * ```tsx
 * function OptimizeFlowWizard() {
 *   const { hasPendingChanges, flush } = useAutoSave({ sessionId })
 *
 *   useUnsavedChanges(hasPendingChanges, {
 *     onBeforeUnload: flush
 *   })
 *
 *   return (...)
 * }
 * ```
 */
export function useUnsavedChanges(
  hasPendingChanges: boolean,
  options?: UseUnsavedChangesOptions
): void {
  const { enabled = true, message = DEFAULT_MESSAGE, onBeforeUnload } = options || {}

  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (!enabled || !hasPendingChanges) {
        return
      }

      // Try to flush pending saves
      if (onBeforeUnload) {
        onBeforeUnload()
      }

      // Standard way to trigger the browser's "leave page?" dialog
      event.preventDefault()
      // Some browsers require returnValue to be set
      event.returnValue = message
      return message
    },
    [enabled, hasPendingChanges, message, onBeforeUnload]
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [handleBeforeUnload])
}
