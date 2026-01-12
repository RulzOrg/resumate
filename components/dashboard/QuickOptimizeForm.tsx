"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, FileSearch, Check } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UploadMasterResumeDialog } from "./master-resume-dialog"
import { ReviewContentDialog, type ReviewContent } from "@/components/optimization/ReviewContentDialog"
import { ProcessingOverlay, type ProcessingStep } from "@/components/ui/processing-overlay"
import type { WorkExperienceItem } from "@/lib/resume-parser"

interface Resume {
  id: string
  title: string
  file_name: string
  processing_status: string
  kind: string
}

interface QuickOptimizeFormProps {
  resumes: Resume[]
}

export function QuickOptimizeForm({ resumes }: QuickOptimizeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Review dialog state (Phase 4)
  const [extractedContent, setExtractedContent] = useState<ReviewContent | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [extractionStepIndex, setExtractionStepIndex] = useState(0)

  // Extraction steps for the overlay
  const extractionSteps: ProcessingStep[] = [
    { label: "Reading your resume", status: extractionStepIndex > 0 ? "completed" : extractionStepIndex === 0 && isExtracting ? "active" : "pending" },
    { label: "Extracting work experience", status: extractionStepIndex > 1 ? "completed" : extractionStepIndex === 1 ? "active" : "pending" },
    { label: "Preparing review", status: extractionStepIndex > 2 ? "completed" : extractionStepIndex === 2 ? "active" : "pending" },
  ]

  const completedResumes = resumes.filter(
    (r) =>
      r.processing_status === "completed" &&
      (r.kind === "master" || r.kind === "uploaded")
  )

  const [selectedResumeId, setSelectedResumeId] = useState(
    completedResumes[0]?.id || ""
  )
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobDescription, setJobDescription] = useState("")

  // Track which fields have been interacted with (for showing errors)
  const [jobTitleTouched, setJobTitleTouched] = useState(false)
  const [jobDescriptionTouched, setJobDescriptionTouched] = useState(false)

  // Validation state (computed values)
  const charProgress = Math.min((jobDescription.length / 50) * 100, 100)
  const charsNeeded = Math.max(0, 50 - jobDescription.length)
  const isJobDescriptionValid = jobDescription.length >= 50
  const isJobTitleValid = jobTitle.trim().length >= 3
  const isFormValid = selectedResumeId && isJobTitleValid && isJobDescriptionValid && !isLoading

  // Show error states only after field has been touched
  const showJobTitleError = jobTitleTouched && !isJobTitleValid && jobTitle.length > 0
  const showJobDescriptionError = jobDescriptionTouched && !isJobDescriptionValid && jobDescription.length > 0

  // Get tooltip message for disabled button
  const getDisabledReason = () => {
    if (!selectedResumeId) return "Select a resume to continue"
    if (!isJobTitleValid) return "Job title must be at least 3 characters"
    if (!isJobDescriptionValid) return `Job description needs ${charsNeeded} more characters`
    return ""
  }

  // Sync selectedResumeId when resumes change (e.g., after upload)
  useEffect(() => {
    // Clear any stale error
    setError(null)
    
    // If current selection is invalid, select first available resume
    const currentResumeExists = completedResumes.some(r => r.id === selectedResumeId)
    if (!currentResumeExists && completedResumes.length > 0) {
      setSelectedResumeId(completedResumes[0].id)
    }
  }, [resumes]) // Intentionally using resumes as dependency to catch prop changes

  // Phase 4: Modified handleSubmit to call extract-review API first
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Mark all fields as touched on submit attempt (shows inline errors)
    setJobTitleTouched(true)
    setJobDescriptionTouched(true)

    // Early return if validation fails (defensive check - button should be disabled)
    if (!isFormValid) {
      if (!selectedResumeId) {
        setError("Please select a resume")
      } else if (!isJobTitleValid) {
        setError("Job title must be at least 3 characters")
      } else if (!isJobDescriptionValid) {
        setError(`Job description needs ${charsNeeded} more characters`)
      }
      return
    }

    setIsExtracting(true)
    setIsLoading(true)
    setExtractionStepIndex(0)
    console.log("[QuickOptimizeForm] Starting extraction...")

    try {
      // Simulate step progression for better UX
      setExtractionStepIndex(0)
      
      // Step 1: Extract resume content for review
      const extractResponse = await fetch("/api/resumes/extract-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_id: selectedResumeId }),
      })

      // Move to next step while processing
      setExtractionStepIndex(1)

      const extractData = await extractResponse.json()

      if (!extractResponse.ok) {
        // Phase 5: Handle specific extraction errors
        const errorCode = extractData.code
        let errorMessage = extractData.error || "Failed to extract resume content"
        
        switch (errorCode) {
          case "NOT_A_RESUME":
            errorMessage = "This doesn't appear to be a resume. Please upload a valid resume file."
            break
          case "INCOMPLETE":
            errorMessage = "Your resume is missing key sections. Please ensure it includes work experience."
            break
          case "EXTRACTION_FAILED":
            errorMessage = "We couldn't parse your resume. Try uploading a DOCX format for better results."
            break
        }
        throw new Error(errorMessage)
      }

      // Move to final step
      setExtractionStepIndex(2)

      const workExperience: WorkExperienceItem[] = extractData.work_experience || []
      const summary: string | undefined = extractData.summary || undefined

      // Phase 5: Handle empty work experience
      if (workExperience.length === 0) {
        setError("No work experience found in your resume. Please add work experience before optimizing.")
        setIsLoading(false)
        setIsExtracting(false)
        setExtractionStepIndex(0)
        return
      }

      // Complete all steps
      setExtractionStepIndex(3)

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 300))

      // Store extracted content and open review dialog
      console.log("[QuickOptimizeForm] Extraction successful, opening dialog...", {
        workExperienceCount: workExperience.length,
        hasSummary: !!summary,
      })
      setExtractedContent({ workExperience, summary })
      setReviewDialogOpen(true)
      setIsExtracting(false)
      setIsLoading(false)
      setExtractionStepIndex(0)
    } catch (err: any) {
      setError(err.message || "Failed to extract resume content")
      setIsLoading(false)
      setIsExtracting(false)
      setExtractionStepIndex(0)
    }
  }

  // Phase 4: Handle confirm from review dialog - call optimize with confirmed data
  const handleReviewConfirm = async (confirmedContent: ReviewContent) => {
    setIsOptimizing(true)
    setError(null)

    try {
      const response = await fetch("/api/resumes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: selectedResumeId,
          job_title: jobTitle.trim(),
          company_name: companyName.trim() || null,
          job_description: jobDescription.trim(),
          // Pass confirmed content from review dialog
          work_experience: confirmedContent.workExperience,
          summary: confirmedContent.summary,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to optimize resume")
      }

      // Close dialog and redirect to the optimized resume
      setReviewDialogOpen(false)
      router.push(`/dashboard/optimized/${data.optimized_resume.id}`)
    } catch (err: any) {
      setError(err.message || "Something went wrong during optimization")
      setIsOptimizing(false)
    }
  }

  // Handle dialog close - reset optimizing state if closed
  const handleDialogOpenChange = (open: boolean) => {
    setReviewDialogOpen(open)
    if (!open) {
      setIsOptimizing(false)
    }
  }

  if (completedResumes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-foreground/60 dark:text-white/60 mb-4">
          Upload a resume first to start optimizing
        </p>
        <UploadMasterResumeDialog currentResumeCount={0}>
          <Button className="bg-emerald-500 hover:bg-emerald-400 text-black">
            Upload Resume
          </Button>
        </UploadMasterResumeDialog>
      </div>
    )
  }

  return (
    <>
      {/* Extraction Processing Overlay */}
      <ProcessingOverlay
        isOpen={isExtracting}
        title="Analyzing your resume"
        steps={extractionSteps}
        currentStepIndex={extractionStepIndex}
        estimatedTime="~15-30 seconds"
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div data-tour-target="resume-select">
        <label className="block text-sm font-medium mb-2">Select Resume</label>
        <select
          value={selectedResumeId}
          onChange={(e) => {
            setSelectedResumeId(e.target.value)
            setError(null) // Clear error when selection changes
          }}
          className="w-full px-3 py-2 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={isLoading}
        >
          {completedResumes.map((resume) => (
            <option key={resume.id} value={resume.id}>
              {resume.title}
            </option>
          ))}
        </select>
      </div>

      <div data-tour-target="job-details" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Job Title *
            {isJobTitleValid && <Check className="inline w-4 h-4 ml-1 text-emerald-500" />}
          </label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            onBlur={() => setJobTitleTouched(true)}
            placeholder="e.g. Senior Software Engineer"
            className={`w-full px-3 py-2 rounded-lg border bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              showJobTitleError
                ? "border-red-500 dark:border-red-500"
                : isJobTitleValid
                ? "border-emerald-500/50 dark:border-emerald-500/50"
                : "border-border dark:border-white/10"
            }`}
            disabled={isLoading}
          />
          {showJobTitleError && (
            <p className="mt-1 text-xs text-red-500">
              Job title must be at least 3 characters
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Google"
            className="w-full px-3 py-2 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Job Description *
          {isJobDescriptionValid && <Check className="inline w-4 h-4 ml-1 text-emerald-500" />}
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          onBlur={() => setJobDescriptionTouched(true)}
          placeholder="Paste the full job description here..."
          rows={6}
          className={`w-full px-3 py-2 rounded-lg border bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${
            showJobDescriptionError
              ? "border-red-500 dark:border-red-500"
              : isJobDescriptionValid
              ? "border-emerald-500/50 dark:border-emerald-500/50"
              : "border-border dark:border-white/10"
          }`}
          disabled={isLoading}
        />
        <div className="mt-2 space-y-1">
          <Progress
            value={charProgress}
            className={`h-1.5 ${isJobDescriptionValid ? "[&>div]:bg-emerald-500" : showJobDescriptionError ? "[&>div]:bg-red-500" : ""}`}
          />
          <p className={`text-xs ${
            isJobDescriptionValid
              ? "text-emerald-500"
              : showJobDescriptionError
              ? "text-red-500"
              : "text-foreground/60 dark:text-white/60"
          }`}>
            {isJobDescriptionValid ? (
              <>
                <Check className="inline w-3 h-3 mr-1" />
                {jobDescription.length} characters
              </>
            ) : (
              <>{jobDescription.length}/50 characters ({charsNeeded} more needed)</>
            )}
          </p>
        </div>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span data-tour-target="optimize-button" className="w-full">
              <Button
                type="submit"
                disabled={!isFormValid}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-medium py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              >
                {isExtracting ? (
                  <>
                    <FileSearch className="w-4 h-4 mr-2 animate-pulse" />
                    Analyzing resume...
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Optimize Resume
                  </>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          {!isFormValid && !isLoading && (
            <TooltipContent>
              <p>{getDisabledReason()}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Phase 4: Review Content Dialog */}
        <ReviewContentDialog
          open={reviewDialogOpen}
          onOpenChange={handleDialogOpenChange}
          content={extractedContent}
          onConfirm={handleReviewConfirm}
          isLoading={isOptimizing}
        />
      </form>
    </>
  )
}

