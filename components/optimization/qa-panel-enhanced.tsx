"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, AlertTriangle, AlertCircle, CheckCircle, RefreshCw, Copy, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { QASection, JobAnalysisSection, SystemPromptV1Output } from "@/lib/schemas-v2"
import { validateResume, validateFormatCompliance } from "@/lib/validators/qa-validator"

interface QAPanelEnhancedProps {
  metrics: QASection
  jobAnalysis?: JobAnalysisSection
  structuredOutput: SystemPromptV1Output
  onValidate?: () => void
}

export function QAPanelEnhanced({ metrics, jobAnalysis, structuredOutput, onValidate }: QAPanelEnhancedProps) {
  const [validation, setValidation] = useState<ReturnType<typeof validateResume> | null>(null)
  const [formatValidation, setFormatValidation] = useState<ReturnType<typeof validateFormatCompliance> | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Run validation when component mounts or data changes
  useEffect(() => {
    if (jobAnalysis && structuredOutput) {
      runValidation()
    }
  }, [jobAnalysis, structuredOutput])

  const runValidation = () => {
    if (!jobAnalysis) return

    setIsValidating(true)
    try {
      const result = validateResume(structuredOutput, jobAnalysis)
      const formatResult = validateFormatCompliance(structuredOutput)
      setValidation(result)
      setFormatValidation(formatResult)
      
      if (onValidate) {
        onValidate()
      }
    } catch (error) {
      console.error("Validation error:", error)
      toast.error("Failed to run validation")
    } finally {
      setIsValidating(false)
    }
  }

  const score = validation?.overallScore ?? metrics.scores.keyword_coverage_0_to_100
  
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Quality Assurance
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runValidation}
            disabled={isValidating || !jobAnalysis}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isValidating && "animate-spin")} />
            {isValidating ? "Validating..." : "Re-validate"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Quality Score</span>
            <div className="flex items-center gap-2">
              <span className={cn("text-2xl font-bold", scoreColor)}>{score}%</span>
              <Badge variant="outline" className={cn("text-xs", scoreColor)}>
                {scoreLabel}
              </Badge>
            </div>
          </div>
          <Progress value={score} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Based on coverage, readability, and format compliance
          </p>
        </div>

        {/* Critical Issues */}
        {validation && validation.criticalIssues.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Critical Issues</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                {validation.criticalIssues.map((issue, idx) => (
                  <li key={idx} className="text-sm">
                    {issue}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="coverage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="coverage">Coverage</TabsTrigger>
            <TabsTrigger value="readability">Readability</TabsTrigger>
            <TabsTrigger value="format">Format</TabsTrigger>
          </TabsList>

          {/* Coverage Tab */}
          <TabsContent value="coverage" className="space-y-4">
            {validation && validation.coverage.length > 0 ? (
              <div className="space-y-3">
                {validation.coverage.map((item, idx) => {
                  const status = item.status
                  const isGood = status === "excellent" || status === "good"
                  const isPartial = status === "partial"
                  const isMissing = status === "missing"

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            isGood && "bg-emerald-500/20 text-emerald-500",
                            isPartial && "bg-amber-500/20 text-amber-500",
                            isMissing && "bg-red-500/20 text-red-500"
                          )}
                        >
                          {isGood ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm flex items-center justify-between">
                            <span>{item.requirement}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs ml-2",
                                isGood && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                isPartial && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                isMissing && "bg-red-500/10 text-red-500 border-red-500/20"
                              )}
                            >
                              {item.locations.length} {item.locations.length === 1 ? "location" : "locations"}
                            </Badge>
                          </div>
                          {item.locations.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Found in: {item.locations.join(", ")}
                            </div>
                          )}
                          {item.recommendation && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs flex items-start gap-2">
                              <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{item.recommendation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Run validation to see coverage details
              </div>
            )}
          </TabsContent>

          {/* Readability Tab */}
          <TabsContent value="readability" className="space-y-4">
            {validation && validation.readability ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="text-2xl font-bold">{validation.readability.bulletCompliance}%</div>
                    <div className="text-xs text-muted-foreground mt-1">CAR Format Compliance</div>
                    <div className="text-xs text-muted-foreground">(12-20 words per bullet)</div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="text-2xl font-bold">{validation.readability.averageWordsPerBullet}</div>
                    <div className="text-xs text-muted-foreground mt-1">Average Words/Bullet</div>
                    <div className="text-xs text-muted-foreground">(Target: 12-20)</div>
                  </div>
                </div>

                {validation.readability.issues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Issues Detected:</h4>
                    {validation.readability.issues.map((issue, idx) => (
                      <Alert key={idx}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">{issue}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Run validation to see readability analysis
              </div>
            )}
          </TabsContent>

          {/* Format Tab */}
          <TabsContent value="format" className="space-y-4">
            {formatValidation ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Single column layout</span>
                    {formatValidation.singleColumn ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>No tables or textboxes</span>
                    {formatValidation.noTablesOrTextboxes ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Date format consistent</span>
                    {formatValidation.dateFormatConsistent ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Tense consistent</span>
                    {formatValidation.tenseConsistent ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>

                {formatValidation.issues.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Format Issues</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 space-y-1 mt-2">
                        {formatValidation.issues.map((issue, idx) => (
                          <li key={idx} className="text-sm">
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Run validation to see format checks
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Duplicates */}
        {validation && validation.duplicates.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Duplicate Bullets Detected</AlertTitle>
            <AlertDescription>
              <p className="text-sm mb-2">Found {validation.duplicates.length} duplicate or very similar bullet(s):</p>
              <Accordion type="single" collapsible className="w-full">
                {validation.duplicates.map((dup, idx) => (
                  <AccordionItem key={idx} value={`dup-${idx}`}>
                    <AccordionTrigger className="text-sm hover:no-underline">
                      "{dup.text.substring(0, 60)}..."
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {dup.locations.map((loc, locIdx) => (
                          <div key={locIdx}>• {loc}</div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AlertDescription>
          </Alert>
        )}

        {/* Suggestions */}
        {validation && validation.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Recommendations
            </h4>
            {validation.suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/80 ring-slate-700/80 ring-1 text-xs flex items-start gap-2"
              >
                <span className="flex-1 text-foreground leading-relaxed">{suggestion}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => copyToClipboard(suggestion)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Job Requirements Summary */}
        {jobAnalysis && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3">Target Job Requirements</h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Must-Have Skills ({jobAnalysis.must_have_skills.length}):</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {jobAnalysis.must_have_skills.slice(0, 5).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {jobAnalysis.must_have_skills.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{jobAnalysis.must_have_skills.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
              {jobAnalysis.compliance_or_regulatory.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Compliance Requirements:</span>
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
