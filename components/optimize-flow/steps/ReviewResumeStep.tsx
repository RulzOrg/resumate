"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FileText,
  Briefcase,
  Eye,
} from "lucide-react"
import { FlowResumeViewer } from "../results/FlowResumeViewer"
import { mergeResumeWithRewrites, getModifiedSections } from "@/lib/utils/resume-merge"
import type { ParsedResume } from "@/lib/resume-parser"
import type { ReviewResumeStepProps } from "@/lib/types/optimize-flow"

export function ReviewResumeStep({
  rewriteResult,
  editedContent,
  parsedResume,
  analysisResult,
  initialReviewedResume,
  onReviewComplete,
  onResumeChange,
  onBack,
}: ReviewResumeStepProps) {
  // Merge resume data on mount or use initial reviewed resume
  const [resumeData, setResumeData] = useState<ParsedResume>(() => {
    if (initialReviewedResume) {
      return initialReviewedResume
    }

    // Merge original resume (parsed structure) with rewritten content
    const { mergedResume } = mergeResumeWithRewrites({
      originalResume: parsedResume,
      rewriteResult,
      editedContent,
    })
    return mergedResume
  })

  // Track modifications for highlighting
  const [showHighlights, setShowHighlights] = useState(true)

  // Use the parsed resume directly for comparison (no text parsing needed!)
  // When parsedResume is not available, treat all sections as modified
  const modifiedSections = useMemo(
    () => parsedResume
      ? getModifiedSections(parsedResume, resumeData)
      : {
          summary: true,
          workExperience: new Set(resumeData.workExperience.map(exp => exp.company)),
        },
    [parsedResume, resumeData]
  )

  // Calculate stats for the celebration banner
  const stats = useMemo(() => {
    const keywordsAdded = rewriteResult.keywordsAdded.length
    const bulletsRewritten = rewriteResult.workExperiences.reduce(
      (sum, exp) => sum + exp.rewrittenBullets.length,
      0
    )
    const matchImprovement = Math.min(
      analysisResult.matchScore + Math.round(keywordsAdded * 2.5),
      100
    ) - analysisResult.matchScore

    return {
      keywordsAdded,
      bulletsRewritten,
      matchImprovement,
      estimatedNewScore: Math.min(
        analysisResult.matchScore + Math.round(keywordsAdded * 2.5),
        100
      ),
    }
  }, [rewriteResult, analysisResult])

  // Handle resume changes
  const handleResumeChange = useCallback(
    (updated: ParsedResume) => {
      setResumeData(updated)
      onResumeChange(updated)
    },
    [onResumeChange]
  )

  // Handle continue to ATS Scan
  const handleContinue = useCallback(() => {
    onReviewComplete(resumeData)
  }, [onReviewComplete, resumeData])

  return (
    <div className="space-y-6">
      {/* Celebration Banner - The AHA Moment */}
      <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                Your Optimized Resume is Ready!
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Review your complete resume below. All sections are editable - make any final
                adjustments before running the ATS compatibility check.
              </p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-3">
                <Badge
                  variant="outline"
                  className="px-3 py-1.5 text-sm border-emerald-500/30 bg-emerald-500/10"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
                  <span className="font-medium">{stats.estimatedNewScore}%</span>
                  <span className="text-muted-foreground ml-1">Match</span>
                  {stats.matchImprovement > 0 && (
                    <span className="text-emerald-500 ml-1.5">+{stats.matchImprovement}%</span>
                  )}
                </Badge>
                <Badge
                  variant="outline"
                  className="px-3 py-1.5 text-sm border-blue-500/30 bg-blue-500/10"
                >
                  <FileText className="w-4 h-4 mr-1.5 text-blue-500" />
                  <span className="font-medium">{stats.keywordsAdded}</span>
                  <span className="text-muted-foreground ml-1">Keywords Added</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="px-3 py-1.5 text-sm border-purple-500/30 bg-purple-500/10"
                >
                  <Briefcase className="w-4 h-4 mr-1.5 text-purple-500" />
                  <span className="font-medium">{stats.bulletsRewritten}</span>
                  <span className="text-muted-foreground ml-1">Bullets Optimized</span>
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Highlight Toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <Switch
            id="show-highlights"
            checked={showHighlights}
            onCheckedChange={setShowHighlights}
          />
          <Label htmlFor="show-highlights" className="text-sm text-muted-foreground cursor-pointer">
            <Eye className="w-4 h-4 inline mr-1.5" />
            Show what changed
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          {modifiedSections.workExperience.size} work experience
          {modifiedSections.workExperience.size !== 1 ? "s" : ""} optimized
          {modifiedSections.summary && " + summary"}
        </p>
      </div>

      {/* Resume Viewer */}
      <FlowResumeViewer
        resumeData={resumeData}
        matchScore={stats.estimatedNewScore}
        onChange={handleResumeChange}
        highlightChanges={showHighlights}
        modifiedSections={modifiedSections}
      />

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Rewrite
        </Button>
        <Button onClick={handleContinue} className="gap-2">
          Continue to ATS Scan
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
