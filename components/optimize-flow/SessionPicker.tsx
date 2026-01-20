"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Play,
  Trash2,
  Clock,
  FileText,
  Building2,
  ChevronRight,
  Plus,
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

interface SessionPickerProps {
  sessions: SessionSummary[]
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onStartNew: () => void
}

const STEP_LABELS: Record<FlowStep, string> = {
  1: "Analysis",
  2: "Rewrite",
  3: "Review",
  4: "ATS Scan",
  5: "Interview Prep",
}

function getStepProgress(step: FlowStep): number {
  return ((step - 1) / 4) * 100
}

export function SessionPicker({
  sessions,
  onSelectSession,
  onDeleteSession,
  onStartNew,
}: SessionPickerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deletingId) return

    setDeletingId(sessionId)
    try {
      await onDeleteSession(sessionId)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSelect = async (sessionId: string) => {
    if (loadingId) return
    setLoadingId(sessionId)
    onSelectSession(sessionId)
  }

  if (sessions.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold font-space-grotesk">
            Continue Where You Left Off
          </h2>
          <p className="text-sm text-foreground/60 dark:text-white/60">
            You have {sessions.length} in-progress optimization
            {sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onStartNew}
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Start New
        </Button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group relative rounded-xl border border-border dark:border-white/10",
              "bg-background dark:bg-white/5 p-4",
              "hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer",
              loadingId === session.id && "opacity-70 pointer-events-none"
            )}
            onClick={() => handleSelect(session.id)}
          >
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-foreground/5 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${getStepProgress(session.current_step)}%` }}
              />
            </div>

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                {loadingId === session.id ? (
                  <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 text-emerald-500" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-sm truncate">
                      {session.job_title}
                    </h3>
                    {session.company_name && (
                      <p className="text-xs text-foreground/60 dark:text-white/60 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {session.company_name}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Step {session.current_step}: {STEP_LABELS[session.current_step]}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs text-foreground/50 dark:text-white/50">
                  {session.resume_title && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {session.resume_title}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(session.last_active_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleDelete(session.id, e)}
                  disabled={deletingId === session.id}
                  className={cn(
                    "p-2 rounded-lg text-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors",
                    "opacity-0 group-hover:opacity-100",
                    deletingId === session.id && "opacity-100"
                  )}
                  title="Delete session"
                >
                  {deletingId === session.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
                <ChevronRight className="w-5 h-5 text-foreground/30 group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
