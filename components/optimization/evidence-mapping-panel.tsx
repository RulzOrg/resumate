"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Check, AlertTriangle, X, RefreshCw, Lightbulb, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { EvidenceMapping } from "@/lib/types/evidence-mapping"

interface EvidenceMappingPanelProps {
  jobAnalysisId: string
  resumeId: string
}

export function EvidenceMappingPanel({ jobAnalysisId, resumeId }: EvidenceMappingPanelProps) {
  const [mappings, setMappings] = useState<EvidenceMapping[]>([])
  const [summary, setSummary] = useState<{
    totalRequirements: number
    withEvidence: number
    exact: number
    partial: number
    missing: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMappings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/resumes/map-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_analysis_id: jobAnalysisId,
          resume_id: resumeId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to map evidence")
      }

      const data = await response.json()
      setMappings(data.mappings || [])
      setSummary(data.summary || null)
      toast.success("Evidence mapping complete")
    } catch (err: any) {
      setError(err.message || "Failed to map evidence")
      toast.error(err.message || "Failed to map evidence")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (jobAnalysisId && resumeId) {
      fetchMappings()
    }
  }, [jobAnalysisId, resumeId])

  const getConfidenceBadge = (confidence: EvidenceMapping["confidence"]) => {
    if (confidence === "exact") {
      return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/40">Exact Match</Badge>
    } else if (confidence === "partial") {
      return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40">Partial Match</Badge>
    } else {
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/40">Missing</Badge>
    }
  }

  const getConfidenceIcon = (confidence: EvidenceMapping["confidence"]) => {
    if (confidence === "exact") {
      return <Check className="h-5 w-5 text-emerald-500" />
    } else if (confidence === "partial") {
      return <AlertTriangle className="h-5 w-5 text-amber-500" />
    } else {
      return <X className="h-5 w-5 text-red-500" />
    }
  }

  const getTypeLabel = (type: EvidenceMapping["type"]) => {
    if (type === "must_have") return "Must-Have"
    if (type === "preferred") return "Preferred"
    return "Key Requirement"
  }

  const coveragePercent = summary
    ? Math.round(((summary.exact + summary.partial) / summary.totalRequirements) * 100)
    : 0

  if (error && !mappings.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Evidence Mapping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchMappings} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Evidence Mapping
          </CardTitle>
          <Button onClick={fetchMappings} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Job requirement → Resume evidence mapping with confidence levels
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        {summary && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Coverage</span>
              <span className="text-2xl font-bold">{coveragePercent}%</span>
            </div>
            <Progress value={coveragePercent} className="h-2 mb-3" />
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-muted">
                <div className="font-bold">{summary.totalRequirements}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <div className="font-bold text-emerald-500">{summary.exact}</div>
                <div className="text-muted-foreground">Exact</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <div className="font-bold text-amber-500">{summary.partial}</div>
                <div className="text-muted-foreground">Partial</div>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <div className="font-bold text-red-500">{summary.missing}</div>
                <div className="text-muted-foreground">Missing</div>
              </div>
            </div>
          </div>
        )}

        {/* Mappings */}
        <Accordion type="multiple" className="w-full">
          {mappings.map((mapping, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} className="border-none mb-3">
              <AccordionTrigger className="hover:no-underline p-4 rounded-lg border border-border bg-card hover:bg-accent/50">
                <div className="flex items-center gap-3 w-full">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      mapping.confidence === "exact" && "bg-emerald-500/20",
                      mapping.confidence === "partial" && "bg-amber-500/20",
                      mapping.confidence === "missing" && "bg-red-500/20"
                    )}
                  >
                    {getConfidenceIcon(mapping.confidence)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{mapping.requirement}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(mapping.type)}
                      </Badge>
                      {getConfidenceBadge(mapping.confidence)}
                      {mapping.evidence.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {mapping.evidence.length} proof point{mapping.evidence.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-2">
                <div className="space-y-4">
                  {/* Evidence */}
                  {mapping.evidence.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Evidence from Resume:</h4>
                      <div className="space-y-2">
                        {mapping.evidence.map((ev, evIdx) => (
                          <div
                            key={evIdx}
                            className="p-3 rounded-lg bg-muted/50 border border-border"
                          >
                            <p className="text-sm leading-relaxed">{ev.text}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Progress value={ev.score * 100} className="h-1 flex-1" />
                              <span className="text-xs text-muted-foreground">
                                {Math.round(ev.score * 100)}% match
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No evidence found in resume for this requirement.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Gaps & Recommendations */}
                  {mapping.gaps && (
                    <Alert>
                      <Lightbulb className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium mb-1">Recommendation:</p>
                        <p className="text-sm">{mapping.gaps}</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Keyword Suggestions */}
                  {mapping.recommendedKeywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Suggested Keywords:</h4>
                      <div className="flex flex-wrap gap-2">
                        {mapping.recommendedKeywords.map((keyword, kwIdx) => (
                          <Badge key={kwIdx} variant="secondary">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Empty State */}
        {!isLoading && mappings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No evidence mappings available yet.</p>
            <Button onClick={fetchMappings} className="mt-4" variant="outline">
              Generate Evidence Mapping
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
