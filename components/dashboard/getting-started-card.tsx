"use client"

import { useState } from "react"
import { Check, Sparkles, X, Upload, FileText, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { UploadMasterResumeDialog } from "./master-resume-dialog"
import { Button } from "@/components/ui/button"

interface GettingStartedCardProps {
  hasResume: boolean
  hasOptimized: boolean
  currentResumeCount: number
}

interface ChecklistItemProps {
  completed: boolean
  label: string
  description?: string
  action?: React.ReactNode
}

function ChecklistItem({ completed, label, description, action }: ChecklistItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          completed
            ? "border-emerald-500 bg-emerald-500"
            : "border-muted-foreground/30 bg-transparent"
        )}
      >
        {completed && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            completed ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          {label}
        </p>
        {description && !completed && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
        {action && !completed && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

export function GettingStartedCard({
  hasResume,
  hasOptimized,
  currentResumeCount,
}: GettingStartedCardProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)

  const handleDismiss = async () => {
    setIsDismissing(true)
    try {
      await fetch("/api/user/onboarding/dismiss-getting-started", {
        method: "POST",
      })
      setIsDismissed(true)
    } catch (error) {
      console.error("Failed to dismiss getting started:", error)
      setIsDismissing(false)
    }
  }

  if (isDismissed) {
    return null
  }

  const completedSteps = [hasResume, hasOptimized].filter(Boolean).length
  const totalSteps = 2
  const allComplete = completedSteps === totalSteps

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            Getting Started
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {allComplete
              ? "You're all set! Start optimizing your resumes."
              : `Complete these steps to optimize your first resume`}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          disabled={isDismissing}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          aria-label="Dismiss getting started"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress indicator */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {completedSteps}/{totalSteps}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <ChecklistItem
          completed={hasResume}
          label="Upload your master resume"
          description="This is the resume we'll customize for each job"
          action={
            <UploadMasterResumeDialog currentResumeCount={currentResumeCount}>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <Upload className="h-3 w-3 mr-1.5" />
                Upload Resume
              </Button>
            </UploadMasterResumeDialog>
          }
        />
        <ChecklistItem
          completed={hasOptimized}
          label="Create your first tailored resume"
          description="Paste a job description and let AI do the work"
          action={
            hasResume ? (
              <p className="text-xs text-emerald-500">
                <FileText className="inline h-3 w-3 mr-1" />
                Use the Quick Optimize form above
              </p>
            ) : null
          }
        />
      </div>

      <div className="mt-4 pt-4 border-t border-emerald-500/20">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <HelpCircle className="h-3 w-3" />
          Need help?{" "}
          <Link
            href="/support"
            className="text-emerald-500 hover:text-emerald-400 underline-offset-2 hover:underline"
          >
            Visit our support center
          </Link>
        </p>
      </div>
    </div>
  )
}
