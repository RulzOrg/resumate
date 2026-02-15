"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Lightbulb, Sparkles, TrendingUp } from "lucide-react"
import { ChangesPanel } from "./ChangesPanel"
import type { OptimizedResume } from "@/lib/db"

type OptimizationSummary = OptimizedResume["optimization_summary"]

interface AgentPanelProps {
  optimizationSummary: OptimizationSummary | string | null | undefined
  jobTitle?: string
  companyName?: string | null
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

export function AgentPanel({ optimizationSummary, jobTitle, companyName }: AgentPanelProps) {
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

  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">What Changed & Why</h3>
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

      <Tabs defaultValue="changes" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto">
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
          <TabsTrigger
            value="score"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 text-xs"
          >
            <Lightbulb className="h-3.5 w-3.5 mr-1" />
            Score
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          <TabsContent value="changes" className="p-3 mt-0">
            <ChangesPanel
              changesMade={changes_made}
              sectionsImproved={sections_improved}
            />
          </TabsContent>

          <TabsContent value="keywords" className="p-3 mt-0">
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
          </TabsContent>

          <TabsContent value="score" className="p-3 mt-0">
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Match Score</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-semibold font-space-grotesk">{match_score_after}%</span>
                  {scoreImprovement !== 0 && (
                    <span className={`text-sm font-medium ${scoreImprovement > 0 ? "text-primary" : "text-destructive"}`}>
                      {scoreImprovement > 0 ? "+" : ""}{scoreImprovement}%
                    </span>
                  )}
                </div>
                <Progress value={match_score_after} className="h-2 mb-1" />
                <p className="text-xs text-muted-foreground">
                  Up from {match_score_before}%
                </p>
                {match_score_before === 0 && match_score_after === 0 && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Score data not available. Re-optimize to see scoring.
                  </p>
                )}
              </div>

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
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
