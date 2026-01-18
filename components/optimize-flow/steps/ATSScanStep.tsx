"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ScanLine } from "lucide-react"
import type { EditedContent, ATSScanResult } from "@/lib/types/optimize-flow"

interface ATSScanStepProps {
  editedContent: EditedContent
  resumeId: string
  jobDescription: string
  onScanComplete: (result: ATSScanResult) => void
  onBack: () => void
}

export function ATSScanStep({
  editedContent,
  resumeId,
  jobDescription,
  onScanComplete,
  onBack,
}: ATSScanStepProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold font-space-grotesk mb-1">
          Step 3: ATS Compatibility Scan
        </h2>
        <p className="text-foreground/60 dark:text-white/60">
          We'll scan your optimized resume to ensure ATS systems can read it properly
        </p>
      </div>

      {/* Placeholder for Phase 3 implementation */}
      <div className="text-center py-12 border-2 border-dashed border-border dark:border-white/10 rounded-xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <ScanLine className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">ATS Scan Step</h3>
        <p className="text-foreground/60 dark:text-white/60 mb-4 max-w-md mx-auto">
          This step will be implemented in Phase 3. It will scan your rewritten resume
          for ATS compatibility issues and provide section-by-section recommendations.
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
