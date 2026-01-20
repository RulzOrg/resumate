"use client"

import { useState, useCallback, useEffect } from "react"
import { StepIndicator } from "./StepIndicator"
import { AnalysisStep } from "./steps/AnalysisStep"
import { RewriteStep } from "./steps/RewriteStep"
import { ReviewResumeStep } from "./steps/ReviewResumeStep"
import { ATSScanStep } from "./steps/ATSScanStep"
import { InterviewPrepStep } from "./steps/InterviewPrepStep"
import { ConnectionStatus } from "@/components/ui/connection-status"
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator"
import { useAutoSave } from "@/hooks/use-auto-save"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import type {
  FlowStep,
  OptimizeFlowState,
  AnalysisResult,
  RewriteResult,
  EditedContent,
  ATSScanResult,
  InterviewPrepResult,
} from "@/lib/types/optimize-flow"
import type { ParsedResume } from "@/lib/resume-parser"

interface Resume {
  id: string
  title: string
  file_name: string
  processing_status: string
  kind: string
}

interface SessionData {
  id: string
  current_step: FlowStep
  resume_id: string
  resume_text?: string
  parsed_resume?: ParsedResume
  job_title: string
  job_description: string
  company_name?: string
  analysis_result?: AnalysisResult
  rewrite_result?: RewriteResult
  edited_content?: EditedContent
  reviewed_resume?: ParsedResume
  ats_scan_result?: ATSScanResult
  interview_prep_result?: InterviewPrepResult
}

interface OptimizeFlowWizardProps {
  resumes: Resume[]
  initialSession?: SessionData
}

interface ExtendedFlowState extends OptimizeFlowState {
  sessionId: string | null
}

const initialState: ExtendedFlowState = {
  sessionId: null,
  currentStep: 1,
  resumeId: null,
  resumeText: undefined,
  parsedResume: null,
  jobTitle: "",
  jobDescription: "",
  companyName: "",
  analysisResult: null,
  rewriteResult: null,
  editedContent: null,
  reviewedResume: null,
  atsScanResult: null,
  interviewPrepResult: null,
  isLoading: false,
  error: null,
}

/**
 * Create or resume a session
 */
async function createOrResumeSession(data: {
  resumeId: string
  jobTitle: string
  jobDescription: string
  companyName?: string
  resumeText?: string
}): Promise<{ sessionId: string; resumed: boolean } | null> {
  try {
    const response = await fetch("/api/optimize-flow/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume_id: data.resumeId,
        job_title: data.jobTitle,
        job_description: data.jobDescription,
        company_name: data.companyName,
        resume_text: data.resumeText,
      }),
    })

    if (!response.ok) {
      console.error("[Wizard] Failed to create session:", await response.text())
      return null
    }

    const result = await response.json()
    return {
      sessionId: result.session.id,
      resumed: result.resumed,
    }
  } catch (error) {
    console.error("[Wizard] Error creating session:", error)
    return null
  }
}

