"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Mic, SkipForward } from "lucide-react"
import type { InterviewPrepResult } from "@/lib/types/optimize-flow"

interface InterviewPrepStepProps {
  resumeId: string
  resumeText: string
  jobDescription: string
  jobTitle: string
  companyName: string
  onComplete: (result: InterviewPrepResult) => void
  onBack: () => void
  onSkip: () => void
}

export function InterviewPrepStep({
  resumeId,
  resumeText,
  jobDescription,
  jobTitle,
  companyName,
  onComplete,
  onBack,
  onSkip,
}: InterviewPrepStepProps) {
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-semibold font-space-grotesk">
            Step 4: Interview Preparation
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            Optional
          </span>
        </div>
        <p className="text-foreground/60 dark:text-white/60">
          Get the hardest interview questions a hiring manager would ask, with perfect answers
        </p>
      </div>

      {/* Placeholder for Phase 4 implementation */}
      <div className="text-center py-12 border-2 border-dashed border-border dark:border-white/10 rounded-xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <Mic className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Interview Prep Step</h3>
        <p className="text-foreground/60 dark:text-white/60 mb-4 max-w-md mx-auto">
          This step will be implemented in Phase 4. It will generate the 3 hardest
          technical questions a hiring manager would ask, with perfect answers based on
          your experience.
        </p>
        <p className="text-sm text-foreground/40 dark:text-white/40 mb-6">
          Target role: {jobTitle} {companyName && `at ${companyName}`}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={onSkip}>
            <SkipForward className="w-4 h-4 mr-2" />
            Skip & Finish
          </Button>
        </div>
      </div>
    </div>
  )
}
