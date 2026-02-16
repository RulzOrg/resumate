"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Info, Lightbulb, MessageSquare, Sparkles, TrendingUp, Wrench } from "lucide-react"
import { ChangesPanel } from "./ChangesPanel"
import { ChatPanel } from "./ChatPanel"
import type { OptimizedResume } from "@/lib/db"
import type { ParsedResume } from "@/lib/resume-parser"
import type { ResumeEditOperation } from "@/lib/chat-edit-types"
import type { LiveATSResult } from "@/lib/ats-checker/live-score"
import type { ATSIssue } from "@/lib/ats-checker/types"

type OptimizationSummary = OptimizedResume["optimization_summary"]

interface AgentPanelProps {
  optimizationSummary: OptimizationSummary | string | null | undefined
  jobTitle?: string
  companyName?: string | null
  resumeData?: ParsedResume
  resumeId?: string
  onApplyEdits?: (operations: ResumeEditOperation[]) => void
  liveScore?: LiveATSResult | null
  onFixIssue?: (issue: ATSIssue) => void
  initialCommand?: string | null
  onCommandConsumed?: () => void
}

function normalizeOptimizationSummary(
  raw: OptimizationSummary | string | null | undefined
): OptimizationSummary {
  const defaults: OptimizationSummary = {
    changes_made: [],
    keywords_added: [],
    skills_highlighted: [],
    sections_improved: [],
    match_score_before: 0,
    match_score_after: 0,
    recommendations: [],
  }

  if (raw == null) return defaults

  let candidate: unknown = raw
  for (let i = 0; i < 2 && typeof candidate === "string"; i += 1) {
    try {
      candidate = JSON.parse(candidate)
    } catch {
      return defaults
    }
  }

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return defaults
  }

  const value = candidate as Record<string, unknown>
  const toArray = (input: unknown) =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : []
  const toNumber = (input: unknown) => (typeof input === "number" && Number.isFinite(input) ? input : 0)

  return {
    changes_made: toArray(value.changes_made),
    keywords_added: toArray(value.keywords_added),
    skills_highlighted: toArray(value.skills_highlighted),
    sections_improved: toArray(value.sections_improved),
    match_score_before: toNumber(value.match_score_before),
    match_score_after: toNumber(value.match_score_after),
    recommendations: toArray(value.recommendations),
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-primary"
  if (score >= 60) return "text-amber-500"
  return "text-red-500"
}

