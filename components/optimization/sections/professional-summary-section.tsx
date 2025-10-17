"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { FileText, Target, Award, Users, TrendingUp, AlertCircle, Sparkles } from "lucide-react"
import { AIButton } from "@/components/ui/ai-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TipsSection } from "./tips-section"
import type { UIProfessionalSummary } from "@/lib/schemas-v2"

interface ProfessionalSummarySectionProps {
  data: UIProfessionalSummary
  onChange: (updates: Partial<UIProfessionalSummary>) => void
}

export function ProfessionalSummarySection({ data, onChange }: ProfessionalSummarySectionProps) {
  const [charCount, setCharCount] = useState(data.primary.length)
  const [wordCount, setWordCount] = useState(data.primary.split(/\s+/).filter(Boolean).length)

  useEffect(() => {
    const primaryText = data.primary ?? ""
    setCharCount(primaryText.length)
    setWordCount(primaryText.split(/\s+/).filter(Boolean).length)
  }, [data.primary])

  const handleChange = (value: string) => {
    setCharCount(value.length)
    setWordCount(value.split(/\s+/).filter(Boolean).length)
    onChange({ primary: value })
  }

  const handleSwapWithAlternate = (alternate: string) => {
    const newAlternates = [...data.alternates.filter((a) => a !== alternate), data.primary]
    onChange({
      primary: alternate,
      alternates: newAlternates,
    })
    setCharCount(alternate.length)
    setWordCount(alternate.split(/\s+/).filter(Boolean).length)
  }

  const getAlternateIcon = (idx: number) => {
    switch (idx) {
      case 0: return <Target className="h-3 w-3" />
      case 1: return <Users className="h-3 w-3" />
      case 2: return <Award className="h-3 w-3" />
      default: return <Sparkles className="h-3 w-3" />
    }
  }

  const getAlternateBadge = (idx: number) => {
    switch (idx) {
      case 0: return "Technical Focus"
      case 1: return "Leadership Focus" 
      case 2: return "Impact Focus"
      default: return "Alternative"
    }
  }

  const { charProgress, wordProgress, qualityScore } = useMemo(() => {
    const optimalChars = data.char_limit_hint
    const optimalRange = optimalChars * 0.2
    const optimalWords = 25 // Target ~25 words for professional summary
    const wordRange = 10

    let charProgress = 0
    if (charCount <= optimalChars) {
      charProgress = 100
    } else if (charCount <= optimalChars + optimalRange) {
      charProgress = 80
    } else {
      charProgress = Math.max(0, 100 - ((charCount - optimalChars - optimalRange) / optimalRange) * 50)
    }

    let wordProgress = 0
    if (wordCount >= optimalWords - wordRange && wordCount <= optimalWords + wordRange) {
      wordProgress = 100
    } else if (wordCount >= optimalWords - wordRange * 2 && wordCount <= optimalWords + wordRange * 2) {
      wordProgress = 80
    } else {
      wordProgress = Math.max(0, 100 - Math.abs(wordCount - optimalWords) / wordRange * 20)
    }

    const qualityScore = Math.round((charProgress + wordProgress) / 2)

    return { charProgress, wordProgress, qualityScore }
  }, [charCount, wordCount, data.char_limit_hint])

  const getQualityColor = (score: number) => {
    return "text-muted-foreground"
  }

  const getQualityLabel = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    if (score >= 40) return "Needs Work"
    return "Poor"
  }

  return (
    <TooltipProvider>
      <Card className="relative">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Professional Summary
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                1-2 sentences highlighting your experience and alignment with the role
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                    <TrendingUp className="h-3 w-3" />
                    <span className={`text-xs font-medium ${getQualityColor(qualityScore)}`}>
                      {getQualityLabel(qualityScore)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Summary quality score based on length and readability</p>
                </TooltipContent>
              </Tooltip>
              <Switch
                checked={data.include}
                onCheckedChange={(checked) => onChange({ include: checked })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="summary" className="text-sm font-medium">Summary</Label>
              <div className="flex items-center gap-2">
                {data.alternates.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AIButton size="sm" disabled={!data.include}>
                        AI Suggestions ({data.alternates.length})
                      </AIButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[420px]">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        AI-Generated Alternatives (Click to use)
                      </div>
                      {data.alternates.map((alternate, idx) => (
                        <DropdownMenuItem
                          key={idx}
                          onClick={() => handleSwapWithAlternate(alternate)}
                          className="cursor-pointer whitespace-normal leading-relaxed p-3"
                        >
                          <div className="space-y-2 w-full">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {getAlternateIcon(idx)}
                                <Badge variant="secondary" className="text-xs">
                                  {getAlternateBadge(idx)}
                                </Badge>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {alternate.length} chars • {alternate.split(/\s+/).filter(Boolean).length} words
                              </Badge>
                            </div>
                            <p className="text-sm text-left">{alternate}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            
            <Textarea
              id="summary"
              value={data.primary}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Experienced professional with X years in [industry]. Proven track record of [key achievement] and [key skill]. Seeking to leverage [specific expertise] to drive [desired outcome] for [company/role type]."
              disabled={!data.include}
              rows={4}
              className="resize-none text-sm"
            />

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  Characters: {charCount} / {data.char_limit_hint}
                </span>
                <span className="text-muted-foreground">
                  Words: {wordCount}
                </span>
              </div>
              <span className="text-muted-foreground">
                Quality Score: {qualityScore}%
              </span>
            </div>

            <TipsSection
              title="Writing Tips"
              description="Clear, scannable, and contrast-safe guidance"
              tips={[
                "Include 2–3 keywords from the job description naturally.",
                "Start with your years of experience and key specialization.",
                "Mention 1–2 quantified achievements or outcomes.",
                "Keep it concise — aim for 20–30 words (25 words optimal).",
                "Focus on how your experience aligns with the target role."
              ]}
            />
          </div>

          {data.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Recommendations:</p>
                  {data.warnings.map((warning, idx) => (
                    <p key={idx} className="text-sm">• {warning}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
