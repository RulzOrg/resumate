"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil } from "lucide-react"
import type { AnalysisResult, RewriteResult, EditedContent } from "@/lib/types/optimize-flow"

interface RewriteStepProps {
  analysisResult: AnalysisResult
  resumeId: string
  resumeText: string
  jobDescription: string
  jobTitle: string
  companyName: string
  onRewriteComplete: (result: RewriteResult, editedContent: EditedContent) => void
  onBack: () => void
}

export function RewriteStep({
  analysisResult,
  resumeId,
  resumeText,
  jobDescription,
  jobTitle,
  companyName,
  onRewriteComplete,
  onBack,
}: RewriteStepProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold font-space-grotesk mb-1">
          Step 2: Rewrite Your Experience
        </h2>
        <p className="text-foreground/60 dark:text-white/60">
          We'll rewrite your work experience using the X-Y-Z formula to include missing keywords
        </p>
      </div>

      {/* Placeholder for Phase 2 implementation */}
      <div className="text-center py-12 border-2 border-dashed border-border dark:border-white/10 rounded-xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <Pencil className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Rewrite Step</h3>
        <p className="text-foreground/60 dark:text-white/60 mb-4 max-w-md mx-auto">
          This step will be implemented in Phase 2. It will rewrite your work experience
          using the Google X-Y-Z formula to naturally incorporate missing keywords.
        </p>
        <p className="text-sm text-foreground/40 dark:text-white/40 mb-6">
          Keywords to add: {analysisResult.missingKeywords.join(", ")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </div>
  )
}
