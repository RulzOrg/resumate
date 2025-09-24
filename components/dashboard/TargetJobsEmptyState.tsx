"use client"

import { EmptyStateCard } from "@/components/dashboard/EmptyStateCard"
import { AnalyzeJobDialog } from "@/components/jobs/analyze-job-dialog"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import type { JobAnalysis } from "@/lib/db"

interface TargetJobsEmptyStateProps {
  existingAnalyses?: JobAnalysis[]
}

export function TargetJobsEmptyState({ existingAnalyses = [] }: TargetJobsEmptyStateProps) {
  return (
    <EmptyStateCard
      icon={<FileText className="h-8 w-8 text-white/80" />}
      title="Generate your first resume"
      description="Add a job description to get started. ResuMate AI will tailor your resume to match the job's requirements."
      action={
        <AnalyzeJobDialog existingAnalyses={existingAnalyses}>
          <Button className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors">
            Add Target Job
          </Button>
        </AnalyzeJobDialog>
      }
    />
  )
}


