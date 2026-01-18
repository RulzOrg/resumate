"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mic, SkipForward, Loader2, MessageSquare, Brain, Users } from "lucide-react"
import { ProcessingOverlay, useProcessingSteps } from "@/components/ui/processing-overlay"
import { RetryIndicator } from "@/components/ui/retry-indicator"
import { InterviewPrepResults } from "../results/InterviewPrepResults"
import { fetchWithRetry, initialRetryState, type RetryState } from "@/lib/utils/api-retry"
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

const PREP_STEPS = [
  "Analyzing job requirements...",
  "Reviewing your experience...",
  "Identifying challenging topics...",
  "Generating technical questions...",
  "Crafting perfect STAR answers...",
  "Finalizing interview prep...",
]

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
  // Prep state
  const [isGenerating, setIsGenerating] = useState(false)
  const [prepResult, setPrepResult] = useState<InterviewPrepResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryState, setRetryState] = useState<RetryState>(initialRetryState)

  // Processing steps
  const processingSteps = useProcessingSteps(PREP_STEPS)

  // Start generating
  const handleStartGenerate = useCallback(async () => {
    setError(null)
    setRetryState(initialRetryState)
    setIsGenerating(true)
    processingSteps.start()

    // Track step interval for cleanup
    let stepInterval: NodeJS.Timeout | null = null

    try {
      // Simulate step progression for better UX
      stepInterval = setInterval(() => {
        processingSteps.nextStep()
      }, 4000)

      const response = await fetchWithRetry(
        "/api/optimize-flow/interview-prep",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_id: resumeId,
            resume_text: resumeText,
            job_description: jobDescription,
            job_title: jobTitle,
            company_name: companyName || undefined,
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
      setPrepResult(data.result)
      setRetryState(initialRetryState)

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (err: any) {
      if (stepInterval) clearInterval(stepInterval)
      setError(err.message || "Something went wrong during generation")
      processingSteps.reset()
    } finally {
      setIsGenerating(false)
    }
  }, [resumeId, resumeText, jobDescription, jobTitle, companyName, processingSteps])

  // Handle finish
  const handleFinish = () => {
    if (prepResult) {
      onComplete(prepResult)
    }
  }

  // Show prep results if available
  if (prepResult) {
    return (
      <div>
        <InterviewPrepResults
          result={prepResult}
          jobTitle={jobTitle}
          companyName={companyName}
          onFinish={handleFinish}
        />

        {/* Back button */}
        <div className="mt-6 pt-6 border-t border-border dark:border-white/10 text-center">
          <button
            onClick={onBack}
            className="text-sm text-foreground/50 dark:text-white/50 hover:text-foreground dark:hover:text-white transition-colors"
          >
            &larr; Back to ATS Scan
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
        isOpen={isGenerating}
        title="Generating Interview Questions"
        subtitle="Creating challenging questions with perfect answers"
        steps={processingSteps.steps}
        currentStepIndex={processingSteps.currentStep}
        estimatedTime="~30-45 seconds"
        timeout={90000}
      />

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

        {/* Retry/Error Indicator */}
        <RetryIndicator
          retryState={retryState}
          error={error}
          onRetry={handleStartGenerate}
          isRetrying={isGenerating}
          className="mb-6"
        />

        {/* What You'll Get */}
        <div className="mb-6 p-5 rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-500" />
            What You'll Get
          </h3>
          <p className="text-sm text-foreground/70 dark:text-white/70 mb-4">
            We'll generate 3 challenging interview questions specifically for the{" "}
            <strong className="text-foreground dark:text-white">{jobTitle}</strong> role
            {companyName && (
              <>
                {" "}
                at <strong className="text-foreground dark:text-white">{companyName}</strong>
              </>
            )}
            , with perfect answers based on YOUR experience.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Technical
                </span>
              </div>
              <p className="text-sm text-foreground/80 dark:text-white/80">
                Deep technical questions
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Behavioral
                </span>
              </div>
              <p className="text-sm text-foreground/80 dark:text-white/80">
                "Tell me about a time..."
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Situational
                </span>
              </div>
              <p className="text-sm text-foreground/80 dark:text-white/80">
                Real-world scenarios
              </p>
            </div>
          </div>
        </div>

        {/* STAR Format Explanation */}
        <div className="mb-6 p-5 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10">
          <h3 className="font-medium mb-2">Answers in STAR Format</h3>
          <p className="text-sm text-foreground/70 dark:text-white/70 mb-3">
            Each answer will follow the proven STAR method that interviewers love:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-1">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">S</span>
              </div>
              <span className="text-xs font-medium">Situation</span>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-1">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">T</span>
              </div>
              <span className="text-xs font-medium">Task</span>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-1">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">A</span>
              </div>
              <span className="text-xs font-medium">Action</span>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-1">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">R</span>
              </div>
              <span className="text-xs font-medium">Result</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to ATS Scan
          </Button>
          <Button variant="outline" onClick={onSkip} className="w-full sm:w-auto">
            <SkipForward className="w-4 h-4 mr-2" />
            Skip & Finish
          </Button>
          <Button
            onClick={handleStartGenerate}
            disabled={isGenerating}
            className="w-full sm:flex-1 bg-emerald-500 hover:bg-emerald-400 text-black"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Generate Interview Questions
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
