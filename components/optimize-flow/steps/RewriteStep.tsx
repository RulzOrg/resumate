"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil, Sparkles, Loader2 } from "lucide-react"
import { ProcessingOverlay, useProcessingSteps } from "@/components/ui/processing-overlay"
import { RewriteEditor } from "../results/RewriteEditor"
import type {
  AnalysisResult,
  RewriteResult,
  EditedContent,
} from "@/lib/types/optimize-flow"

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

const REWRITE_STEPS = [
  "Analyzing your experience...",
  "Applying X-Y-Z formula...",
  "Adding missing keywords...",
  "Optimizing bullet points...",
  "Generating professional summary...",
  "Finalizing your resume...",
]

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
  // Rewrite state
  const [isRewriting, setIsRewriting] = useState(false)
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null)
  const [editedContent, setEditedContent] = useState<EditedContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Processing steps
  const processingSteps = useProcessingSteps(REWRITE_STEPS)

  // Start rewriting
  const handleStartRewrite = async () => {
    setError(null)
    setIsRewriting(true)
    processingSteps.start()

    try {
      // Simulate step progression for better UX
      const stepInterval = setInterval(() => {
        processingSteps.nextStep()
      }, 4000)

      const response = await fetch("/api/optimize-flow/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: resumeId,
          job_description: jobDescription,
          job_title: jobTitle,
          company_name: companyName || undefined,
          analysis_result: analysisResult,
          resume_text: resumeText,
        }),
      })

      clearInterval(stepInterval)
      processingSteps.complete()

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to rewrite resume")
      }

      // Store results
      setRewriteResult(data.result)
      setEditedContent({
        professionalSummary: data.result.professionalSummary,
        workExperiences: data.result.workExperiences,
      })

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (err: any) {
      setError(err.message || "Something went wrong during rewriting")
      processingSteps.reset()
    } finally {
      setIsRewriting(false)
    }
  }

  // Handle content changes from editor
  const handleContentChange = useCallback((content: EditedContent) => {
    setEditedContent(content)
  }, [])

  // Handle continue to next step
  const handleContinue = () => {
    if (rewriteResult && editedContent) {
      onRewriteComplete(rewriteResult, editedContent)
    }
  }


  // Show rewrite results if available
  if (rewriteResult && editedContent) {
    return (
      <div>
        <RewriteEditor
          result={rewriteResult}
          missingKeywords={analysisResult.missingKeywords}
          jobTitle={jobTitle}
          companyName={companyName}
          onContentChange={handleContentChange}
          onContinue={handleContinue}
        />

        {/* Back button */}
        <div className="mt-6 pt-6 border-t border-border dark:border-white/10 text-center">
          <button
            onClick={onBack}
            className="text-sm text-foreground/50 dark:text-white/50 hover:text-foreground dark:hover:text-white transition-colors"
          >
            ← Back to Analysis
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
        isOpen={isRewriting}
        title="Rewriting Your Resume"
        subtitle="Applying X-Y-Z formula and adding keywords"
        steps={processingSteps.steps}
        currentStepIndex={processingSteps.currentStep}
        estimatedTime="~30-45 seconds"
        timeout={90000}
      />

      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold font-space-grotesk mb-1">
            Step 2: Rewrite Your Experience
          </h2>
          <p className="text-foreground/60 dark:text-white/60">
            We'll rewrite your work experience using the Google X-Y-Z formula to naturally
            include missing keywords
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* X-Y-Z Formula Explanation */}
        <div className="mb-6 p-5 rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            The X-Y-Z Formula
          </h3>
          <p className="text-sm text-foreground/70 dark:text-white/70 mb-4">
            <strong className="text-foreground dark:text-white">
              "Accomplished [X] as measured by [Y], by doing [Z]"
            </strong>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                X - Result
              </span>
              <p className="text-sm mt-1 text-foreground/80 dark:text-white/80">
                What you accomplished
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Y - Metric
              </span>
              <p className="text-sm mt-1 text-foreground/80 dark:text-white/80">
                How it was measured
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Z - Method
              </span>
              <p className="text-sm mt-1 text-foreground/80 dark:text-white/80">
                How you did it
              </p>
            </div>
          </div>
          <p className="text-xs text-foreground/50 dark:text-white/50 mt-4">
            Example: "Increased user engagement by 40% by developing 3 customer-facing React
            applications"
          </p>
        </div>

        {/* Keywords to Add */}
        <div className="mb-6 p-5 rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5">
          <h3 className="font-medium mb-3">Keywords to Add</h3>
          <div className="flex flex-wrap gap-2">
            {analysisResult.missingKeywords.map((keyword, index) => (
              <span
                key={index}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {keyword}
              </span>
            ))}
          </div>
          <p className="text-xs text-foreground/50 dark:text-white/50 mt-3">
            These keywords will be naturally incorporated into your resume
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analysis
          </Button>
          <Button
            onClick={handleStartRewrite}
            disabled={isRewriting}
            className="w-full sm:flex-1 bg-emerald-500 hover:bg-emerald-400 text-black"
          >
            {isRewriting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rewriting...
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4 mr-2" />
                Start Rewriting
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}

