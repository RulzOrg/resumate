"use client"

import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AnalysisResult } from "@/lib/types/optimize-flow"

interface AnalysisResultsProps {
  result: AnalysisResult
  jobTitle: string
  companyName?: string
  onContinue: () => void
}

// Score color helpers for dark/light mode
function getScoreColor(score: number, type: "text" | "bg" | "border" = "text") {
  if (score >= 80) {
    if (type === "text") return "text-emerald-600 dark:text-emerald-400"
    if (type === "bg") return "bg-emerald-100 dark:bg-emerald-500/20"
    return "border-emerald-300 dark:border-emerald-500/30"
  }
  if (score >= 60) {
    if (type === "text") return "text-amber-600 dark:text-amber-400"
    if (type === "bg") return "bg-amber-100 dark:bg-amber-500/20"
    return "border-amber-300 dark:border-amber-500/30"
  }
  if (type === "text") return "text-red-600 dark:text-red-400"
  if (type === "bg") return "bg-red-100 dark:bg-red-500/20"
  return "border-red-300 dark:border-red-500/30"
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Exceptional Match"
  if (score >= 80) return "Strong Match"
  if (score >= 70) return "Good Match"
  if (score >= 60) return "Moderate Match"
  if (score >= 50) return "Needs Work"
  return "Significant Gaps"
}

export function AnalysisResults({
  result,
  jobTitle,
  companyName,
  onContinue,
}: AnalysisResultsProps) {
  const { matchScore, strongFitReasons, holdingBackReasons, missingKeywords } = result

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-border dark:border-white/10">
        <h2 className="text-xl font-semibold font-space-grotesk mb-1">
          Analysis Complete
        </h2>
        <p className="text-sm text-foreground/60 dark:text-white/60">
          {jobTitle}
          {companyName && ` at ${companyName}`}
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Score Card (sticky on desktop) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4 space-y-4">
            {/* Score Gauge Card */}
            <div className="p-5 rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5">
              <h3 className="text-xs font-medium text-center mb-4 text-foreground/50 dark:text-white/50 uppercase tracking-wider">
                Match Score
              </h3>

              {/* Score Gauge */}
              <div className="relative w-40 h-24 mx-auto mb-3">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                  {/* Background arc */}
                  <path
                    d="M 5 50 A 45 45 0 0 1 95 50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="text-border dark:text-white/10"
                  />
                  {/* Score arc */}
                  <path
                    d="M 5 50 A 45 45 0 0 1 95 50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(matchScore / 100) * 141.37} 141.37`}
                    className={getScoreColor(matchScore)}
                  />
                </svg>
                {/* Score Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                  <span
                    className={cn(
                      "text-3xl font-bold font-space-grotesk",
                      getScoreColor(matchScore)
                    )}
                  >
                    {matchScore}
                    <span className="text-lg text-foreground/40 dark:text-white/40">
                      /100
                    </span>
                  </span>
                </div>
              </div>

              {/* Score Label */}
              <div className="text-center">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                    getScoreColor(matchScore),
                    getScoreColor(matchScore, "bg")
                  )}
                >
                  {matchScore >= 70 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {getScoreLabel(matchScore)}
                </span>
              </div>

              {/* Quick Stats */}
              <div className="mt-4 pt-4 border-t border-border dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60 dark:text-white/60">Strengths</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {strongFitReasons.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60 dark:text-white/60">Gaps</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {holdingBackReasons.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60 dark:text-white/60">Missing Keywords</span>
                  <span className="font-medium text-foreground dark:text-white">
                    {missingKeywords.length}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Card */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Ready to optimize?</h4>
                  <p className="text-xs text-foreground/60 dark:text-white/60 mb-3">
                    We'll rewrite your experience using the X-Y-Z formula to add missing
                    keywords naturally.
                  </p>
                  <Button
                    onClick={onContinue}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black"
                    size="sm"
                  >
                    Continue to Rewrite
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Detailed Results */}
        <div className="lg:col-span-2 space-y-5">
          {/* Strong Fit Reasons */}
          <div className="rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-border dark:border-white/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-medium">Why You're a Strong Fit</h3>
                <p className="text-xs text-foreground/50 dark:text-white/50">
                  {strongFitReasons.length} reasons based on your resume
                </p>
              </div>
            </div>
            <ul className="divide-y divide-border dark:divide-white/5">
              {strongFitReasons.map((reason, index) => (
                <li key={index} className="px-5 py-3 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <p className="text-sm text-foreground/80 dark:text-white/80 leading-relaxed">
                    {reason}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Holding Back Reasons */}
          {holdingBackReasons.length > 0 && (
            <div className="rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-border dark:border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-medium">What's Holding You Back</h3>
                  <p className="text-xs text-foreground/50 dark:text-white/50">
                    {holdingBackReasons.length} gap{holdingBackReasons.length !== 1 ? "s" : ""}{" "}
                    relative to the job description
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-border dark:divide-white/5">
                {holdingBackReasons.map((reason, index) => (
                  <li key={index} className="px-5 py-3 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-medium text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-sm text-foreground/80 dark:text-white/80 leading-relaxed">
                      {reason}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Keywords */}
          <div className="rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-border dark:border-white/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Top Missing Keywords</h3>
                <p className="text-xs text-foreground/50 dark:text-white/50">
                  Add these keywords to improve ATS matching
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {missingKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                      "bg-primary/10 text-primary border border-primary/20",
                      "hover:bg-primary/20 transition-colors"
                    )}
                  >
                    <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    {keyword}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs text-foreground/50 dark:text-white/50">
                These keywords appear in the job description but are missing from your
                resume. We'll add them naturally in the next step.
              </p>
            </div>
          </div>

          {/* Bottom CTA (mobile) */}
          <div className="lg:hidden">
            <Button
              onClick={onContinue}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Continue to Rewrite Experience
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
