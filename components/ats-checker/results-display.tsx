"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ATSCheckResult, ATSIssue } from "@/lib/ats-checker"

interface ResultsDisplayProps {
  results: ATSCheckResult
  onFixIssue: (issueId: string) => void
  onCreateAccount: () => void
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

export function ResultsDisplay({ results, onFixIssue, onCreateAccount }: ResultsDisplayProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["content"])

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Score Card */}
      <div className="lg:col-span-1">
        <div className="sticky top-8 space-y-4">
          {/* Overall Score */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-center mb-4 text-slate-500 dark:text-white/70 uppercase tracking-wider font-sans">
              Your Score
            </h2>

            {/* Score Gauge */}
            <div className="relative w-44 h-24 mx-auto mb-3">
              <svg viewBox="0 0 100 50" className="w-full h-full">
                {/* Background arc */}
                <path
                  d="M 5 50 A 45 45 0 0 1 95 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-slate-200 dark:text-white/10"
                />
                {/* Score arc */}
                <path
                  d="M 5 50 A 45 45 0 0 1 95 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(results.overallScore / 100) * 141.37} 141.37`}
                  className={getScoreColor(results.overallScore)}
                />
              </svg>
              {/* Score Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                <span className={cn(
                  "text-3xl font-bold font-space-grotesk",
                  getScoreColor(results.overallScore)
                )}>
                  {results.overallScore}<span className="text-lg text-slate-400 dark:text-white/50">/100</span>
                </span>
                <span className="text-xs text-slate-400 dark:text-white/50 font-sans">
                  {results.issueCount.total} Issue{results.issueCount.total !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Category Scores */}
            <div className="space-y-2 border-t border-slate-200 dark:border-white/10 pt-4">
              <CategoryScoreRow
                name="CONTENT"
                score={results.content.score}
                issueCount={getCategoryIssueCount(results.issues, "content")}
                isExpanded={expandedCategories.includes("content")}
                onClick={() => toggleCategory("content")}
              />
              <CategoryScoreRow
                name="SECTIONS"
                score={results.sections.score}
                issueCount={getCategoryIssueCount(results.issues, "sections")}
                isExpanded={expandedCategories.includes("sections")}
                onClick={() => toggleCategory("sections")}
              />
              <CategoryScoreRow
                name="ATS ESSENTIALS"
                score={results.atsEssentials.score}
                issueCount={getCategoryIssueCount(results.issues, "ats_essentials")}
                isExpanded={expandedCategories.includes("ats_essentials")}
                onClick={() => toggleCategory("ats_essentials")}
              />
              <CategoryScoreRow
                name="TAILORING"
                score={results.tailoring?.score}
                issueCount={results.tailoring ? getCategoryIssueCount(results.issues, "tailoring") : undefined}
                isExpanded={expandedCategories.includes("tailoring")}
                onClick={() => toggleCategory("tailoring")}
                locked={!results.tailoring}
              />
            </div>

            {/* CTA Button */}
            <button
              onClick={onCreateAccount}
              className="w-full mt-5 py-3 px-4 rounded-full font-medium text-sm transition-all bg-emerald-500 text-black hover:bg-emerald-400 flex items-center justify-center gap-2 font-sans shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              Fix These Issues
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Summary */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm">
            <h3 className="font-medium text-sm mb-3 font-sans flex items-center gap-2 text-slate-700 dark:text-white">
              <TrendingUp className="w-4 h-4 text-slate-400 dark:text-white/50" />
              Quick Summary
            </h3>
            {results.summary.strengths.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-wider mb-1.5 font-sans">Strengths</p>
                <ul className="space-y-1.5">
                  {results.summary.strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="text-xs flex items-start gap-2 text-slate-700 dark:text-white/80 font-sans">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {results.summary.criticalIssues.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-wider mb-1.5 font-sans">Top Issues</p>
                <ul className="space-y-1.5">
                  {results.summary.criticalIssues.slice(0, 3).map((s, i) => (
                    <li key={i} className="text-xs flex items-start gap-2 text-slate-700 dark:text-white/80 font-sans">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Detailed Results */}
      <div className="lg:col-span-2 space-y-4">
        {/* Content Category */}
        <CategorySection
          title="CONTENT"
          score={results.content.score}
          issueCount={getCategoryIssueCount(results.issues, "content")}
          isExpanded={expandedCategories.includes("content")}
          onToggle={() => toggleCategory("content")}
          subcategories={[
            { ...results.content.parseRate, name: "ATS Parse Rate" },
            { ...results.content.quantifyingImpact, name: "Quantifying Impact" },
            { ...results.content.repetition, name: "Repetition" },
            { ...results.content.spellingGrammar, name: "Spelling & Grammar" },
          ]}
          issues={results.issues.filter((i) => i.category === "content")}
          onFixIssue={onFixIssue}
        />

        {/* Sections Category */}
        <CategorySection
          title="SECTIONS"
          score={results.sections.score}
          issueCount={getCategoryIssueCount(results.issues, "sections")}
          isExpanded={expandedCategories.includes("sections")}
          onToggle={() => toggleCategory("sections")}
          subcategories={[
            { ...results.sections.contact, name: "Contact Information" },
            { ...results.sections.experience, name: "Work Experience" },
            { ...results.sections.education, name: "Education" },
            { ...results.sections.skills, name: "Skills" },
            { ...results.sections.summary, name: "Professional Summary" },
          ]}
          issues={results.issues.filter((i) => i.category === "sections")}
          onFixIssue={onFixIssue}
        />

        {/* ATS Essentials Category */}
        <CategorySection
          title="ATS ESSENTIALS"
          score={results.atsEssentials.score}
          issueCount={getCategoryIssueCount(results.issues, "ats_essentials")}
          isExpanded={expandedCategories.includes("ats_essentials")}
          onToggle={() => toggleCategory("ats_essentials")}
          subcategories={[
            { ...results.atsEssentials.fileFormat, name: "File Format" },
            { ...results.atsEssentials.headings, name: "Section Headings" },
            { ...results.atsEssentials.tables, name: "Table Detection" },
            { ...results.atsEssentials.graphics, name: "Graphics & Images" },
            { ...results.atsEssentials.fonts, name: "Font Compatibility" },
            { ...results.atsEssentials.dates, name: "Date Formatting" },
          ]}
          issues={results.issues.filter((i) => i.category === "ats_essentials")}
          onFixIssue={onFixIssue}
        />

        {/* Tailoring Category */}
        {results.tailoring ? (
          <CategorySection
            title="TAILORING"
            score={results.tailoring.score}
            issueCount={getCategoryIssueCount(results.issues, "tailoring")}
            isExpanded={expandedCategories.includes("tailoring")}
            onToggle={() => toggleCategory("tailoring")}
            subcategories={[
              { ...results.tailoring.keywordMatch, name: "Keyword Match" },
              { ...results.tailoring.skillsAlignment, name: "Skills Alignment" },
            ]}
            issues={results.issues.filter((i) => i.category === "tailoring")}
            onFixIssue={onFixIssue}
          />
        ) : (
          <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium uppercase tracking-wide font-sans text-slate-700 dark:text-white">TAILORING</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/50 font-sans">
                Not Available
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-white/60 font-sans">
              Add a job description to see how well your resume matches specific roles.
            </p>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50 dark:from-emerald-500/10 via-emerald-50 dark:via-emerald-500/5 to-transparent">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1 font-sans text-slate-900 dark:text-white">Ready to fix these issues?</h3>
              <p className="text-sm text-slate-500 dark:text-white/60 font-sans">
                Create a free account to use our AI-powered optimizer and fix all issues automatically.
              </p>
            </div>
            <button
              onClick={onCreateAccount}
              className="px-5 py-2.5 rounded-full font-medium text-sm transition-all whitespace-nowrap bg-emerald-500 text-black hover:bg-emerald-400 flex items-center gap-2 font-sans shadow-lg shadow-emerald-500/20"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper Components
function CategoryScoreRow({
  name,
  score,
  issueCount,
  isExpanded,
  onClick,
  locked,
}: {
  name: string
  score?: number
  issueCount?: number
  isExpanded: boolean
  onClick: () => void
  locked?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={cn(
        "w-full flex items-center justify-between py-2 px-3 rounded-lg transition-all duration-200 font-sans",
        "hover:bg-slate-100 dark:hover:bg-white/5",
        isExpanded && "bg-slate-100 dark:bg-white/5",
        locked && "opacity-40 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600 dark:text-white/70">{name}</span>
        {issueCount !== undefined && issueCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/50">
            {issueCount}
          </span>
        )}
      </div>
      {score !== undefined ? (
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          getScoreColor(score),
          getScoreColor(score, "bg")
        )}>
          {score}%
        </span>
      ) : (
        <span className="text-xs text-slate-300 dark:text-white/30">??%</span>
      )}
    </button>
  )
}

function CategorySection({
  title,
  score,
  issueCount,
  isExpanded,
  onToggle,
  subcategories,
  issues,
  onFixIssue,
}: {
  title: string
  score: number
  issueCount: number
  isExpanded: boolean
  onToggle: () => void
  subcategories: Array<{ name: string; score: number; status: string; issues: ATSIssue[]; details?: string }>
  issues: ATSIssue[]
  onFixIssue: (issueId: string) => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm font-sans text-slate-900 dark:text-white">{title}</span>
          {issueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/50 font-sans">
              {issueCount} issue{issueCount !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full",
            getScoreColor(score),
            getScoreColor(score, "bg")
          )}>
            {score}%
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400 dark:text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-white/40" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-white/10 p-4 space-y-4">
          {/* Subcategories */}
          <div className="space-y-2">
            {subcategories.map((sub, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5"
              >
                <div className="flex items-center gap-2">
                  {sub.status === "pass" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  ) : sub.status === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                  )}
                  <span className="text-sm font-medium text-slate-700 dark:text-white/80 font-sans">{sub.name}</span>
                  {sub.issues.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/50 font-sans">
                      {sub.issues.length} issue{sub.issues.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {sub.details && (
                  <span className="text-xs text-slate-400 dark:text-white/50 font-sans">{sub.details}</span>
                )}
              </div>
            ))}
          </div>

          {/* Issues */}
          {issues.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-medium text-slate-400 dark:text-white/50 uppercase tracking-wider font-sans">Issues</h4>
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} onFix={onFixIssue} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IssueCard({
  issue,
  onFix,
}: {
  issue: ATSIssue
  onFix: (issueId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const severityStyles = {
    critical: {
      border: "border-red-200 dark:border-red-500/30",
      bg: "bg-red-50 dark:bg-red-500/10",
      icon: "text-red-500 dark:text-red-400",
      badge: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300",
    },
    warning: {
      border: "border-amber-200 dark:border-amber-500/30",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      icon: "text-amber-500 dark:text-amber-400",
      badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300",
    },
    info: {
      border: "border-slate-200 dark:border-white/10",
      bg: "bg-slate-50 dark:bg-white/5",
      icon: "text-slate-400 dark:text-white/50",
      badge: "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50",
    },
  }

  const styles = severityStyles[issue.severity] || severityStyles.info

  return (
    <div className={cn(
      "rounded-xl border p-4",
      styles.border,
      styles.bg
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {issue.severity === "critical" ? (
            <AlertCircle className={cn("w-5 h-5 shrink-0 mt-0.5", styles.icon)} />
          ) : issue.severity === "warning" ? (
            <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5", styles.icon)} />
          ) : (
            <Info className={cn("w-5 h-5 shrink-0 mt-0.5", styles.icon)} />
          )}
          <div className="flex-1 min-w-0">
            <h5 className="font-medium text-sm text-slate-900 dark:text-white/90 font-sans">{issue.title}</h5>
            <p className="text-xs text-slate-500 dark:text-white/60 mt-1 font-sans leading-relaxed">{issue.description}</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "text-xs font-medium px-2 py-1 rounded-full transition-colors whitespace-nowrap font-sans",
            styles.badge,
            "hover:opacity-80"
          )}
        >
          {isExpanded ? "Less" : "More"}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
          <div>
            <p className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-wider mb-1.5 font-sans">
              Recommendation
            </p>
            <p className="text-sm text-slate-700 dark:text-white/80 font-sans leading-relaxed">{issue.recommendation}</p>
          </div>

          {issue.fixable && (
            <button
              onClick={() => onFix(issue.id)}
              className="px-4 py-2 rounded-full text-xs font-medium transition-all bg-emerald-500 text-black hover:bg-emerald-400 font-sans shadow-lg shadow-emerald-500/20"
            >
              Fix This Issue
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function
function getCategoryIssueCount(issues: ATSIssue[], category: string): number {
  return issues.filter((i) => i.category === category).length
}
