"use client"

import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Shield,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { ATSScanResult, ATSSectionResult, ATSIssue } from "@/lib/types/optimize-flow"

interface ATSScanResultsProps {
  result: ATSScanResult
  onContinue: () => void
  onSkipInterview?: () => void
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
  if (score >= 90) return "Excellent Compatibility"
  if (score >= 80) return "Good Compatibility"
  if (score >= 70) return "Fair Compatibility"
  if (score >= 60) return "Needs Improvement"
  return "Poor Compatibility"
}

function getStatusIcon(status: ATSSectionResult["status"]) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />
    case "fail":
      return <AlertCircle className="w-4 h-4 text-red-500" />
  }
}

function getStatusBg(status: ATSSectionResult["status"]) {
  switch (status) {
    case "pass":
      return "bg-emerald-500/10"
    case "warning":
      return "bg-amber-500/10"
    case "fail":
      return "bg-red-500/10"
  }
}

function getStatusBorder(status: ATSSectionResult["status"]) {
  switch (status) {
    case "pass":
      return "border-emerald-500/20"
    case "warning":
      return "border-amber-500/20"
    case "fail":
      return "border-red-500/20"
  }
}

export function ATSScanResults({
  result,
  onContinue,
  onSkipInterview,
}: ATSScanResultsProps) {
  const { overallScore, sections, criticalIssues, warnings, recommendations } = result
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const passCount = sections.filter((s) => s.status === "pass").length
  const warningCount = sections.filter((s) => s.status === "warning").length
  const failCount = sections.filter((s) => s.status === "fail").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-border dark:border-white/10">
        <h2 className="text-xl font-semibold font-space-grotesk mb-1">
          ATS Scan Complete
        </h2>
        <p className="text-sm text-foreground/60 dark:text-white/60">
          Your resume has been scanned for ATS compatibility
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
                ATS Compatibility
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
                    strokeDasharray={`${(overallScore / 100) * 141.37} 141.37`}
                    className={getScoreColor(overallScore)}
                  />
                </svg>
                {/* Score Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                  <span
                    className={cn(
                      "text-3xl font-bold font-space-grotesk",
                      getScoreColor(overallScore)
                    )}
                  >
                    {overallScore}
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
                    getScoreColor(overallScore),
                    getScoreColor(overallScore, "bg")
                  )}
                >
                  <Shield className="w-3 h-3" />
                  {getScoreLabel(overallScore)}
                </span>
              </div>

              {/* Quick Stats */}
              <div className="mt-4 pt-4 border-t border-border dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60 dark:text-white/60">Sections Passed</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {passCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60 dark:text-white/60">Warnings</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {warningCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60 dark:text-white/60">Critical Issues</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {failCount}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Card */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Next: Interview Prep</h4>
                  <p className="text-xs text-foreground/60 dark:text-white/60 mb-3">
                    Prepare for the hardest technical questions with tailored answers.
                  </p>
                  <Button
                    onClick={onContinue}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black"
                    size="sm"
                  >
                    Continue to Interview Prep
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  {onSkipInterview && (
                    <button
                      onClick={onSkipInterview}
                      className="w-full mt-2 text-xs text-foreground/50 hover:text-foreground/70 transition-colors"
                    >
                      Skip this step
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Detailed Results */}
        <div className="lg:col-span-2 space-y-5">
          {/* Critical Issues (if any) */}
          {criticalIssues.length > 0 && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-red-200 dark:border-red-500/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h3 className="font-medium text-red-700 dark:text-red-400">Critical Issues</h3>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70">
                    {criticalIssues.length} issue{criticalIssues.length !== 1 ? "s" : ""} that need
                    immediate attention
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-red-200 dark:divide-red-500/20">
                {criticalIssues.map((issue, index) => (
                  <li key={index} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-medium text-red-600 dark:text-red-400 shrink-0 mt-0.5">
                        !
                      </span>
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">
                          {issue.section}: {issue.issue}
                        </p>
                        <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          {issue.fix}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section-by-Section Results */}
          <div className="rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-border dark:border-white/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Section-by-Section Analysis</h3>
                <p className="text-xs text-foreground/50 dark:text-white/50">
                  {sections.length} sections analyzed
                </p>
              </div>
            </div>
            <div className="divide-y divide-border dark:divide-white/5">
              {sections.map((section, index) => (
                <div key={index}>
                  <button
                    onClick={() =>
                      setExpandedSection(
                        expandedSection === section.name ? null : section.name
                      )
                    }
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          getStatusBg(section.status)
                        )}
                      >
                        {getStatusIcon(section.status)}
                      </div>
                      <div className="text-left">
                        <h4 className="font-medium text-sm">{section.name}</h4>
                        <p className="text-xs text-foreground/50 dark:text-white/50">
                          {section.details}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase",
                          section.status === "pass" &&
                            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          section.status === "warning" &&
                            "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          section.status === "fail" &&
                            "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}
                      >
                        {section.status}
                      </span>
                      {section.status !== "pass" && (
                        expandedSection === section.name ? (
                          <ChevronUp className="w-4 h-4 text-foreground/40" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-foreground/40" />
                        )
                      )}
                    </div>
                  </button>
                  {expandedSection === section.name && section.status !== "pass" && (
                    <div className="px-5 pb-4">
                      <div
                        className={cn(
                          "p-3 rounded-lg border",
                          getStatusBg(section.status),
                          getStatusBorder(section.status)
                        )}
                      >
                        {section.risk && (
                          <p className="text-sm mb-2">
                            <span className="font-medium">Risk: </span>
                            <span className="text-foreground/80 dark:text-white/80">
                              {section.risk}
                            </span>
                          </p>
                        )}
                        {section.fix && (
                          <p className="text-sm flex items-start gap-1.5">
                            <Wrench className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span className="text-foreground/80 dark:text-white/80">
                              {section.fix}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-200 dark:border-amber-500/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-medium text-amber-700 dark:text-amber-400">Warnings</h3>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    {warnings.length} issue{warnings.length !== 1 ? "s" : ""} that may affect
                    parsing
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-amber-200 dark:divide-amber-500/20">
                {warnings.map((warning, index) => (
                  <li key={index} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-medium text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          <span className="font-medium">{warning.section}:</span> {warning.issue}
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          {warning.fix}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-border dark:border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-medium">Recommendations</h3>
                  <p className="text-xs text-foreground/50 dark:text-white/50">
                    Tips to improve ATS compatibility
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-border dark:divide-white/5">
                {recommendations.map((rec, index) => (
                  <li key={index} className="px-5 py-3 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-sm text-foreground/80 dark:text-white/80 leading-relaxed">
                      {rec}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bottom CTA (mobile) */}
          <div className="lg:hidden space-y-2">
            <Button
              onClick={onContinue}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3"
            >
              Continue to Interview Prep
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {onSkipInterview && (
              <button
                onClick={onSkipInterview}
                className="w-full text-sm text-foreground/50 hover:text-foreground/70 transition-colors py-2"
              >
                Skip interview prep
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
