"use client"

import { useState, useCallback } from "react"
import { Sparkles } from "lucide-react"
import { ResumeUploader } from "./resume-uploader"
import { EmailCaptureForm } from "./email-capture-form"
import { ResultsDisplay } from "./results-display"
import { FixPreviewModal } from "./FixPreviewModal"
import { SocialProof } from "./social-proof"
import { HowItWorks } from "./how-it-works"
import { FeaturesGrid } from "./features-grid"
import { FAQSection } from "./faq-section"
import { CheckerFooter } from "./checker-footer"
import { ProcessingOverlay, useProcessingSteps } from "@/components/ui/processing-overlay"
import { PublicHeader } from "@/components/public-header"
import type { ATSCheckResult } from "@/lib/ats-checker"

// State machine types
type ATSCheckerStep =
  | { step: "upload" }
  | { step: "uploading" }
  | { step: "email_capture"; checkId: string; preview: PreviewData }
  | { step: "analyzing"; checkId: string }
  | { step: "results"; checkId: string; results: ATSCheckResult }
  | { step: "error"; error: string; canRetry: boolean }

interface PreviewData {
  estimatedSections: number
  hasContactInfo: boolean
  hasExperience: boolean
  estimatedWordCount: number
}

const PROCESSING_STEPS = [
  "Uploading your resume...",
  "Extracting content...",
  "Validating document...",
  "Preparing analysis...",
]

const ANALYZING_STEPS = [
  "Parsing your resume...",
  "Analyzing your experience...",
  "Extracting your skills...",
  "Generating recommendations...",
]

