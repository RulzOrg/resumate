"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { fetchWithRetry } from "@/lib/utils/api-retry"
import { useOnlineStatus } from "./use-online-status"
import type { FlowStep, EditedContent } from "@/lib/types/optimize-flow"

export type SaveStatus = "idle" | "saving" | "success" | "error"

export interface AutoSaveState {
  status: SaveStatus
  lastSavedAt: Date | null
  error: string | null
  hasPendingChanges: boolean
}

export interface UseAutoSaveOptions {
  /** Session ID to save to (null if no session yet) */
  sessionId: string | null
  /** Debounce delay for edited content saves (default: 2000ms) */
  editedContentDebounceMs?: number
  /** Debounce delay for form data saves (default: 1000ms) */
  formDataDebounceMs?: number
  /** Callback when save starts */
  onSaveStart?: () => void
  /** Callback when save succeeds */
  onSaveSuccess?: () => void
  /** Callback when save fails */
  onSaveError?: (error: string) => void
}

export interface UseAutoSaveReturn {
  /** Current save state */
  state: AutoSaveState
  /** Save step result to backend (awaitable, with retry) */
  saveStepResult: (
    step: FlowStep,
    result: any,
    additionalData?: { resumeText?: string; editedContent?: EditedContent }
  ) => Promise<boolean>
  /** Save edited content (debounced) */
  saveEditedContent: (content: EditedContent) => void
  /** Save form data / session updates (debounced) */
  saveFormData: (data: {
    job_title?: string
    job_description?: string
    company_name?: string
    resume_id?: string
  }) => void
  /** Force immediate save of pending changes */
  flush: () => Promise<boolean>
  /** Whether there are pending changes */
  hasPendingChanges: boolean
  /** Whether currently online */
  isOnline: boolean
}

/**
 * Hook for auto-saving optimization flow data with retry and debouncing
 *
 * @example
 * ```tsx
 * const { state, saveStepResult, saveEditedContent } = useAutoSave({
 *   sessionId: session.id,
 *   onSaveError: (error) => toast.error(error)
 * })
 *
 * // Save step result (awaitable)
 * const success = await saveStepResult(1, analysisResult, { resumeText })
 * if (!success) return // Don't navigate
 *
 * // Save edited content (debounced)
 * saveEditedContent({ professionalSummary, workExperiences })
 * ```
 */
