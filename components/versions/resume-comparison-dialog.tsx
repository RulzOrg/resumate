"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Resume {
  id: string
  title: string
  content: string
  created_at: string
  is_primary?: boolean
}

interface OptimizedResume {
  id: string
  original_resume_id: string
  job_analysis_id: string
  optimized_content: string
  optimization_summary: string
  match_score: number
  created_at: string
  job_title?: string
  company_name?: string
}

interface ResumeComparisonDialogProps {
  originalResume: Resume | OptimizedResume | null
  optimizedResume: Resume | OptimizedResume | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResumeComparisonDialog({
  originalResume,
  optimizedResume,
  open,
  onOpenChange,
}: ResumeComparisonDialogProps) {
  if (!originalResume && !optimizedResume) return null

  const getResumeInfo = (resume: Resume | OptimizedResume) => {
    const isOptimized = "optimized_content" in resume
    return {
      title: isOptimized ? resume.job_title || "Optimized Resume" : resume.title,
      content: isOptimized ? resume.optimized_content : resume.content,
      isOptimized,
      matchScore: isOptimized ? resume.match_score : undefined,
      isPrimary: !isOptimized ? resume.is_primary : false,
    }
  }

  const leftResume = originalResume ? getResumeInfo(originalResume) : null
  const rightResume = optimizedResume ? getResumeInfo(optimizedResume) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">Resume Comparison</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left Resume */}
            <div className="flex flex-col h-full">
              {leftResume && (
                <>
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="font-semibold">{leftResume.title}</h3>
                    <div className="flex gap-2">
                      {leftResume.matchScore && <Badge variant="secondary">{leftResume.matchScore}% Match</Badge>}
                      {leftResume.isPrimary && <Badge variant="default">Primary</Badge>}
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{leftResume.content}</pre>
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>

            {/* Right Resume */}
            <div className="flex flex-col h-full">
              {rightResume && (
                <>
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="font-semibold">{rightResume.title}</h3>
                    <div className="flex gap-2">
                      {rightResume.matchScore && <Badge variant="secondary">{rightResume.matchScore}% Match</Badge>}
                      {rightResume.isPrimary && <Badge variant="default">Primary</Badge>}
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{rightResume.content}</pre>
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
