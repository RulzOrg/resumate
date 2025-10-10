"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Plus, X, Heart, Music, Camera, Gamepad2, Book, Mountain, Palette, Star,
  TrendingUp, AlertCircle, Lightbulb, Sparkles
} from "lucide-react"
import { TipsSection } from "./tips-section"
import type { UIInterests } from "@/lib/schemas-v2"

interface InterestsSectionProps {
  data: UIInterests
  onChange: (updates: Partial<UIInterests>) => void
}

export function InterestsSection({ data, onChange }: InterestsSectionProps) {
  const [newInterest, setNewInterest] = useState("")
  const [bulkInput, setBulkInput] = useState("")

  const handleAddInterest = () => {
    if (!newInterest.trim()) return
    const trimmed = newInterest.trim()
    
    // Check for duplicates (case-insensitive)
    if (!data.items.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      onChange({ items: [...data.items, trimmed] })
    }
    setNewInterest("")
  }

  const handleAddBulkInterests = () => {
    if (!bulkInput.trim()) return
    
    const interests = bulkInput.split(/[,;|]/).map(i => i.trim()).filter(i => i.length > 0)
    const newItems = [...data.items]
    
    interests.forEach(interest => {
      if (!newItems.some(i => i.toLowerCase() === interest.toLowerCase())) {
        newItems.push(interest)
      }
    })
    
    onChange({ items: newItems })
    setBulkInput("")
  }

  const handleRemoveInterest = (interest: string) => {
    onChange({ items: data.items.filter((i) => i !== interest) })
  }

  const getInterestIcon = (interest: string) => {
    const lower = interest.toLowerCase()
    if (lower.includes('music') || lower.includes('instrument')) return <Music className="h-4 w-4" />
    if (lower.includes('photo') || lower.includes('camera')) return <Camera className="h-4 w-4" />
    if (lower.includes('gaming') || lower.includes('game') || lower.includes('play')) return <Gamepad2 className="h-4 w-4" />
    if (lower.includes('read') || lower.includes('book')) return <Book className="h-4 w-4" />
    if (lower.includes('hik') || lower.includes('hike') || lower.includes('climb') || lower.includes('run')) return <Mountain className="h-4 w-4" />
    if (lower.includes('art') || lower.includes('paint') || lower.includes('draw')) return <Palette className="h-4 w-4" />
    return <Heart className="h-4 w-4" />
  }

  const getInterestCategory = (interest: string) => {
    const lower = interest.toLowerCase()
    if (lower.includes('music') || lower.includes('instrument')) return 'Creative Arts'
    if (lower.includes('sport') || lower.includes('fitness') || lower.includes('gym') || lower.includes('run')) return 'Sports & Fitness'
    if (lower.includes('read') || lower.includes('book') || lower.includes('learn')) return 'Intellectual'
    if (lower.includes('gaming') || lower.includes('tech') || lower.includes('programming')) return 'Technology'
    if (lower.includes('travel') || lower.includes('adventure') || lower.includes('explore')) return 'Adventure'
    return 'Personal'
  }

  const getInterestCategoryColor = (category: string) => {
    switch (category) {
      case 'Creative Arts': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'Sports & Fitness': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'Intellectual': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'Technology': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'Adventure': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const calculateInterestsScore = () => {
    if (data.items.length === 0) return 50 // 50% if no interests (not bad, just optional)
    const optimalCount = 4
    const score = Math.min(100, (data.items.length / optimalCount) * 100)
    return score
  }

  const interestsScore = calculateInterestsScore()
  const interestCount = data.items.length

  return (
    <TooltipProvider>
      <Card className="relative">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Interests & Activities
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Personal interests that showcase personality and culture fit
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                    <TrendingUp className="h-3 w-3" />
                    <span className={`text-xs font-medium ${interestsScore >= 80 ? 'text-green-500' : interestsScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {interestsScore}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Optional section completion score (4-6 interests ideal)</p>
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
          {/* Current Interests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Current Interests ({interestCount})</Label>
              <Badge variant="outline" className="text-xs">
                {interestCount <= 2 ? "Add more interests" : interestCount <= 6 ? "Good balance" : "Well rounded"}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {data.items.map((interest) => (
                <Badge
                  key={interest}
                  variant="default"
                  className={`pl-3 pr-1 py-1.5 text-sm ${getInterestCategoryColor(getInterestCategory(interest))} hover:opacity-80 transition-opacity`}
                >
                  <div className="flex items-center gap-1">
                    {getInterestIcon(interest)}
                    <span>{interest}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 hover:bg-destructive/20"
                    onClick={() => handleRemoveInterest(interest)}
                    disabled={!data.include}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </Badge>
              ))}
              {interestCount === 0 && (
                <span className="text-xs text-muted-foreground italic">No interests added yet (optional section)</span>
              )}
            </div>
          </div>

          {/* Add Interests */}
          <div className="space-y-3 border-t border-border/50 pt-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Interest
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Photography, Hiking, Chess, Cooking, Reading..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddInterest()
                    }
                  }}
                  disabled={!data.include}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAddInterest}
                  disabled={!data.include || !newInterest.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bulk Add */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-2">
                <Lightbulb className="h-3 w-3" />
                Quick Add (comma, semicolon, or pipe separated)
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Running, Swimming, Biking; Drawing, Painting; Board Games, Chess"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  disabled={!data.include}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddBulkInterests}
                  disabled={!data.include || !bulkInput.trim()}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Interest Categories */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Suggested Categories</Label>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              <div className="p-2 border border-slate-700/60 rounded-lg bg-slate-900/60">
                <div className="text-xs font-medium text-slate-200 mb-1">Professional Development</div>
                <div className="text-xs text-slate-400">
                  Industry publications, conferences, continuous learning, networking
                </div>
              </div>
              <div className="p-2 border border-slate-700/60 rounded-lg bg-slate-900/60">
                <div className="text-xs font-medium text-slate-200 mb-1">Creative Pursuits</div>
                <div className="text-xs text-slate-400">
                  Music, photography, art, writing, design, cooking, gardening
                </div>
              </div>
              <div className="p-2 border border-slate-700/60 rounded-lg bg-slate-900/60">
                <div className="text-xs font-medium text-slate-200 mb-1">Active Lifestyle</div>
                <div className="text-xs text-slate-400">
                  Sports, fitness, yoga, hiking, running, cycling, team activities
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <TipsSection
            title="Interests Tips"
            description="Personal touch that shows cultural fit and soft skills"
            tips={[
              "Include 4–6 interests that show well-rounded personality.",
              "Mix professional and personal interests to show balance.",
              "Avoid potentially controversial or polarizing topics.",
              "Consider cultural fit with target company values.",
              "Include activities that demonstrate soft skills (teamwork, discipline, creativity)."
            ]}
          />

          {/* Expert Guidance */}
          <TipsSection
            title="Strategic Advice"
            variant="amber"
            icon={Sparkles}
            content={
              <p>
                Tailor interests to resonate with company culture. For creative agencies, show creative pursuits. 
                For corporate roles, highlight professional development. For startups, show adaptability and diverse interests.
              </p>
            }
          />
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
