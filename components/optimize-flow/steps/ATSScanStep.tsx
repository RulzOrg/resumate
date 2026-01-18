"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ScanLine, Loader2, Shield } from "lucide-react"
import { ProcessingOverlay, useProcessingSteps } from "@/components/ui/processing-overlay"
import { ATSScanResults } from "../results/ATSScanResults"
import type { EditedContent, ATSScanResult } from "@/lib/types/optimize-flow"

interface ATSScanStepProps {
  editedContent: EditedContent
  resumeId: string
  jobDescription: string
  onScanComplete: (result: ATSScanResult) => void
  onBack: () => void
}

const SCAN_STEPS = [
  "Parsing resume structure...",
  "Checking section headers...",
  "Analyzing bullet formatting...",
  "Testing keyword extraction...",
  "Validating date formats...",
  "Generating compatibility report...",
]

export function ATSScanStep({
  editedContent,
  resumeId,
  jobDescription,
  onScanComplete,
  onBack,
}: ATSScanStepProps) {
  // Scan state
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ATSScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Processing steps
  const processingSteps = useProcessingSteps(SCAN_STEPS)

  // Start scanning
  const handleStartScan = async () => {
    setError(null)
    setIsScanning(true)
    processingSteps.start()

    try {
      // Simulate step progression for better UX
      const stepInterval = setInterval(() => {
        processingSteps.nextStep()
      }, 2500)

      const response = await fetch("/api/optimize-flow/ats-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: resumeId,
          edited_content: editedContent,
          job_description: jobDescription || undefined,
        }),
      })

      clearInterval(stepInterval)
      processingSteps.complete()

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to scan resume")
      }

      // Store results
      setScanResult(data.result)

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (err: any) {
      setError(err.message || "Something went wrong during scanning")
      processingSteps.reset()
    } finally {
      setIsScanning(false)
    }
  }

  // Handle continue to next step
  const handleContinue = () => {
    if (scanResult) {
      onScanComplete(scanResult)
    }
  }

  // Show scan results if available
  if (scanResult) {
    return (
      <div>
        <ATSScanResults
          result={scanResult}
          onContinue={handleContinue}
          onSkipInterview={handleContinue}
        />

        {/* Back button */}
        <div className="mt-6 pt-6 border-t border-border dark:border-white/10 text-center">
          <button
            onClick={onBack}
            className="text-sm text-foreground/50 dark:text-white/50 hover:text-foreground dark:hover:text-white transition-colors"
          >
            &larr; Back to Rewrite
          </button>
        </div>
      </div>
    )
  }

  // Show initial state with start button
  return (
    <>
      {/* Processing Overlay */}
      <ProcessingOverlay
        isOpen={isScanning}
        title="Scanning for ATS Compatibility"
        subtitle="Checking if ATS systems can read your resume"
        steps={processingSteps.steps}
        currentStepIndex={processingSteps.currentStep}
        estimatedTime="~15-20 seconds"
        timeout={60000}
      />

      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold font-space-grotesk mb-1">
            Step 3: ATS Compatibility Scan
          </h2>
          <p className="text-foreground/60 dark:text-white/60">
            We'll scan your optimized resume to ensure ATS systems can read it properly
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* What We Check */}
        <div className="mb-6 p-5 rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            What We Check
          </h3>
          <p className="text-sm text-foreground/70 dark:text-white/70 mb-4">
            ATS (Applicant Tracking Systems) are used by 99% of Fortune 500 companies.
            We'll scan your resume to ensure it can be properly read and parsed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Section Headers
              </span>
              <p className="text-sm mt-1 text-foreground/80 dark:text-white/80">
                Standard headers ATS can recognize
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Formatting
              </span>
              <p className="text-sm mt-1 text-foreground/80 dark:text-white/80">
                Clean formatting without tables/columns
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Keywords
              </span>
              <p className="text-sm mt-1 text-foreground/80 dark:text-white/80">
                Proper keyword placement for matching
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Dates
              </span>
              <p className="text-sm mt-1 text-foreground/80 dark:text-white/80">
                Consistent, parseable date formats
              </p>
            </div>
          </div>
        </div>

        {/* Resume Preview */}
        <div className="mb-6 p-5 rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5">
          <h3 className="font-medium mb-3">Content to Scan</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-foreground/5 dark:bg-white/5">
              <p className="text-xs text-foreground/50 dark:text-white/50 uppercase tracking-wider mb-1">
                Professional Summary
              </p>
              <p className="text-sm text-foreground/80 dark:text-white/80 line-clamp-2">
                {editedContent.professionalSummary}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-foreground/5 dark:bg-white/5">
              <p className="text-xs text-foreground/50 dark:text-white/50 uppercase tracking-wider mb-1">
                Work Experience
              </p>
              <p className="text-sm text-foreground/80 dark:text-white/80">
                {editedContent.workExperiences.length} positions with{" "}
                {editedContent.workExperiences.reduce(
                  (sum, exp) => sum + exp.rewrittenBullets.length,
                  0
                )}{" "}
                total bullet points
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Rewrite
          </Button>
          <Button
            onClick={handleStartScan}
            disabled={isScanning}
            className="w-full sm:flex-1 bg-emerald-500 hover:bg-emerald-400 text-black"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <ScanLine className="w-4 h-4 mr-2" />
                Start ATS Scan
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
