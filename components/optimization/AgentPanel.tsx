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
  optimizationSummary: OptimizationSummary
  jobTitle?: string
  companyName?: string | null
}

export function AgentPanel({ optimizationSummary, jobTitle, companyName }: AgentPanelProps) {
  const {
    changes_made = [],
    keywords_added = [],
    skills_highlighted = [],
    sections_improved = [],
    match_score_before = 0,
    match_score_after = 0,
    recommendations = [],
  } = optimizationSummary ?? {}

  const scoreImprovement = match_score_after - match_score_before

  return (
    <div className="flex flex-col h-full">
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

        <ScrollArea className="flex-1">
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
              <p className="text-sm text-muted-foreground py-4 text-center">
                No keyword changes recorded.
              </p>
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
