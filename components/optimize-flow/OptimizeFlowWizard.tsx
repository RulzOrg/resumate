"use client"

import { useState, useCallback } from "react"
import { StepIndicator } from "./StepIndicator"
import { AnalysisStep } from "./steps/AnalysisStep"
import { RewriteStep } from "./steps/RewriteStep"
import { ATSScanStep } from "./steps/ATSScanStep"
import { InterviewPrepStep } from "./steps/InterviewPrepStep"
import type {
  FlowStep,
  OptimizeFlowState,
  AnalysisResult,
  RewriteResult,
  EditedContent,
  ATSScanResult,
  InterviewPrepResult,
} from "@/lib/types/optimize-flow"

interface Resume {
  id: string
  title: string
  file_name: string
  processing_status: string
  kind: string
}

interface OptimizeFlowWizardProps {
  resumes: Resume[]
}

const initialState: OptimizeFlowState = {
  currentStep: 1,
  resumeId: null,
  resumeText: undefined,
  jobTitle: "",
  jobDescription: "",
  companyName: "",
  analysisResult: null,
  rewriteResult: null,
  editedContent: null,
  atsScanResult: null,
  interviewPrepResult: null,
  isLoading: false,
  error: null,
}

export function OptimizeFlowWizard({ resumes }: OptimizeFlowWizardProps) {
  const [state, setState] = useState<OptimizeFlowState>(initialState)

  // Get completed steps based on state
  const getCompletedSteps = (): FlowStep[] => {
    const completed: FlowStep[] = []
    if (state.analysisResult) completed.push(1)
    if (state.rewriteResult && state.editedContent) completed.push(2)
    if (state.atsScanResult) completed.push(3)
    if (state.interviewPrepResult) completed.push(4)
    return completed
  }

  // Navigate to a specific step (only if allowed)
  const goToStep = useCallback((step: FlowStep) => {
    const completedSteps = getCompletedSteps()
    const maxAllowedStep = Math.max(...completedSteps, 1) + 1

    if (step <= maxAllowedStep) {
      setState((prev) => ({ ...prev, currentStep: step }))
    }
  }, [state])

  // Step 1: Analysis complete handler
  const handleAnalysisComplete = useCallback(
    (
      result: AnalysisResult,
      resumeText: string,
      formData: { resumeId: string; jobTitle: string; jobDescription: string; companyName: string }
    ) => {
      setState((prev) => ({
        ...prev,
        analysisResult: result,
        resumeText,
        resumeId: formData.resumeId,
        jobTitle: formData.jobTitle,
        jobDescription: formData.jobDescription,
        companyName: formData.companyName,
        currentStep: 2,
      }))
    },
    []
  )

  // Step 2: Rewrite complete handler
  const handleRewriteComplete = useCallback(
    (result: RewriteResult, editedContent: EditedContent) => {
      setState((prev) => ({
        ...prev,
        rewriteResult: result,
        editedContent,
        currentStep: 3,
      }))
    },
    []
  )

  // Step 3: ATS Scan complete handler
  const handleATSScanComplete = useCallback((result: ATSScanResult) => {
    setState((prev) => ({
      ...prev,
      atsScanResult: result,
      currentStep: 4,
    }))
  }, [])

  // Step 4: Interview prep complete handler
  const handleInterviewPrepComplete = useCallback((result: InterviewPrepResult) => {
    setState((prev) => ({
      ...prev,
      interviewPrepResult: result,
    }))
  }, [])

  // Skip to finish (from step 3 or 4)
  const handleSkipInterview = useCallback(() => {
    // User chose to finish without interview prep
    // Could redirect to a summary page or download
  }, [])

  // Go back handlers
  const handleBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1) as FlowStep,
    }))
  }, [])

  // Update edited content (for step 2 editing)
  const handleUpdateEditedContent = useCallback((editedContent: EditedContent) => {
    setState((prev) => ({
      ...prev,
      editedContent,
    }))
  }, [])

  return (
    <div className="space-y-8">
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
          />
        )}

        {state.currentStep === 2 && state.analysisResult && state.resumeId && state.resumeText && (
          <RewriteStep
            analysisResult={state.analysisResult}
            resumeId={state.resumeId}
            resumeText={state.resumeText}
            jobDescription={state.jobDescription}
            jobTitle={state.jobTitle}
            companyName={state.companyName}
            onRewriteComplete={handleRewriteComplete}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 3 && state.editedContent && state.resumeId && (
          <ATSScanStep
            editedContent={state.editedContent}
            resumeId={state.resumeId}
            jobDescription={state.jobDescription}
            onScanComplete={handleATSScanComplete}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 4 && state.resumeId && state.resumeText && (
          <InterviewPrepStep
            resumeId={state.resumeId}
            resumeText={state.resumeText}
            jobDescription={state.jobDescription}
            jobTitle={state.jobTitle}
            companyName={state.companyName}
            onComplete={handleInterviewPrepComplete}
            onBack={handleBack}
            onSkip={handleSkipInterview}
          />
        )}
      </div>
    </div>
  )
}