function CategoryBreakdown({
  label,
  score,
  details,
}: {
  label: string
  score: number
  details: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${getScoreColor(score)}`}>{score}%</span>
      </div>
      <Progress value={score} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground/70">{details}</p>
    </div>
  )
}

export function AgentPanel({
  optimizationSummary,
  jobTitle,
  companyName,
  resumeData,
  resumeId,
  onApplyEdits,
  liveScore,
  onFixIssue,
  initialCommand,
  onCommandConsumed,
}: AgentPanelProps) {
  const normalizedSummary = normalizeOptimizationSummary(optimizationSummary)
  const {
    changes_made = [],
    keywords_added = [],
    skills_highlighted = [],
    sections_improved = [],
    match_score_before = 0,
    match_score_after = 0,
    recommendations = [],
  } = normalizedSummary

  const scoreImprovement = match_score_after - match_score_before
  const hasSummary = optimizationSummary != null
  const hasChat = resumeData && resumeId && onApplyEdits
  const hasLiveScore = liveScore != null
  const showScoreTab = hasSummary || hasLiveScore

  // Controlled tab state so we can programmatically switch to chat
  const defaultTab = hasChat ? "chat" : "changes"
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Switch to chat tab when a fix command arrives
  useEffect(() => {
    if (initialCommand && hasChat) {
      setActiveTab("chat")
    }
  }, [initialCommand, hasChat])

  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">
            {hasChat ? "AI Assistant" : "What Changed & Why"}
          </h3>
          {(jobTitle || companyName) && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {jobTitle}{companyName ? ` at ${companyName}` : ""}
            </p>
          )}
        </div>
        {scoreImprovement > 0 && (
          <Badge variant="secondary" className="shrink-0 ml-2 bg-primary/10 text-primary border-primary/20">
            +{scoreImprovement}%
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 gap-0">
        <TabsList className="w-full shrink-0 rounded-none border-b border-border bg-transparent p-0 h-auto">
          {hasChat && (
            <TabsTrigger
              value="chat"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 text-xs"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Chat
            </TabsTrigger>
          )}
          {hasSummary && (
            <>
              <TabsTrigger
                value="changes"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Changes
                {changes_made.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {changes_made.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="keywords"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 text-xs"
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                Keywords
              </TabsTrigger>
            </>
          )}
          {showScoreTab && (
            <TabsTrigger
              value="score"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 text-xs"
            >
              <Lightbulb className="h-3.5 w-3.5 mr-1" />
              Score
            </TabsTrigger>
          )}
        </TabsList>

        {hasChat && (
          <TabsContent value="chat" className="flex-1 min-h-0 mt-0">
            <ChatPanel
              resumeData={resumeData}
              resumeId={resumeId}
              jobTitle={jobTitle}
              companyName={companyName}
              onApplyEdits={onApplyEdits}
              initialCommand={initialCommand}
              onCommandConsumed={onCommandConsumed}
            />
          </TabsContent>
        )}

        {hasSummary && (
          <TabsContent value="changes" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                <ChangesPanel
                  changesMade={changes_made}
                  sectionsImproved={sections_improved}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        {hasSummary && (
          <TabsContent value="keywords" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                {keywords_added.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Keywords Added</p>
                      <div className="flex flex-wrap gap-1.5">
                        {keywords_added.map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {skills_highlighted.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Skills Highlighted</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills_highlighted.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {keywords_added.length === 0 && skills_highlighted.length === 0 && (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      No keyword changes recorded.
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Re-optimize this resume to see keyword and skill matching.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        {showScoreTab && (
          <TabsContent value="score" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                <div className="space-y-4">
                  {/* Live ATS Score */}
                  {hasLiveScore && (
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-muted-foreground">Live ATS Score</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-5 font-semibold ${
                            liveScore.grade.grade === "A" || liveScore.grade.grade === "B"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : liveScore.grade.grade === "C"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                          }`}
                        >
                          {liveScore.grade.grade} — {liveScore.grade.label}
                        </Badge>
                      </div>

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className={`text-2xl font-semibold font-space-grotesk ${getScoreColor(liveScore.overallScore)}`}>
                          {liveScore.overallScore}%
                        </span>
                      </div>

                      <div className="space-y-3">
                        <CategoryBreakdown
                          label="Content Quality"
                          score={liveScore.categories.content.score}
                          details={liveScore.categories.content.details}
                        />
                        <CategoryBreakdown
                          label="Sections"
                          score={liveScore.categories.sections.score}
                          details={liveScore.categories.sections.details}
                        />
                        {liveScore.categories.tailoring && (
                          <CategoryBreakdown
                            label="Job Tailoring"
                            score={liveScore.categories.tailoring.score}
                            details={liveScore.categories.tailoring.details}
                          />
                        )}
                      </div>

                      {/* Issues summary */}
                      {liveScore.issueCount.total > 0 && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Issues</p>
                          {liveScore.issues.slice(0, 5).map((issue) => (
                            <div key={issue.id} className="flex items-start gap-2 text-xs">
                              {issue.severity === "critical" ? (
                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-red-500" />
                              ) : issue.severity === "warning" ? (
                                <Info className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                              ) : (
                                <Lightbulb className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                              )}
                              <span className="text-foreground/80 flex-1">{issue.title}</span>
                              {issue.fixable && onFixIssue && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-1.5 text-[10px] text-primary shrink-0"
                                  onClick={() => onFixIssue(issue)}
                                >
                                  <Wrench className="h-3 w-3 mr-0.5" />
                                  Fix
                                </Button>
                              )}
                            </div>
                          ))}
                          {liveScore.issueCount.total > 5 && (
                            <p className="text-[10px] text-muted-foreground">
                              +{liveScore.issueCount.total - 5} more issues
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Static optimization score (from initial optimization) */}
                  {hasSummary && (match_score_before > 0 || match_score_after > 0) && (
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Optimization Summary</p>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-lg font-semibold font-space-grotesk">{match_score_after}%</span>
                        {scoreImprovement !== 0 && (
                          <span className={`text-sm font-medium ${scoreImprovement > 0 ? "text-primary" : "text-destructive"}`}>
                            {scoreImprovement > 0 ? "+" : ""}{scoreImprovement}%
                          </span>
                        )}
                      </div>
                      <Progress value={match_score_after} className="h-1.5 mb-1" />
                      <p className="text-[10px] text-muted-foreground">
                        Up from {match_score_before}%
                      </p>
                    </div>
                  )}

                  {recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recommendations</p>
                      <ul className="space-y-2">
                        {recommendations.map((rec, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                            <span className="text-foreground/90">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Empty state */}
                  {!hasLiveScore && (!hasSummary || (match_score_before === 0 && match_score_after === 0)) && (
                    <div className="py-4 text-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Score data not available.
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Re-optimize to see scoring.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
