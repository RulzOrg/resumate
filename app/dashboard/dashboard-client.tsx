"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AnalysisStep } from "@/components/optimize-flow/steps/AnalysisStep"
import { GeneratedResumesCompactList } from "@/components/optimization/GeneratedResumesCompactList"
import { ResumeSessionBanner } from "@/components/dashboard/resume-session-banner"
import type { AnalysisResult, FlowStep } from "@/lib/types/optimize-flow"
import type { OptimizedResume } from "@/lib/db"

interface Resume {
  id: string
  title: string
  file_name: string
  processing_status: string
  kind: string
}

// Type matches what getUserOptimizedResumes returns and what GeneratedResumesCompactList expects
type OptimizedResumeWithMeta = OptimizedResume & {
  original_resume_title?: string
  job_title?: string
  company_name?: string | null
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

interface DashboardClientProps {
  resumes: Resume[]
  optimizedResumes: OptimizedResumeWithMeta[]
  inProgressSessions: SessionSummary[]
}

/**
 * Create a session and save the analysis result
 */
async function createSessionWithAnalysis(data: {
  resumeId: string
  resumeText: string
  jobTitle: string
  jobDescription: string
  companyName?: string
  analysisResult: AnalysisResult
}): Promise<string | null> {
  try {
    // Create session
    const sessionResponse = await fetch("/api/optimize-flow/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume_id: data.resumeId,
        job_title: data.jobTitle,
        job_description: data.jobDescription,
        company_name: data.companyName,
        resume_text: data.resumeText,
      }),
    })

    if (!sessionResponse.ok) {
      console.error("[Dashboard] Failed to create session")
      return null
    }

    const sessionResult = await sessionResponse.json()
    const sessionId = sessionResult.session.id

    // Save step 1 result
    await fetch(`/api/optimize-flow/sessions/${sessionId}/save-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 1,
        result: data.analysisResult,
        resume_text: data.resumeText,
      }),
    })

    return sessionId
  } catch (error) {
    console.error("[Dashboard] Error creating session:", error)
    return null
  }
}

export function DashboardClient({ resumes, optimizedResumes, inProgressSessions }: DashboardClientProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionSummary[]>(inProgressSessions)

  // Filter to only completed master/uploaded resumes
  const completedResumes = resumes.filter(
    (r) =>
      r.processing_status === "completed" &&
      (r.kind === "master" || r.kind === "uploaded")
  )

  // Handle resuming a session
  const handleResumeSession = useCallback(
    (sessionId: string) => {
      router.push(`/dashboard/optimize-flow?sessionId=${sessionId}`)
    },
    [router]
  )

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
      console.error("[Dashboard] Error deleting session:", error)
    }
  }, [])

  // Handle analysis completion - create session and navigate
  const handleAnalysisComplete = useCallback(
    async (
      result: AnalysisResult,
      resumeText: string,
      formData: {
        resumeId: string
        jobTitle: string
        jobDescription: string
        companyName: string
      }
    ) => {
      // Create session with analysis result
      const sessionId = await createSessionWithAnalysis({
        resumeId: formData.resumeId,
        resumeText,
        jobTitle: formData.jobTitle,
        jobDescription: formData.jobDescription,
        companyName: formData.companyName || undefined,
        analysisResult: result,
      })

      if (sessionId) {
        // Navigate to optimize flow with session ID
        router.push(`/dashboard/optimize-flow?sessionId=${sessionId}`)
      } else {
        // Fallback: navigate without session (will start fresh)
        router.push("/dashboard/optimize-flow")
      }
    },
    [router]
  )

  return (
    <div className="space-y-8">
      {/* Resume Session Banner - shows if there are in-progress sessions */}
      {sessions.length > 0 && (
        <ResumeSessionBanner
          sessions={sessions}
          onResumeSession={handleResumeSession}
          onDeleteSession={handleDeleteSession}
        />
      )}

      {/* Optimize Your Resume Section */}
      <div className="rounded-2xl border border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8">
        <AnalysisStep
          resumes={completedResumes}
          onAnalysisComplete={handleAnalysisComplete}
        />
      </div>

      {/* Optimized Resumes */}
      {optimizedResumes.length > 0 && (
        <div className="rounded-2xl border border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8">
          <h2 className="text-xl font-medium tracking-tight font-space-grotesk mb-6">
            Optimized Resumes
          </h2>
          <GeneratedResumesCompactList resumes={optimizedResumes.slice(0, 5)} limit={5} />
          {optimizedResumes.length > 5 && (
            <div className="mt-4 text-center">
              <Link
                href="/dashboard/optimized"
                className="text-sm text-emerald-500 hover:text-emerald-400"
              >
                View all {optimizedResumes.length} optimized resumes →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
