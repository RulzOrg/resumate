"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ScanLine, Loader2, Shield } from "lucide-react"
import { ProcessingOverlay, useProcessingSteps } from "@/components/ui/processing-overlay"
import { RetryIndicator } from "@/components/ui/retry-indicator"
import { ATSScanResults } from "../results/ATSScanResults"
import { fetchWithRetry, initialRetryState, type RetryState } from "@/lib/utils/api-retry"
import type { EditedContent, ATSScanResult, AnalysisResult } from "@/lib/types/optimize-flow"
import type { ParsedResume } from "@/lib/resume-parser"

interface ATSScanStepProps {
  editedContent: EditedContent
  /** Full reviewed resume from step 3 (optional, used for comprehensive scan) */
  reviewedResume?: ParsedResume
  resumeId: string
  jobDescription: string
  jobTitle: string
  companyName?: string
  analysisResult?: AnalysisResult
  onScanComplete: (result: ATSScanResult) => void
  onBack: () => void
  /** Initial scan result to restore (from wizard state on back/forward) */
  initialScanResult?: ATSScanResult
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
  reviewedResume,
  resumeId,
  jobDescription,
  jobTitle,
  companyName,
  analysisResult,
  onScanComplete,
  onBack,
  initialScanResult,
}: ATSScanStepProps) {
  // Note: reviewedResume can be used for more comprehensive ATS scanning
  // Currently using editedContent for backward compatibility
  // Scan state - initialize from props for back/forward navigation
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ATSScanResult | null>(
    initialScanResult ?? null
  )
  const [error, setError] = useState<string | null>(null)
  const [retryState, setRetryState] = useState<RetryState>(initialRetryState)

  // Processing steps
  const processingSteps = useProcessingSteps(SCAN_STEPS)

  // Sync state with props when navigating back (props change but component may be reused)
  useEffect(() => {
    if (initialScanResult) {
      setScanResult(initialScanResult)
    }
  }, [initialScanResult])

  // Start scanning
  const handleStartScan = useCallback(async () => {
    setError(null)
    setRetryState(initialRetryState)
    setIsScanning(true)
    processingSteps.start()

    // Track step interval for cleanup
    let stepInterval: NodeJS.Timeout | null = null

    try {
      // Simulate step progression for better UX
      stepInterval = setInterval(() => {
        processingSteps.nextStep()
      }, 2500)

      const response = await fetchWithRetry(
        "/api/optimize-flow/ats-scan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_id: resumeId,
            edited_content: editedContent,
            job_description: jobDescription || undefined,
          }),
        },
        {
          maxRetries: 3,
          initialDelay: 2000,
          onRetry: (attempt, err, delay) => {
            setRetryState({
              isRetrying: true,
              retryCount: attempt,
              lastError: err,
              nextRetryIn: delay,
            })
          },
          onFinalError: (err) => {
            setRetryState({
              isRetrying: false,
              retryCount: 0,
              lastError: err,
              nextRetryIn: null,
            })
          },
        }
      )

      if (stepInterval) clearInterval(stepInterval)
      processingSteps.complete()

      const data = await response.json()

      // Store results
      setScanResult(data.result)
      setRetryState(initialRetryState)

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (err: any) {
      if (stepInterval) clearInterval(stepInterval)
      setError(err.message || "Something went wrong during scanning")
      processingSteps.reset()
    } finally {
      setIsScanning(false)
    }
  }, [resumeId, editedContent, jobDescription, processingSteps])

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
          jobTitle={jobTitle}
          companyName={companyName}
          analysisResult={analysisResult}
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

        {/* Retry/Error Indicator */}
        <RetryIndicator
          retryState={retryState}
          error={error}
          onRetry={handleStartScan}
          isRetrying={isScanning}
          className="mb-6"
        />

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
