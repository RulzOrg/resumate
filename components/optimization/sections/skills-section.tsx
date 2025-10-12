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
  Plus, X, Sparkles, Code, Search, Box, Wrench, Target, TrendingUp, 
  AlertCircle, Lightbulb, Zap, Star, CheckCircle 
} from "lucide-react"
import { AIButton } from "@/components/ui/ai-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TipsSection } from "./tips-section"
import type { UISkills } from "@/lib/schemas-v2"

interface SkillsSectionProps {
  data: UISkills
  onChange: (updates: Partial<UISkills>) => void
}

export function SkillsSection({ data, onChange }: SkillsSectionProps) {
  const [newSkillInput, setNewSkillInput] = useState<{
    category: keyof UISkills["groups"] | null
    value: string
  }>({ category: null, value: "" })
  const [bulkInput, setBulkInput] = useState<{[key: string]: string}>({})

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Domain": return <Code className="h-4 w-4" />
      case "ResearchAndValidation": return <Search className="h-4 w-4" />
      case "ProductAndSystems": return <Box className="h-4 w-4" />
      case "Tools": return <Wrench className="h-4 w-4" />
      default: return <Sparkles className="h-4 w-4" />
    }
  }

  const handleAddSkill = (category: keyof UISkills["groups"], skill: string) => {
    if (!skill.trim()) return

    const newGroups = { ...data.groups }
    const skillTrimmed = skill.trim()
    
    if (!newGroups[category].some(s => s.toLowerCase() === skillTrimmed.toLowerCase())) {
      newGroups[category] = [...newGroups[category], skillTrimmed]
      onChange({ groups: newGroups })
    }

    setNewSkillInput({ category: null, value: "" })
  }

  const handleAddBulkSkills = (category: keyof UISkills["groups"], skillsText: string) => {
    if (!skillsText.trim()) return

    const skills = skillsText.split(/[,;|]/).map(s => s.trim()).filter(s => s.length > 0)
    const newGroups = { ...data.groups }
    
    skills.forEach(skill => {
      if (!newGroups[category].some(s => s.toLowerCase() === skill.toLowerCase())) {
        newGroups[category] = [...newGroups[category], skill]
      }
    })
    
    onChange({ groups: newGroups })
    setBulkInput({ ...bulkInput, [category]: "" })
  }

  const handleRemoveSkill = (category: keyof UISkills["groups"], skill: string) => {
    const newGroups = { ...data.groups }
    newGroups[category] = newGroups[category].filter((s) => s !== skill)
    onChange({ groups: newGroups })
  }

  const handleAddAlternate = (category: keyof UISkills["groups"], skill: string) => {
    const newGroups = { ...data.groups }
    if (!newGroups[category].some(s => s.toLowerCase() === skill.toLowerCase())) {
      newGroups[category] = [...newGroups[category], skill]
      onChange({ groups: newGroups })
    }
  }

  const calculateSkillsScore = () => {
    let totalOptimal = 0
    let totalSkills = 0
    
    Object.entries(data.groups).forEach(([category, skills]) => {
      const optimalCount = category === "Domain" ? 8 : category === "ResearchAndValidation" ? 6 : category === "ProductAndSystems" ? 6 : 12
      const count = skills.length
      totalSkills += Math.min(count, optimalCount)
      totalOptimal += optimalCount
    })
    
    return totalOptimal > 0 ? Math.round((totalSkills / totalOptimal) * 100) : 0
  }

  const skillsScore = calculateSkillsScore()

  const categories = [
    { 
      key: "Domain" as const, 
      label: "Domain Skills", 
      description: "Industry-specific expertise and knowledge areas",
      example: "Product Management, UX Design, Data Analytics"
    },
    { 
      key: "ResearchAndValidation" as const, 
      label: "Research & Validation", 
      description: "User research, testing methodologies, analytics",
      example: "User Interviews, A/B Testing, Usability Testing"
    },
    { 
      key: "ProductAndSystems" as const, 
      label: "Product & Systems", 
      description: "Product management, architecture, and systems thinking",
      example: "Roadmapping, Product Strategy, System Design"
    },
    { 
      key: "Tools" as const, 
      label: "Tools & Platforms", 
      description: "Software, frameworks, and platforms you work with",
      example: "React, Figma, SQL, AWS, Jira"
    },
  ]

  return (
    <TooltipProvider>
      <Card className="relative">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Skills & Expertise
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Organized by category for ATS optimization and keyword matching
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                    <TrendingUp className="h-3 w-3" />
                    <span className={`text-xs font-medium ${skillsScore >= 80 ? 'text-green-500' : skillsScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {skillsScore}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Skills completeness score based on optimal counts per category</p>
                </TooltipContent>
              </Tooltip>
              <Switch
                checked={data.include}
                onCheckedChange={(checked) => onChange({ include: checked })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {categories.map((category) => {
            const skillCount = data.groups[category.key].length
            const categoryScore = Math.min(100, (skillCount / 8) * 100) // Base on 8 as target average
            
            return (
              <div key={category.key} className="space-y-3 rounded-lg border border-border/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category.key)}
                      <Label className="text-base font-medium">{category.label}</Label>
                      <Badge variant="outline" className="text-xs">
                        {skillCount} skills
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                    <p className="text-xs text-muted-foreground italic">Examples: {category.example}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <span className={`text-xs font-bold ${categoryScore >= 80 ? 'text-green-500' : categoryScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                            {Math.round(categoryScore)}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Category completeness</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {data.alternates[category.key].length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <AIButton size="sm" disabled={!data.include}>
                            AI Suggest ({data.alternates[category.key].length})
                          </AIButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[380px]">
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            AI-Generated Skill Suggestions
                          </div>
                          {data.alternates[category.key].map((alt, idx) => {
                            const isAlreadyAdded = data.groups[category.key].some(
                              skill => skill.toLowerCase() === alt.toLowerCase()
                            )
                            
                            return (
                              <DropdownMenuItem
                                key={idx}
                                onClick={() => handleAddAlternate(category.key, alt)}
                                className="cursor-pointer"
                                disabled={isAlreadyAdded}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className={isAlreadyAdded ? "text-muted-foreground line-through" : ""}>
                                    {alt}
                                  </span>
                                  {isAlreadyAdded && <CheckCircle className="h-3 w-3 text-green-500" />}
                                </div>
                              </DropdownMenuItem>
                            )
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Skills Display */}
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {data.groups[category.key].map((skill) => (
                      <Badge
                        key={skill}
                        variant="default"
                        className="pl-3 pr-1 py-1.5 text-sm bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {skill}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-destructive/20"
                          onClick={() => handleRemoveSkill(category.key, skill)}
                          disabled={!data.include}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </Badge>
                    ))}
                    {skillCount === 0 && (
                      <span className="text-xs text-muted-foreground italic">No skills added yet</span>
                    )}
                  </div>

                  {/* Add Skills Section */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Add ${category.label.toLowerCase()}...`}
                        value={
                          newSkillInput.category === category.key ? newSkillInput.value : ""
                        }
                        onChange={(e) =>
                          setNewSkillInput({ category: category.key, value: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddSkill(category.key, newSkillInput.value)
                          }
                        }}
                        disabled={!data.include}
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleAddSkill(category.key, newSkillInput.value)}
                        disabled={!data.include || !newSkillInput.value.trim() || newSkillInput.category !== category.key}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Bulk Add */}
                    <div className="border-t border-border/50 pt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Bulk add (comma, semicolon, or pipe separated):</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="React, Vue, Angular; JavaScript, TypeScript; SQL, NoSQL"
                          value={bulkInput[category.key] || ""}
                          onChange={(e) =>
                            setBulkInput({ ...bulkInput, [category.key]: e.target.value })
                          }
                          disabled={!data.include}
                          className="text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddBulkSkills(category.key, bulkInput[category.key] || "")}
                          disabled={!data.include || !(bulkInput[category.key] || "").trim()}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Bulk
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Category Tips */}
                  <TipsSection
                    title="Skills Optimization Tips"
                    description="Maximize ATS keyword matching and relevance"
                    tips={[
                      "Include keywords from job description in this category.",
                      "Be specific: \"React\" instead of \"Web Development\".",
                      "Include both technical and conceptual skills.",
                      "Target 6–12 skills per category for optimal ATS scoring."
                    ]}
                  />
                </div>
              </div>
            )
          })}

          {/* Overall Tips */}
          <TipsSection
            title="Expert-Level Tip"
            variant="amber"
            icon={Zap}
            tips={[
              "Match skills directly to job description requirements.",
              "Include both hard skills (tools, technologies) and soft skills (methodologies).",
              "Prioritize skills mentioned multiple times in the job posting.",
              'Consider industry-standard abbreviations (e.g., "PM" for "Project Management").'
            ]}
          />
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
