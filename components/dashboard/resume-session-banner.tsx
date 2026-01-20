"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Play,
  Trash2,
  Clock,
  Building2,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FlowStep } from "@/lib/types/optimize-flow"

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

interface ResumeSessionBannerProps {
  sessions: SessionSummary[]
  onResumeSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
}

const STEP_LABELS: Record<FlowStep, string> = {
  1: "Analysis",
  2: "Rewrite",
  3: "Review",
  4: "ATS Scan",
  5: "Interview",
}

function SegmentedProgress({ currentStep }: { currentStep: FlowStep }) {
  return (
    <div className="flex gap-1 w-full max-w-[180px]">
      {[1, 2, 3, 4, 5].map((step) => (
        <div
          key={step}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-300",
            step < currentStep
              ? "bg-amber-500"
              : step === currentStep
              ? "bg-amber-500/50 animate-pulse"
              : "bg-foreground/10 dark:bg-white/10"
          )}
        />
      ))}
    </div>
  )
}

export function ResumeSessionBanner({
  sessions,
  onResumeSession,
  onDeleteSession,
}: ResumeSessionBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (sessions.length === 0) {
    return null
  }

  // Hero session is the most recent one
  const heroSession = sessions[0]
  const otherSessions = sessions.slice(1)

  const handleResume = async (sessionId: string) => {
    if (loadingId) return
    setLoadingId(sessionId)
    onResumeSession(sessionId)
  }

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    // If already showing confirm for this session, actually delete
    if (confirmDeleteId === sessionId) {
      if (deletingId) return
      setDeletingId(sessionId)
      try {
        await onDeleteSession(sessionId)
      } finally {
        setDeletingId(null)
        setConfirmDeleteId(null)
      }
      return
    }

    // Show confirmation
    setConfirmDeleteId(sessionId)
    // Auto-hide confirmation after 3 seconds
    setTimeout(() => {
      setConfirmDeleteId((current) => (current === sessionId ? null : current))
    }, 3000)
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl border overflow-hidden",
        "border-amber-500/30 dark:border-amber-500/20",
        // Diagonal stripe pattern background
        "before:absolute before:inset-0 before:opacity-100",
        "before:bg-[repeating-linear-gradient(-45deg,transparent,transparent_10px,rgba(251,191,36,0.03)_10px,rgba(251,191,36,0.03)_20px)]",
        // Gradient overlay
        "bg-gradient-to-r from-amber-500/5 via-amber-500/[0.02] to-emerald-500/5",
        "dark:from-amber-500/10 dark:via-amber-500/5 dark:to-emerald-500/10"
      )}
    >
      <div className="relative p-6">
        {/* Hero Session */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Icon with pulse effect */}
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              "bg-amber-500/20 dark:bg-amber-500/30",
              "shadow-[0_0_0_0_rgba(251,191,36,0.4)] animate-[pulse-glow_2s_ease-in-out_infinite]"
            )}
            style={{
              animation: "pulse-glow 2s ease-in-out infinite",
            }}
          >
            {loadingId === heroSession.id ? (
              <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" />
            ) : (
              <Play className="w-5 h-5 text-amber-600 dark:text-amber-400 ml-0.5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
              Pick Up Where You Left Off
            </p>
            <h3 className="text-lg font-semibold font-space-grotesk truncate">
              {heroSession.job_title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-foreground/60 dark:text-white/60">
              {heroSession.company_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {heroSession.company_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(heroSession.last_active_at), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3 mt-3">
              <SegmentedProgress currentStep={heroSession.current_step} />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Step {heroSession.current_step}: {STEP_LABELS[heroSession.current_step]}
              </span>
            </div>
          </div>

          {/* Resume Button */}
          <Button
            onClick={() => handleResume(heroSession.id)}
            disabled={loadingId === heroSession.id}
            className={cn(
              "shrink-0 bg-amber-500 hover:bg-amber-400 text-black",
              "group transition-all"
            )}
          >
            {loadingId === heroSession.id ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Resume
                <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </div>

        {/* Other Sessions (Expandable) */}
        {otherSessions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-amber-500/20">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white transition-colors"
            >
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
              {otherSessions.length} more in-progress optimization
              {otherSessions.length !== 1 ? "s" : ""}
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-2">
                {otherSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      "bg-background/50 dark:bg-white/5",
                      "border border-border/50 dark:border-white/10",
                      "hover:border-amber-500/30 transition-colors cursor-pointer",
                      loadingId === session.id && "opacity-70 pointer-events-none"
                    )}
                    onClick={() => handleResume(session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{session.job_title}</p>
                      <div className="flex items-center gap-2 text-xs text-foreground/50 dark:text-white/50">
                        {session.company_name && <span>{session.company_name}</span>}
                        <span>
                          Step {session.current_step}: {STEP_LABELS[session.current_step]}
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      disabled={deletingId === session.id}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        confirmDeleteId === session.id
                          ? "bg-red-500/20 text-red-500 scale-110"
                          : "text-foreground/30 hover:text-red-500 hover:bg-red-500/10"
                      )}
                      title={confirmDeleteId === session.id ? "Click again to confirm" : "Delete session"}
                    >
                      {deletingId === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : confirmDeleteId === session.id ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>

                    {/* Resume arrow */}
                    {loadingId === session.id ? (
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-foreground/30 dark:text-white/30" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom keyframes for pulse glow effect */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
          }
        }
      `}</style>
    </div>
  )
}