export function ATSCheckerClient() {
  const [state, setState] = useState<ATSCheckerStep>({ step: "upload" })
  const uploadSteps = useProcessingSteps(PROCESSING_STEPS)
  const analyzeSteps = useProcessingSteps(ANALYZING_STEPS)

  // Handle file upload
  const handleUploadStart = useCallback(() => {
    setState({ step: "uploading" })
    uploadSteps.start()
  }, [uploadSteps])

  const handleUploadProgress = useCallback((stepIndex: number) => {
    uploadSteps.setCurrentStep(stepIndex)
  }, [uploadSteps])

  const handleUploadSuccess = useCallback((data: { checkId: string; preview: PreviewData }) => {
    uploadSteps.complete()
    setTimeout(() => {
      setState({
        step: "email_capture",
        checkId: data.checkId,
        preview: data.preview,
      })
    }, 500)
  }, [uploadSteps])

  const handleUploadError = useCallback((error: string) => {
    uploadSteps.reset()
    setState({ step: "error", error, canRetry: true })
  }, [uploadSteps])

  // Handle email submission and analysis
  const handleAnalyzeStart = useCallback((checkId: string) => {
    setState({ step: "analyzing", checkId })
    analyzeSteps.start()
  }, [analyzeSteps])

  const handleAnalyzeProgress = useCallback((stepIndex: number) => {
    analyzeSteps.setCurrentStep(stepIndex)
  }, [analyzeSteps])

  const handleAnalyzeComplete = useCallback((checkId: string, results: ATSCheckResult) => {
    analyzeSteps.complete()
    setTimeout(() => {
      setState({ step: "results", checkId, results })
    }, 500)
  }, [analyzeSteps])

  const handleAnalyzeError = useCallback((error: string) => {
    analyzeSteps.reset()
    setState({ step: "error", error, canRetry: true })
  }, [analyzeSteps])

  // Handle retry
  const handleRetry = useCallback(() => {
    setState({ step: "upload" })
  }, [])

  // Handle "Fix This" action — opens preview modal
  const [fixPreviewState, setFixPreviewState] = useState<{
    issueId: string
    checkId: string
    issueTitle?: string
    issueSeverity?: string
  } | null>(null)

  const handleFixIssue = useCallback((issueId: string) => {
    if (state.step !== "results") return

    const issue = state.results.issues.find(i => i.id === issueId)
    setFixPreviewState({
      issueId,
      checkId: state.checkId,
      issueTitle: issue?.title,
      issueSeverity: issue?.severity,
    })
  }, [state])

  const handleFixPreviewClose = useCallback(() => {
    setFixPreviewState(null)
  }, [])

  const handleApplyFix = useCallback((_checkId: string, _issueId: string) => {
    if (state.step !== "results") return

    // Redirect to signup with fix context preserved
    const params = new URLSearchParams({
      source: "ats-checker",
      checkId: state.checkId,
    })

    window.location.href = `/sign-up?redirect=${encodeURIComponent(`/dashboard?${params.toString()}`)}`
  }, [state])

  // Handle create account
  const handleCreateAccount = useCallback(() => {
    if (state.step !== "results") return

    const params = new URLSearchParams({
      source: "ats-checker",
      checkId: state.checkId,
    })

    window.location.href = `/sign-up?redirect=${encodeURIComponent(`/dashboard?${params.toString()}`)}`
  }, [state])

  // Show results page without extra sections
  if (state.step === "results") {
    return (
      <div className="min-h-screen bg-background">
        {/* Background gradient */}
        <div className="absolute top-0 left-0 w-full h-[880px] -z-10 gradient-blur" />

        {/* Header */}
        <PublicHeader />

        {/* Results */}
        <div className="container mx-auto px-4 py-8">
          <ResultsDisplay
            results={state.results}
            onFixIssue={handleFixIssue}
            onCreateAccount={handleCreateAccount}
          />
        </div>

        {/* Fix Preview Modal */}
        <FixPreviewModal
          state={fixPreviewState}
          onClose={handleFixPreviewClose}
          onApplyFix={handleApplyFix}
        />

        <CheckerFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="absolute top-0 left-0 w-full h-[880px] -z-10 gradient-blur" />

      {/* Header */}
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl text-center mx-auto pt-14 pb-12 sm:pt-20 md:pt-28 px-4">
        {/* Social Proof */}
        <SocialProof />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-medium font-sans">Instant ATS check</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl tracking-tight sm:text-5xl md:text-6xl mx-auto font-space-grotesk font-semibold mt-4 text-foreground">
          Free ATS Resume Checker
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-base sm:text-lg font-normal text-muted-foreground mt-6 mx-auto font-sans">
          Check if your resume is ATS-compatible and get personalized recommendations
          to improve your chances of landing interviews.
        </p>

        {/* Upload Form or Email Capture */}
        <div className="mt-8">
          {state.step === "upload" && (
            <ResumeUploader
              onUploadStart={handleUploadStart}
              onUploadProgress={handleUploadProgress}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          )}

          {state.step === "email_capture" && (
            <div className="max-w-2xl mx-auto">
              <EmailCaptureForm
                checkId={state.checkId}
                preview={state.preview}
                onAnalyzeStart={handleAnalyzeStart}
                onAnalyzeProgress={handleAnalyzeProgress}
                onAnalyzeComplete={handleAnalyzeComplete}
                onAnalyzeError={handleAnalyzeError}
              />
            </div>
          )}

          {state.step === "error" && (
            <div className="max-w-md mx-auto text-center">
              <div className="p-6 rounded-xl border border-border bg-card">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-red-500 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 font-sans text-foreground">Something went wrong</h3>
                <p className="text-muted-foreground mb-4 font-sans">{state.error}</p>
                {state.canRetry && (
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-sans font-medium shadow-lg shadow-primary/20"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Only show additional sections during upload state */}
      {state.step === "upload" && (
        <>
          {/* How It Works */}
          <HowItWorks />

          {/* Features Grid */}
          <FeaturesGrid />

          {/* FAQ Section */}
          <FAQSection />
        </>
      )}

      {/* Footer */}
      <CheckerFooter />

      {/* Processing Overlays */}
      <ProcessingOverlay
        isOpen={state.step === "uploading"}
        title="Uploading Resume"
        subtitle="Please wait while we process your file"
        steps={uploadSteps.steps}
        currentStepIndex={uploadSteps.currentStep}
        estimatedTime="~10 seconds"
      />

      <ProcessingOverlay
        isOpen={state.step === "analyzing"}
        title="Analyzing Resume"
        subtitle="Running comprehensive ATS checks"
        steps={analyzeSteps.steps}
        currentStepIndex={analyzeSteps.currentStep}
        estimatedTime="~30 seconds"
        timeout={60000}
      />
    </div>
  )
}
