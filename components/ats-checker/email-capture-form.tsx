"use client"

import { useState, useCallback } from "react"
import { CheckCircle2, FileText, Users, Zap, Mail, User, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ATSCheckResult } from "@/lib/ats-checker"

interface EmailCaptureFormProps {
  checkId: string
  preview: {
    estimatedSections: number
    hasContactInfo: boolean
    hasExperience: boolean
    estimatedWordCount: number
  }
  onAnalyzeStart: (checkId: string) => void
  onAnalyzeProgress: (step: number) => void
  onAnalyzeComplete: (checkId: string, results: ATSCheckResult) => void
  onAnalyzeError: (error: string) => void
}

export function EmailCaptureForm({
  checkId,
  preview,
  onAnalyzeStart,
  onAnalyzeProgress,
  onAnalyzeComplete,
  onAnalyzeError,
}: EmailCaptureFormProps) {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!email || isSubmitting) return

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address")
        return
      }

      setError(null)
      setIsSubmitting(true)
      onAnalyzeStart(checkId)

      try {
        // Step 1: Parsing
        onAnalyzeProgress(0)

        const response = await fetch(`/api/public/ats-check/${checkId}/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            firstName: firstName || undefined,
            marketingConsent: true,
          }),
        })

        // Step 2: Analyzing
        onAnalyzeProgress(1)

        if (!response.ok) {
          let errorMessage = `Request failed with status ${response.status}`
          try {
            const errorData = await response.json()
            errorMessage = errorData.userMessage || errorData.message || errorMessage
          } catch {
            try {
              const errorText = await response.text()
              if (errorText) {
                errorMessage = errorText
              }
            } catch {
              // Keep default errorMessage
            }
          }
          onAnalyzeError(errorMessage)
          setIsSubmitting(false)
          return
        }

        let result
        try {
          result = await response.json()
        } catch (parseError) {
          onAnalyzeError("Failed to parse server response. Please try again.")
          setIsSubmitting(false)
          return
        }

        if (result.status === "error") {
          onAnalyzeError(result.userMessage || "Analysis failed")
          setIsSubmitting(false)
          return
        }

        // Step 3: Extracting skills
        onAnalyzeProgress(2)

        // Fetch full results
        const resultsResponse = await fetch(
          `/api/public/ats-check/${checkId}/results?email=${encodeURIComponent(email)}`
        )

        // Step 4: Generating recommendations
        onAnalyzeProgress(3)

        if (!resultsResponse.ok) {
          onAnalyzeError(resultsResponse.statusText || "Failed to load results")
          setIsSubmitting(false)
          return
        }

        const resultsData = await resultsResponse.json()

        if (resultsData.status === "error") {
          onAnalyzeError(resultsData.userMessage || "Failed to load results")
          setIsSubmitting(false)
          return
        }

        // Small delay for UX
        await new Promise((resolve) => setTimeout(resolve, 500))

        onAnalyzeComplete(checkId, resultsData.data)
      } catch (err) {
        console.error("Analysis error:", err)
        onAnalyzeError("Something went wrong. Please try again.")
      } finally {
        setIsSubmitting(false)
      }
    },
    [email, firstName, checkId, isSubmitting, onAnalyzeStart, onAnalyzeProgress, onAnalyzeComplete, onAnalyzeError]
  )

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Resume Preview Card */}
      <div className="p-5 rounded-xl border border-border bg-card backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground/90 font-sans">Resume Uploaded Successfully!</h3>
            <p className="text-xs text-muted-foreground font-sans">
              We detected {preview.estimatedSections} section{preview.estimatedSections !== 1 ? 's' : ''} in your resume
            </p>
          </div>
        </div>

        {/* Preview Stats */}
        <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-white dark:bg-card border border-border">
          <div className="text-center">
            <div className="text-xl font-bold text-primary font-space-grotesk">{preview.estimatedSections}</div>
            <div className="text-xs text-muted-foreground/70 font-sans">Sections</div>
          </div>
          <div className="text-center border-x border-border">
            <div className="text-xl font-bold text-primary font-space-grotesk">{preview.estimatedWordCount}</div>
            <div className="text-xs text-muted-foreground/70 font-sans">Words</div>
          </div>
          <div className="text-center">
            <div className={cn(
              "text-xl font-bold font-space-grotesk",
              preview.hasExperience ? "text-primary" : "text-amber-600 dark:text-amber-400"
            )}>
              {preview.hasExperience ? "Yes" : "No"}
            </div>
            <div className="text-xs text-muted-foreground/70 font-sans">Experience</div>
          </div>
        </div>
      </div>

      {/* Email Form */}
      <div className="p-5 rounded-xl border border-border bg-card backdrop-blur-sm">
        <h3 className="font-semibold text-base mb-1 text-center font-sans text-foreground">Get Your Free ATS Score</h3>
        <p className="text-sm text-muted-foreground mb-5 text-center font-sans">
          Enter your email to receive your detailed ATS compatibility report.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-xs font-medium mb-1.5 text-foreground/80 text-center font-sans">
              Email Address <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isSubmitting}
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-full text-sm font-sans",
                  "bg-white dark:bg-card border border-border text-foreground placeholder-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/40",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200",
                  error && "border-red-400 dark:border-red-500/50 focus:ring-red-500/40"
                )}
              />
            </div>
          </div>

          <div>
            <label htmlFor="firstName" className="block text-xs font-medium mb-1.5 text-foreground/80 text-center font-sans">
              First Name <span className="text-muted-foreground">(optional)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                disabled={isSubmitting}
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-full text-sm font-sans",
                  "bg-white dark:bg-card border border-border text-foreground placeholder-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/40",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200"
                )}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 text-center font-sans">{error}</p>
          )}

          <button
            type="submit"
            disabled={!email || isSubmitting}
            className={cn(
              "w-full py-3 px-6 rounded-full font-medium text-sm transition-all duration-200 font-sans",
              "inline-flex items-center justify-center gap-2",
              email && !isSubmitting
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                : "bg-muted text-muted-foreground/70 cursor-not-allowed"
            )}
          >
            <span>{isSubmitting ? "Analyzing..." : "Get My ATS Score"}</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </button>

          <p className="text-[11px] text-muted-foreground/70 text-center font-sans pt-1">
            By continuing, you agree to receive email updates. Unsubscribe anytime.
          </p>
        </form>
      </div>

      {/* What You'll Get */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-center text-muted-foreground font-sans">What you'll get:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-border bg-card">
            <CheckCircle2 className="w-5 h-5 text-primary mb-2" />
            <p className="font-medium text-sm text-foreground/90 font-sans">ATS Score</p>
            <p className="text-xs text-muted-foreground/70 mt-1 font-sans">
              See how well your resume performs with applicant tracking systems
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-border bg-card">
            <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400 mb-2" />
            <p className="font-medium text-sm text-foreground/90 font-sans">Issue Detection</p>
            <p className="text-xs text-muted-foreground/70 mt-1 font-sans">
              Find formatting, content, and keyword issues hurting your chances
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-border bg-card">
            <Users className="w-5 h-5 text-blue-500 dark:text-blue-400 mb-2" />
            <p className="font-medium text-sm text-foreground/90 font-sans">Recommendations</p>
            <p className="text-xs text-muted-foreground/70 mt-1 font-sans">
              Get personalized tips to improve your resume
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
