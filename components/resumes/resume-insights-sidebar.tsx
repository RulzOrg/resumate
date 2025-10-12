'use client'

import { ListChecks, Percent, Lightbulb, Plus } from "lucide-react"
import { extractRoleName } from "@/lib/resume-utils"

interface ResumeInsightsSidebarProps {
  topRoles: Array<{ role: string; count: number }>
  avgScore: number
  onNewResume?: () => void
}

export function ResumeInsightsSidebar({ topRoles, avgScore, onNewResume }: ResumeInsightsSidebarProps) {
  const hasAvgScore = avgScore > 0
  const scoreDescription = hasAvgScore
    ? "Average match across your generated resumes."
    : "Generate a resume to see match scores here."
  const avgScoreValue = hasAvgScore ? `${avgScore}%` : "—"

  const suggestionMessage = (() => {
    if (!hasAvgScore) {
      return "Create a tailored resume to unlock suggestions."
    }
    if (avgScore >= 80) {
      return "Great work—keep iterating for upcoming roles."
    }
    if (avgScore >= 50) {
      return "Incorporate missing achievements or keywords to improve matches."
    }
    return "Refresh your resume content to lift low match scores."
  })()

  const handleNewResume = () => {
    if (onNewResume) {
      onNewResume()
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-medium tracking-tight font-geist text-foreground">Resume insights</h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-border bg-secondary flex items-center justify-center">
            <ListChecks className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist text-foreground">Top roles</p>
            <p className="text-xs text-muted-foreground font-geist mt-0.5">
              Most generated resumes target these roles.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topRoles.length > 0 ? (
                topRoles.map((item) => (
                  <span
                    key={item.role}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                    aria-label={`${extractRoleName(item.role)} - ${item.count} resume${item.count !== 1 ? 's' : ''}`}
                  >
                    {extractRoleName(item.role)} ({item.count})
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                  No roles yet
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-border bg-secondary flex items-center justify-center">
            <Percent className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist text-foreground">Average score</p>
            <p className="text-xs text-muted-foreground font-geist mt-0.5">{scoreDescription}</p>
          </div>
          <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">{avgScoreValue}</span>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-border bg-secondary flex items-center justify-center">
            <Lightbulb className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist text-foreground">Suggestions</p>
            <p className="text-xs text-muted-foreground font-geist mt-0.5">{suggestionMessage}</p>
          </div>
          <span className="text-xs text-foreground font-medium">Action</span>
        </div>

        <button
          onClick={handleNewResume}
          className="inline-flex hover:bg-emerald-400 transition text-sm font-medium text-black bg-emerald-500 w-full rounded-full pt-2 pr-3 pb-2 pl-3 gap-x-2 gap-y-2 items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!onNewResume}
        >
          <Plus className="w-4 h-4" />
          New Resume
        </button>
      </div>
    </div>
  )
}
