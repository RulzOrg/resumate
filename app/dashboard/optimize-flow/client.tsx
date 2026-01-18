"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  job_title: string
  job_description: string
  company_name?: string
  analysis_result?: any
  rewrite_result?: any
  edited_content?: any
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
  const [sessions, setSessions] = useState<SessionSummary[]>(initialSessions)
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showWizard, setShowWizard] = useState(initialSessions.length === 0)

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
