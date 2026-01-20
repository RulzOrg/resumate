"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { OptimizeFlowWizard } from "@/components/optimize-flow/OptimizeFlowWizard"
import { SessionPicker } from "@/components/optimize-flow/SessionPicker"
import type { FlowStep } from "@/lib/types/optimize-flow"

interface Resume {
  id: string
  title: string
  file_name: string
  processing_status: string
  kind: string
}

interface SessionSummary {
  id: string
  resume_id: string
  job_title: string
  company_name: string | null
  current_step: FlowStep
  status: string
  last_active_at: string
  created_at: string
  resume_title?: string
  resume_file_name?: string
}

interface SessionData {
  id: string
  current_step: FlowStep
  resume_id: string
  resume_text?: string
  parsed_resume?: any
  job_title: string
  job_description: string
  company_name?: string
  analysis_result?: any
  rewrite_result?: any
  edited_content?: any
  reviewed_resume?: any
  ats_scan_result?: any
  interview_prep_result?: any
}

interface OptimizeFlowPageClientProps {
  resumes: Resume[]
  initialSessions: SessionSummary[]
}

export function OptimizeFlowPageClient({
  resumes,
  initialSessions,
}: OptimizeFlowPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sessions, setSessions] = useState<SessionSummary[]>(initialSessions)
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showWizard, setShowWizard] = useState(initialSessions.length === 0)

  // Check for sessionId in URL params and auto-load it
  useEffect(() => {
    const sessionId = searchParams.get("sessionId")
    if (sessionId && !selectedSession) {
      // Auto-load the session from URL
      setIsLoading(true)
      fetch(`/api/optimize-flow/sessions/${sessionId}`)
        .then((response) => {
          if (!response.ok) throw new Error("Failed to load session")
          return response.json()
        })
        .then((data) => {
          setSelectedSession(data.session)
          setShowWizard(true)
          // Clear the sessionId from URL to avoid re-loading on refresh
          router.replace("/dashboard/optimize-flow", { scroll: false })
        })
        .catch((error) => {
          console.error("Error loading session from URL:", error)
          // Show wizard anyway on error
          setShowWizard(true)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [searchParams, selectedSession, router])

  // Handle selecting a session to resume
  const handleSelectSession = useCallback(async (sessionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/optimize-flow/sessions/${sessionId}`)
      if (!response.ok) {
        throw new Error("Failed to load session")
      }
      const data = await response.json()
      setSelectedSession(data.session)
      setShowWizard(true)
    } catch (error) {
      console.error("Error loading session:", error)
      // Could show a toast here
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle deleting a session
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/optimize-flow/sessions/${sessionId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to delete session")
      }
      // Remove from local state
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (error) {
      console.error("Error deleting session:", error)
    }
  }, [])

  // Handle starting a new optimization
  const handleStartNew = useCallback(() => {
    setSelectedSession(null)
    setShowWizard(true)
  }, [])

  // Show loading state when loading from URL param
  if (isLoading && searchParams.get("sessionId")) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground/60 dark:text-white/60">Loading your session...</p>
        </div>
      </div>
    )
  }

  // If we're showing the wizard
  if (showWizard) {
    return (
      <div className="space-y-6">
        {/* Show session picker above wizard if there are sessions and not currently resuming one */}
        {sessions.length > 0 && !selectedSession && (
          <SessionPicker
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onStartNew={() => {}} // Already showing new wizard
          />
        )}

        <OptimizeFlowWizard
          resumes={resumes}
          initialSession={selectedSession || undefined}
        />
      </div>
    )
  }

  // Show session picker as the main view
  return (
    <div className="space-y-6">
      <SessionPicker
        sessions={sessions}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onStartNew={handleStartNew}
      />

      {/* Empty state if no sessions - this shouldn't happen since we'd show wizard */}
      {sessions.length === 0 && (
        <OptimizeFlowWizard resumes={resumes} />
      )}
    </div>
  )
}
