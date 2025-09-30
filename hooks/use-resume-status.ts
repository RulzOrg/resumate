import { useEffect, useState } from "react"

export interface ResumeStatus {
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  error: string | null
  warnings: string[]
  mode: string | null
  pageCount: number | null
  truncated: boolean | null
  progress: number
  message: string
  createdAt: string
  updatedAt: string
}

interface UseResumeStatusOptions {
  resumeId: string
  initialStatus?: "pending" | "processing" | "completed" | "failed"
  enabled?: boolean
  pollingInterval?: number
}

export function useResumeStatus({
  resumeId,
  initialStatus = "pending",
  enabled = true,
  pollingInterval = 2000, // Poll every 2 seconds
}: UseResumeStatusOptions) {
  const [status, setStatus] = useState<ResumeStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Don't poll if disabled or already completed/failed
    if (!enabled || status?.status === "completed" || status?.status === "failed") {
      return
    }

    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/resumes/${resumeId}/status`)

        if (!response.ok) {
          throw new Error(`Failed to fetch status: ${response.statusText}`)
        }

        const data = await response.json()

        if (isMounted) {
          setStatus(data)
          setIsLoading(false)
          setError(null)

          // Continue polling if still processing
          if (data.status === "pending" || data.status === "processing") {
            timeoutId = setTimeout(fetchStatus, pollingInterval)
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch status")
          setIsLoading(false)
          // Retry on error after a longer delay
          timeoutId = setTimeout(fetchStatus, pollingInterval * 2)
        }
      }
    }

    // Initial fetch
    fetchStatus()

    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [resumeId, enabled, pollingInterval, status?.status])

  return {
    status,
    isLoading,
    error,
    isProcessing: status?.status === "pending" || status?.status === "processing",
    isCompleted: status?.status === "completed",
    isFailed: status?.status === "failed",
  }
}