export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const {
    sessionId,
    editedContentDebounceMs = 2000,
    formDataDebounceMs = 1000,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
  } = options

  const { isOnline, isConnected } = useOnlineStatus()

  const [state, setState] = useState<AutoSaveState>({
    status: "idle",
    lastSavedAt: null,
    error: null,
    hasPendingChanges: false,
  })

  // Refs for debouncing
  const editedContentTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const formDataTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingEditedContentRef = useRef<EditedContent | null>(null)
  const pendingFormDataRef = useRef<Record<string, any> | null>(null)

  // Queue for offline saves
  const offlineQueueRef = useRef<Array<() => Promise<boolean>>>([])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (editedContentTimeoutRef.current) {
        clearTimeout(editedContentTimeoutRef.current)
      }
      if (formDataTimeoutRef.current) {
        clearTimeout(formDataTimeoutRef.current)
      }
    }
  }, [])

  // Process offline queue when coming back online
  useEffect(() => {
    if (isOnline && isConnected && offlineQueueRef.current.length > 0) {
      const processQueue = async () => {
        const queue = [...offlineQueueRef.current]
        offlineQueueRef.current = []

        for (const saveFn of queue) {
          await saveFn()
        }
      }
      processQueue()
    }
  }, [isOnline, isConnected])

  /**
   * Save step result to backend with retry
   * Returns true if successful, false otherwise
   */
  const saveStepResult = useCallback(
    async (
      step: FlowStep,
      result: any,
      additionalData?: { resumeText?: string; editedContent?: EditedContent }
    ): Promise<boolean> => {
      if (!sessionId) {
        console.warn("[AutoSave] No session ID, cannot save step result")
        return false
      }

      // If offline, queue for later
      if (!isOnline || !isConnected) {
        offlineQueueRef.current.push(() => saveStepResult(step, result, additionalData))
        setState((prev) => ({ ...prev, hasPendingChanges: true }))
        return true // Optimistically return true since we queued it
      }

      setState((prev) => ({ ...prev, status: "saving", error: null }))
      onSaveStart?.()

      try {
        const response = await fetchWithRetry(
          `/api/optimize-flow/sessions/${sessionId}/save-step`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step,
              result,
              resume_text: additionalData?.resumeText,
              edited_content: additionalData?.editedContent,
            }),
          },
          {
            maxRetries: 3,
            onRetry: (attempt, error, delay) => {
              console.log(`[AutoSave] Retry ${attempt} in ${delay}ms:`, error.message)
            },
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to save step: ${response.status}`)
        }

        setState((prev) => ({
          ...prev,
          status: "success",
          lastSavedAt: new Date(),
          error: null,
          hasPendingChanges: false,
        }))
        onSaveSuccess?.()
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save"
        console.error("[AutoSave] Failed to save step:", message)
        setState((prev) => ({
          ...prev,
          status: "error",
          error: message,
          hasPendingChanges: true,
        }))
        onSaveError?.(message)
        return false
      }
    },
    [sessionId, isOnline, isConnected, onSaveStart, onSaveSuccess, onSaveError]
  )

  /**
   * Internal function to save edited content (called after debounce)
   */
  const doSaveEditedContent = useCallback(
    async (content: EditedContent): Promise<boolean> => {
      if (!sessionId) {
        console.warn("[AutoSave] No session ID, cannot save edited content")
        return false
      }

      // If offline, queue for later
      if (!isOnline || !isConnected) {
        offlineQueueRef.current.push(() => doSaveEditedContent(content))
        return true
      }

      setState((prev) => ({ ...prev, status: "saving", error: null }))

      try {
        const response = await fetchWithRetry(
          `/api/optimize-flow/sessions/${sessionId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ edited_content: content }),
          },
          { maxRetries: 2 }
        )

        if (!response.ok) {
          throw new Error(`Failed to save edited content: ${response.status}`)
        }

        setState((prev) => ({
          ...prev,
          status: "success",
          lastSavedAt: new Date(),
          error: null,
          hasPendingChanges: false,
        }))
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save"
        console.error("[AutoSave] Failed to save edited content:", message)
        setState((prev) => ({
          ...prev,
          status: "error",
          error: message,
          hasPendingChanges: true,
        }))
        return false
      }
    },
    [sessionId, isOnline, isConnected]
  )

  /**
   * Save edited content with debouncing
   */
  const saveEditedContent = useCallback(
    (content: EditedContent) => {
      // Store pending content
      pendingEditedContentRef.current = content
      setState((prev) => ({ ...prev, hasPendingChanges: true }))

      // Clear existing timeout
      if (editedContentTimeoutRef.current) {
        clearTimeout(editedContentTimeoutRef.current)
      }

      // Set new debounced timeout
      editedContentTimeoutRef.current = setTimeout(() => {
        if (pendingEditedContentRef.current) {
          doSaveEditedContent(pendingEditedContentRef.current)
          pendingEditedContentRef.current = null
        }
      }, editedContentDebounceMs)
    },
    [editedContentDebounceMs, doSaveEditedContent]
  )

  /**
   * Internal function to save form data (called after debounce)
   */
  const doSaveFormData = useCallback(
    async (data: Record<string, any>): Promise<boolean> => {
      if (!sessionId) {
        console.warn("[AutoSave] No session ID, cannot save form data")
        return false
      }

      // If offline, queue for later
      if (!isOnline || !isConnected) {
        offlineQueueRef.current.push(() => doSaveFormData(data))
        return true
      }

      setState((prev) => ({ ...prev, status: "saving", error: null }))

      try {
        const response = await fetchWithRetry(
          `/api/optimize-flow/sessions/${sessionId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
          { maxRetries: 2 }
        )

        if (!response.ok) {
          throw new Error(`Failed to save form data: ${response.status}`)
        }

        setState((prev) => ({
          ...prev,
          status: "success",
          lastSavedAt: new Date(),
          error: null,
          hasPendingChanges: false,
        }))
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save"
        console.error("[AutoSave] Failed to save form data:", message)
        setState((prev) => ({
          ...prev,
          status: "error",
          error: message,
          hasPendingChanges: true,
        }))
        return false
      }
    },
    [sessionId, isOnline, isConnected]
  )

  /**
   * Save form data with debouncing
   */
  const saveFormData = useCallback(
    (data: {
      job_title?: string
      job_description?: string
      company_name?: string
      resume_id?: string
    }) => {
      // Store pending data
      pendingFormDataRef.current = { ...pendingFormDataRef.current, ...data }
      setState((prev) => ({ ...prev, hasPendingChanges: true }))

      // Clear existing timeout
      if (formDataTimeoutRef.current) {
        clearTimeout(formDataTimeoutRef.current)
      }

      // Set new debounced timeout
      formDataTimeoutRef.current = setTimeout(() => {
        if (pendingFormDataRef.current) {
          doSaveFormData(pendingFormDataRef.current)
          pendingFormDataRef.current = null
        }
      }, formDataDebounceMs)
    },
    [formDataDebounceMs, doSaveFormData]
  )

  /**
   * Flush all pending saves immediately
   */
  const flush = useCallback(async (): Promise<boolean> => {
    let success = true

    // Clear debounce timeouts
    if (editedContentTimeoutRef.current) {
      clearTimeout(editedContentTimeoutRef.current)
      editedContentTimeoutRef.current = null
    }
    if (formDataTimeoutRef.current) {
      clearTimeout(formDataTimeoutRef.current)
      formDataTimeoutRef.current = null
    }

    // Save pending edited content
    if (pendingEditedContentRef.current) {
      const result = await doSaveEditedContent(pendingEditedContentRef.current)
      pendingEditedContentRef.current = null
      if (!result) success = false
    }

    // Save pending form data
    if (pendingFormDataRef.current) {
      const result = await doSaveFormData(pendingFormDataRef.current)
      pendingFormDataRef.current = null
      if (!result) success = false
    }

    return success
  }, [doSaveEditedContent, doSaveFormData])

  return {
    state,
    saveStepResult,
    saveEditedContent,
    saveFormData,
    flush,
    hasPendingChanges: state.hasPendingChanges,
    isOnline: isOnline && isConnected,
  }
}
