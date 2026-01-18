"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Check, Sparkles, Loader2 } from "lucide-react"
import { UploadMasterResumeDialog } from "@/components/dashboard/master-resume-dialog"
import type { AnalysisResult } from "@/lib/types/optimize-flow"

interface Resume {
  id: string
  title: string
  file_name: string
  processing_status: string
  kind: string
}

interface AnalysisStepProps {
  resumes: Resume[]
  onAnalysisComplete: (
    result: AnalysisResult,
    resumeText: string,
    formData: { resumeId: string; jobTitle: string; jobDescription: string; companyName: string }
  ) => void
  initialResumeId?: string
}

export function AnalysisStep({
  resumes,
  onAnalysisComplete,
  initialResumeId,
}: AnalysisStepProps) {
  const [selectedResumeId, setSelectedResumeId] = useState(
    initialResumeId || resumes[0]?.id || ""
  )
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validation
  const [jobTitleTouched, setJobTitleTouched] = useState(false)
  const [jobDescriptionTouched, setJobDescriptionTouched] = useState(false)

  const charProgress = Math.min((jobDescription.length / 50) * 100, 100)
  const charsNeeded = Math.max(0, 50 - jobDescription.length)
  const isJobDescriptionValid = jobDescription.length >= 50
  const isJobTitleValid = jobTitle.trim().length >= 3
  const isFormValid = selectedResumeId && isJobTitleValid && isJobDescriptionValid && !isLoading

  const showJobTitleError = jobTitleTouched && !isJobTitleValid && jobTitle.length > 0
  const showJobDescriptionError = jobDescriptionTouched && !isJobDescriptionValid && jobDescription.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setJobTitleTouched(true)
    setJobDescriptionTouched(true)

    if (!isFormValid) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/optimize-flow/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: selectedResumeId,
          job_description: jobDescription.trim(),
          job_title: jobTitle.trim(),
          company_name: companyName.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze resume")
      }

      onAnalysisComplete(data.result, data.resume_text || "", {
        resumeId: selectedResumeId,
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim(),
        companyName: companyName.trim(),
      })
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  if (resumes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Resume Found</h3>
        <p className="text-foreground/60 dark:text-white/60 mb-6 max-w-md mx-auto">
          Upload a resume first to start the optimization flow
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
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold font-space-grotesk mb-1">
          Step 1: Analyze Your Resume
        </h2>
        <p className="text-foreground/60 dark:text-white/60">
          Select your resume and paste the job description to get a detailed analysis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Resume Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Resume</label>
          <select
            value={selectedResumeId}
            onChange={(e) => setSelectedResumeId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={isLoading}
          >
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.title}
              </option>
            ))}
          </select>
        </div>

        {/* Job Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              className={`w-full px-3 py-2.5 rounded-lg border bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                showJobTitleError
                  ? "border-red-500"
                  : isJobTitleValid
                  ? "border-emerald-500/50"
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
              className="w-full px-3 py-2.5 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Job Description */}
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
            rows={8}
            className={`w-full px-3 py-2.5 rounded-lg border bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${
              showJobDescriptionError
                ? "border-red-500"
                : isJobDescriptionValid
                ? "border-emerald-500/50"
                : "border-border dark:border-white/10"
            }`}
            disabled={isLoading}
          />
          <div className="mt-2 space-y-1">
            <Progress
              value={charProgress}
              className={`h-1.5 ${
                isJobDescriptionValid
                  ? "[&>div]:bg-emerald-500"
                  : showJobDescriptionError
                  ? "[&>div]:bg-red-500"
                  : ""
              }`}
            />
            <p
              className={`text-xs ${
                isJobDescriptionValid
                  ? "text-emerald-500"
                  : showJobDescriptionError
                  ? "text-red-500"
                  : "text-foreground/60 dark:text-white/60"
              }`}
            >
              {isJobDescriptionValid ? (
                <>
                  <Check className="inline w-3 h-3 mr-1" />
                  {jobDescription.length} characters
                </>
              ) : (
                <>
                  {jobDescription.length}/50 characters ({charsNeeded} more needed)
                </>
              )}
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!isFormValid}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-medium py-3 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Resume...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Resume
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