export function OptimizeFlowWizard({ resumes, initialSession }: OptimizeFlowWizardProps) {
  // Initialize state from session if provided
  const [state, setState] = useState<ExtendedFlowState>(() => {
    if (initialSession) {
      return {
        sessionId: initialSession.id,
        currentStep: initialSession.current_step,
        resumeId: initialSession.resume_id,
        resumeText: initialSession.resume_text,
        parsedResume: initialSession.parsed_resume || null,
        jobTitle: initialSession.job_title,
        jobDescription: initialSession.job_description,
        companyName: initialSession.company_name || "",
        analysisResult: initialSession.analysis_result || null,
        rewriteResult: initialSession.rewrite_result || null,
        editedContent: initialSession.edited_content || null,
        reviewedResume: initialSession.reviewed_resume || null,
        atsScanResult: initialSession.ats_scan_result || null,
        interviewPrepResult: initialSession.interview_prep_result || null,
        isLoading: false,
        error: null,
      }
    }
    return initialState
  })

  // Track if we're resuming a session (for showing notification)
  const [isResumed, setIsResumed] = useState(!!initialSession)

  // Auto-save hook for reliable persistence
  const autoSave = useAutoSave({
    sessionId: state.sessionId,
    onSaveError: (error) => {
      console.error("[Wizard] Auto-save error:", error)
    },
  })

  // Warn user before leaving with unsaved changes
  useUnsavedChanges(autoSave.hasPendingChanges, {
    onBeforeUnload: () => {
      autoSave.flush()
    },
  })

  // Clear resumed notification after a few seconds
  useEffect(() => {
    if (isResumed) {
      const timer = setTimeout(() => setIsResumed(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isResumed])

  // Get completed steps based on state (5-step flow)
  const getCompletedSteps = (): FlowStep[] => {
    const completed: FlowStep[] = []
    if (state.analysisResult) completed.push(1)
    if (state.rewriteResult && state.editedContent) completed.push(2)
    if (state.reviewedResume) completed.push(3)
    if (state.atsScanResult) completed.push(4)
    if (state.interviewPrepResult) completed.push(5)
    return completed
  }

  // Navigate to a specific step (only if allowed)
  const goToStep = useCallback(
    (step: FlowStep) => {
      const completedSteps = getCompletedSteps()
      const maxAllowedStep = Math.max(...completedSteps, 1) + 1

      if (step <= maxAllowedStep) {
        setState((prev) => ({ ...prev, currentStep: step }))
      }
    },
    [state]
  )

  // Step 1: Analysis complete handler
  const handleAnalysisComplete = useCallback(
    async (
      result: AnalysisResult,
      resumeText: string,
      formData: {
        resumeId: string
        jobTitle: string
        jobDescription: string
        companyName: string
      },
      parsedResume?: ParsedResume | null
    ) => {
      // Create or resume session
      const sessionResult = await createOrResumeSession({
        resumeId: formData.resumeId,
        jobTitle: formData.jobTitle,
        jobDescription: formData.jobDescription,
        companyName: formData.companyName,
        resumeText,
      })

      const sessionId = sessionResult?.sessionId || state.sessionId

      // Update state with session ID first
      setState((prev) => ({
        ...prev,
        sessionId,
        analysisResult: result,
        resumeText,
        parsedResume: parsedResume || null,
        resumeId: formData.resumeId,
        jobTitle: formData.jobTitle,
        jobDescription: formData.jobDescription,
        companyName: formData.companyName,
      }))

      // AWAIT save before navigating (critical fix!)
      if (sessionId) {
        const saved = await autoSave.saveStepResult(1, result, { resumeText })
        if (!saved) {
          console.error("[Wizard] Failed to save step 1, but continuing...")
        }
      }

      // Now navigate to step 2
      setState((prev) => ({ ...prev, currentStep: 2 }))
    },
    [state.sessionId, autoSave]
  )

  // Step 2: Rewrite complete handler
  const handleRewriteComplete = useCallback(
    async (result: RewriteResult, editedContent: EditedContent) => {
      // Update state first
      setState((prev) => ({
        ...prev,
        rewriteResult: result,
        editedContent,
      }))

      // AWAIT save before navigating (critical fix!)
      if (state.sessionId) {
        const saved = await autoSave.saveStepResult(2, result, { editedContent })
        if (!saved) {
          console.error("[Wizard] Failed to save step 2, but continuing...")
        }
      }

      // Now navigate to step 3
      setState((prev) => ({ ...prev, currentStep: 3 }))
    },
    [state.sessionId, autoSave]
  )

  // Step 3: Review Resume complete handler
  const handleReviewComplete = useCallback(
    async (reviewedResume: ParsedResume) => {
      // Update state first
      setState((prev) => ({
        ...prev,
        reviewedResume,
      }))

      // AWAIT save before navigating
      if (state.sessionId) {
        const saved = await autoSave.saveStepResult(3, reviewedResume)
        if (!saved) {
          console.error("[Wizard] Failed to save step 3, but continuing...")
        }
      }

      // Now navigate to step 4 (ATS Scan)
      setState((prev) => ({ ...prev, currentStep: 4 }))
    },
    [state.sessionId, autoSave]
  )

  // Handler for reviewed resume changes (auto-save with debouncing)
  const handleReviewedResumeChange = useCallback(
    (reviewedResume: ParsedResume) => {
      // Update local state immediately
      setState((prev) => ({
        ...prev,
        reviewedResume,
      }))

      // Auto-save with debouncing (uses saveEditedContent for debounced saves)
      if (state.sessionId) {
        autoSave.saveEditedContent({ reviewedResume } as any)
      }
    },
    [state.sessionId, autoSave]
  )

  // Step 4: ATS Scan complete handler
  const handleATSScanComplete = useCallback(
    async (result: ATSScanResult) => {
      // Update state first
      setState((prev) => ({
        ...prev,
        atsScanResult: result,
      }))

      // AWAIT save before navigating
      if (state.sessionId) {
        const saved = await autoSave.saveStepResult(4, result)
        if (!saved) {
          console.error("[Wizard] Failed to save step 4, but continuing...")
        }
      }

      // Now navigate to step 5 (Interview Prep)
      setState((prev) => ({ ...prev, currentStep: 5 }))
    },
    [state.sessionId, autoSave]
  )

  // Step 5: Interview prep complete handler
  const handleInterviewPrepComplete = useCallback(
    async (result: InterviewPrepResult) => {
      // Update state
      setState((prev) => ({
        ...prev,
        interviewPrepResult: result,
      }))

      // AWAIT save (this marks the session as completed)
      if (state.sessionId) {
        const saved = await autoSave.saveStepResult(5, result)
        if (!saved) {
          console.error("[Wizard] Failed to save step 5")
        }
      }
    },
    [state.sessionId, autoSave]
  )

  // Skip to finish (from step 3 or 4)
  const handleSkipInterview = useCallback(async () => {
    // Mark session as completed without interview prep
    if (state.sessionId) {
      try {
        await fetch(`/api/optimize-flow/sessions/${state.sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        })
      } catch (error) {
        console.error("[Wizard] Error completing session:", error)
      }
    }
  }, [state.sessionId])

  // Go back handlers
  const handleBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1) as FlowStep,
    }))
  }, [])

  // Update edited content (for step 2 editing) - now uses auto-save with debouncing
  const handleUpdateEditedContent = useCallback(
    (editedContent: EditedContent) => {
      // Update local state immediately
      setState((prev) => ({
        ...prev,
        editedContent,
      }))

      // Auto-save with debouncing (2s delay)
      autoSave.saveEditedContent(editedContent)
    },
    [autoSave]
  )

  return (
    <div className="space-y-8">
      {/* Connection Status Banner */}
      <ConnectionStatus variant="banner" autoHide={true} />

      {/* Save Status Indicator - shows in top right when saving/saved */}
      <div className="fixed top-20 right-4 z-50">
        <SaveStatusIndicator
          status={autoSave.state.status}
          lastSavedAt={autoSave.state.lastSavedAt}
          error={autoSave.state.error}
          isOnline={autoSave.isOnline}
          onRetry={() => autoSave.flush()}
        />
      </div>

      {/* Resumed Session Banner */}
      {isResumed && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
                Session Resumed
              </h4>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                Continuing from step {state.currentStep} for "{state.jobTitle}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="rounded-2xl border border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5 p-6">
        <StepIndicator
          currentStep={state.currentStep}
          completedSteps={getCompletedSteps()}
          onStepClick={goToStep}
        />
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8">
        {state.currentStep === 1 && (
          <AnalysisStep
            resumes={resumes}
            onAnalysisComplete={handleAnalysisComplete}
            initialResumeId={state.resumeId || undefined}
            initialAnalysisResult={state.analysisResult ?? undefined}
            initialResumeText={state.resumeText}
            initialJobTitle={state.jobTitle}
            initialJobDescription={state.jobDescription}
            initialCompanyName={state.companyName}
          />
        )}

        {state.currentStep === 2 &&
          state.analysisResult &&
          state.resumeId &&
          state.resumeText && (
            <RewriteStep
              analysisResult={state.analysisResult}
              resumeId={state.resumeId}
              resumeText={state.resumeText}
              jobDescription={state.jobDescription}
              jobTitle={state.jobTitle}
              companyName={state.companyName}
              onRewriteComplete={handleRewriteComplete}
              onBack={handleBack}
              onEditedContentChange={handleUpdateEditedContent}
              initialRewriteResult={state.rewriteResult ?? undefined}
              initialEditedContent={state.editedContent ?? undefined}
            />
          )}

        {state.currentStep === 3 &&
          state.rewriteResult &&
          state.editedContent &&
          state.analysisResult && (
            <ReviewResumeStep
              rewriteResult={state.rewriteResult}
              editedContent={state.editedContent}
              parsedResume={state.parsedResume ?? undefined}
              resumeText={state.resumeText}
              analysisResult={state.analysisResult}
              initialReviewedResume={state.reviewedResume ?? undefined}
              onReviewComplete={handleReviewComplete}
              onResumeChange={handleReviewedResumeChange}
              onBack={handleBack}
            />
          )}

        {state.currentStep === 4 && state.editedContent && state.resumeId && (
          <ATSScanStep
            editedContent={state.editedContent}
            reviewedResume={state.reviewedResume ?? undefined}
            resumeId={state.resumeId}
            jobDescription={state.jobDescription}
            jobTitle={state.jobTitle}
            companyName={state.companyName}
            analysisResult={state.analysisResult || undefined}
            onScanComplete={handleATSScanComplete}
            onBack={handleBack}
            initialScanResult={state.atsScanResult ?? undefined}
          />
        )}

        {state.currentStep === 5 && state.resumeId && state.resumeText && (
          <InterviewPrepStep
            resumeId={state.resumeId}
            resumeText={state.resumeText}
            jobDescription={state.jobDescription}
            jobTitle={state.jobTitle}
            companyName={state.companyName}
            onComplete={handleInterviewPrepComplete}
            onBack={handleBack}
            onSkip={handleSkipInterview}
            initialPrepResult={state.interviewPrepResult ?? undefined}
          />
        )}
      </div>
    </div>
  )
}
