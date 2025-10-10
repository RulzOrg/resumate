"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AIButton } from "@/components/ui/ai-button"
import { AlertCircle, X, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TipsSection } from "./tips-section"
import type { UITargetTitle } from "@/lib/schemas-v2"

interface TargetTitleSectionProps {
  data: UITargetTitle
  onChange: (updates: Partial<UITargetTitle>) => void
  jobContext?: {
    jobTitle?: string
    seniority?: string
    keywords?: string[]
  }
}

export function TargetTitleSection({ data, onChange, jobContext }: TargetTitleSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{
    title: string
    reason: string
    matchScore: number
  }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleSwapWithAlternate = (alternate: string) => {
    const newAlternates = [...data.alternates.filter((a) => a !== alternate), data.primary]
    onChange({
      primary: alternate,
      alternates: newAlternates,
    })
  }

  const handleGenerateSuggestions = async () => {
    console.log('🎯 Generate suggestions clicked')
    setIsGenerating(true)
    setShowSuggestions(true)
    
    try {
      console.log('📤 Sending request with:', { 
        currentTitle: data.primary, 
        hasJobContext: !!jobContext 
      })
      
      const response = await fetch('/api/resumes/suggest-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTitle: data.primary || "Job Title",
          jobContext: jobContext ? {
            jobTitle: jobContext.jobTitle,
            seniority: jobContext.seniority,
            keywords: jobContext.keywords,
          } : undefined,
          count: 3
        })
      })
      
      console.log('📥 Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.message || 'Failed to generate suggestions')
      }
      
      const responseData = await response.json()
      console.log('✅ Received suggestions:', responseData.suggestions?.length)
      setSuggestions(responseData.suggestions)
    } catch (error: any) {
      console.error('❌ Title suggestion error:', error)
      toast.error(error.message || "Failed to generate suggestions")
      setShowSuggestions(false)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplySuggestion = (suggestionTitle: string) => {
    onChange({ primary: suggestionTitle })
    setShowSuggestions(false)
    toast.success("Title updated")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Target Title</CardTitle>
          <Switch
            checked={data.include}
            onCheckedChange={(checked) => onChange({ include: checked })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="target-title">Job Title</Label>
          <div className="flex gap-2">
            <Input
              id="target-title"
              value={data.primary}
              onChange={(e) => onChange({ primary: e.target.value })}
              placeholder="Senior Product Designer"
              disabled={!data.include}
              className="flex-1"
            />
            <AIButton
              size="icon"
              disabled={!data.include}
              onClick={handleGenerateSuggestions}
              title="Generate AI suggestions"
              isLoading={isGenerating}
            />
          </div>
          
          {/* Inline AI suggestions */}
          {showSuggestions && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-300">
                  AI Suggestions {!isGenerating && `(${suggestions.length})`}
                </p>
                {!isGenerating && suggestions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSuggestions(false)}
                    className="h-6 text-xs cursor-pointer"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Close
                  </Button>
                )}
              </div>
              
              {isGenerating ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleApplySuggestion(suggestion.title)}
                      className="w-full text-left p-3 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800/60 hover:border-emerald-500/50 transition-all group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-slate-100 group-hover:text-emerald-400">
                          {suggestion.title}
                        </p>
                        <Badge 
                          variant="outline" 
                          className="text-xs shrink-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        >
                          {suggestion.matchScore}% match
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {suggestion.reason}
                      </p>
                    </button>
                  ))}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateSuggestions}
                    className="w-full text-xs cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Generate new suggestions
                  </Button>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Mirrors the job posting title for ATS matching
          </p>
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

        {/* ATS Enhancement Tips */}
        <TipsSection
          title="ATS Enhancement Options"
          variant="emerald"
          icon={Sparkles}
          content={
            <p>
              For senior positions, consider: "Senior XYZ with 8+ years of experience in [industry]" format.
              For career changers, use hybrid titles: "Former Teacher transitioning to Product Manager".
              For remote positions, add "Remote" or location if required.
            </p>
          }
        />
      </CardContent>
    </Card>
  )
}
