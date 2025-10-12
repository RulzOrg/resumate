"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Check, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { QASection, JobAnalysisSection } from "@/lib/schemas-v2"

interface QAPanelProps {
  metrics: QASection
  jobAnalysis?: JobAnalysisSection
}

export function QAPanel({ metrics, jobAnalysis }: QAPanelProps) {
  const score = metrics.scores.keyword_coverage_0_to_100
  
  const scoreColor = score >= 80 
    ? "text-emerald-500" 
    : score >= 60 
      ? "text-amber-500" 
      : "text-red-500"

  const scoreLabel = score >= 80 
    ? "Excellent" 
    : score >= 60 
      ? "Good" 
      : "Needs Improvement"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Quality Assurance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Coverage Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Keyword Coverage</span>
            <div className="flex items-center gap-2">
              <span className={cn("text-2xl font-bold", scoreColor)}>{score}%</span>
              <Badge variant="outline" className={cn("text-xs", scoreColor)}>
                {scoreLabel}
              </Badge>
            </div>
          </div>
          <Progress value={score} className="h-2" aria-label="Keyword coverage percentage" />
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.scores.readability_hint}
          </p>
        </div>

        {/* Format Checks */}
        <div>
          <h4 className="text-sm font-medium mb-3">Format Checks</h4>
          <div className="space-y-2">
            {Object.entries(metrics.format_checks).map(([key, passed]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                {passed ? (
                  <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Coverage Details */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="coverage" className="border-none">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              Must-Have Coverage ({metrics.must_have_coverage.length} requirements)
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {metrics.must_have_coverage.map((item, idx) => {
                  const coverageCount = item.covered_in.length
                  const isGood = coverageCount >= 2
                  const isPartial = coverageCount === 1
                  const isMissing = coverageCount === 0

                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                    >
                      <div
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          isGood && "bg-emerald-500/20 text-emerald-500",
                          isPartial && "bg-amber-500/20 text-amber-500",
                          isMissing && "bg-red-500/20 text-red-500"
                        )}
                      >
                        {isGood ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{item.requirement}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.covered_in.length > 0 ? (
                            <>
                              Found in: {item.covered_in.join(", ")}
                              {isPartial && " (Add to one more section)"}
                            </>
                          ) : (
                            "Not found - consider adding to experience or summary"
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Warnings */}
        {metrics.warnings.length > 0 && (
          <div className="bg-slate-900/80 ring-slate-700/80 ring-1 rounded-xl">
            <div className="flex gap-2 md:px-4 border-slate-800/80 border-b pt-2.5 pr-3 pb-2.5 pl-3 items-center">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-inset ring-amber-500/30">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-xs font-medium tracking-tight text-slate-100">Recommendations</h2>
                </div>
              </div>
            </div>
            <div className="px-3 py-3 md:px-4 md:py-3">
              <ul className="space-y-2">
                {metrics.warnings.map((warning, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="mt-0.5 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-amber-400 ring-1 ring-offset-1 ring-offset-slate-900 ring-amber-400/40"></span>
                    <p className="text-xs leading-relaxed text-slate-200">{warning}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Job Requirements Summary (if available) */}
        {jobAnalysis && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3">Target Job Requirements</h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Must-Have Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {jobAnalysis.must_have_skills.slice(0, 5).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {jobAnalysis.must_have_skills.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{jobAnalysis.must_have_skills.length - 5}
                    </Badge>
                  )}
                </div>
              </div>
              {jobAnalysis.compliance_or_regulatory.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Compliance:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {jobAnalysis.compliance_or_regulatory.map((item) => (
                      <Badge key={item} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
