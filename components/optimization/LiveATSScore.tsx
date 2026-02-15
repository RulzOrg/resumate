"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react"
import type { LiveATSResult } from "@/lib/ats-checker/live-score"

interface LiveATSScoreProps {
  score: LiveATSResult | null
  scoreDelta: number
  isCalculating: boolean
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-primary"
  if (score >= 60) return "text-amber-500"
  return "text-red-500"
}

function getRingColor(score: number) {
  if (score >= 80) return "stroke-primary"
  if (score >= 60) return "stroke-amber-500"
  return "stroke-red-500"
}

function getGradeBg(grade: string) {
  if (grade === "A" || grade === "B") return "bg-primary/10 text-primary border-primary/20"
  if (grade === "C") return "bg-amber-500/10 text-amber-600 border-amber-500/20"
  return "bg-red-500/10 text-red-600 border-red-500/20"
}

function ScoreRing({ score, size = 40 }: { score: number; size?: number }) {
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={`${getRingColor(score)} transition-all duration-700 ease-out`}
      />
    </svg>
  )
}

function CategoryRow({
  label,
  score,
  weight,
}: {
  label: string
  score: number
  weight: number
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${getScoreColor(score)}`}>
          {score}%
          <span className="text-muted-foreground/60 ml-1 font-normal">({weight}%)</span>
        </span>
      </div>
      <Progress value={score} className="h-1.5" />
    </div>
  )
}

export function LiveATSScore({
  score,
  scoreDelta,
  isCalculating,
}: LiveATSScoreProps) {
  const displayScore = score?.overallScore ?? 0
  const grade = score?.grade

  const issuesSummary = useMemo(() => {
    if (!score) return null
    return score.issueCount
  }, [score])

  if (!score) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Analyzing...</span>
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`ATS Score: ${displayScore}%. Click for details.`}
        >
          {/* Score ring */}
          <div className="relative" aria-hidden="true">
            <ScoreRing score={displayScore} size={36} />
            <span
              className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold ${getScoreColor(displayScore)} transition-all duration-500`}
            >
              {displayScore}
            </span>
          </div>

          {/* Grade badge */}
          {grade && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-5 font-semibold ${getGradeBg(grade.grade)}`}
            >
              {grade.grade}
            </Badge>
          )}

          {/* Delta indicator */}
          {scoreDelta !== 0 && !isCalculating && (
            <span
              className={`text-xs font-medium transition-opacity duration-300 ${
                scoreDelta > 0 ? "text-primary" : "text-red-500"
              }`}
            >
              {scoreDelta > 0 ? "+" : ""}
              {scoreDelta}
            </span>
          )}

          {/* Calculating indicator */}
          {isCalculating && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0" aria-live="polite">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Live ATS Score</p>
            <p className={`text-lg font-semibold font-space-grotesk ${getScoreColor(displayScore)}`}>
              {displayScore}%
              {scoreDelta !== 0 && (
                <span className={`text-xs ml-1.5 ${scoreDelta > 0 ? "text-primary" : "text-red-500"}`}>
                  {scoreDelta > 0 ? "+" : ""}{scoreDelta}
                </span>
              )}
            </p>
          </div>
          {grade && (
            <div className="text-right">
              <Badge
                variant="outline"
                className={`text-sm px-2 py-0.5 font-semibold ${getGradeBg(grade.grade)}`}
              >
                {grade.grade}
              </Badge>
              <p className="text-[10px] text-muted-foreground mt-0.5">{grade.label}</p>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="p-3 space-y-3">
          <CategoryRow
            label="Content Quality"
            score={score.categories.content.score}
            weight={score.categories.content.weight}
          />
          <CategoryRow
            label="Sections"
            score={score.categories.sections.score}
            weight={score.categories.sections.weight}
          />
          {score.categories.tailoring && (
            <CategoryRow
              label="Job Tailoring"
              score={score.categories.tailoring.score}
              weight={score.categories.tailoring.weight}
            />
          )}
        </div>

        {/* Issues summary */}
        {issuesSummary && issuesSummary.total > 0 && (
          <div className="px-3 pb-3 flex items-center gap-2 flex-wrap">
            {issuesSummary.critical > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {issuesSummary.critical} critical
              </div>
            )}
            {issuesSummary.warning > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-amber-500">
                <Info className="h-3 w-3" />
                {issuesSummary.warning} warnings
              </div>
            )}
            {issuesSummary.info > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                {issuesSummary.info} suggestions
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
