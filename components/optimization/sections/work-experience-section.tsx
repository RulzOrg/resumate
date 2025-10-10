"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Sparkles, Plus, Trash2, GripVertical, Briefcase, Building2, MapPin, 
  Calendar, Target, TrendingUp, AlertCircle, ArrowUpDown, Zap, BarChart 
} from "lucide-react"
import { AIButton } from "@/components/ui/ai-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TipsSection } from "./tips-section"
import type { UIWorkExperience, UIWorkExperienceItem } from "@/lib/schemas-v2"

interface WorkExperienceSectionProps {
  data: UIWorkExperience
  onChange: (updates: Partial<UIWorkExperience>) => void
}

export function WorkExperienceSection({ data, onChange }: WorkExperienceSectionProps) {
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [draggedBullet, setDraggedBullet] = useState<{itemIndex: number, bulletIndex: number} | null>(null)

  const handleItemUpdate = (index: number, updates: Partial<UIWorkExperienceItem>) => {
    const newItems = [...data.items]
    newItems[index] = { ...newItems[index], ...updates }
    onChange({ items: newItems })
  }

  const handleBulletChange = (itemIndex: number, bulletIndex: number, value: string) => {
    const newItems = [...data.items]
    const newBullets = [...newItems[itemIndex].bullets.primary]
    newBullets[bulletIndex] = value
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      bullets: {
        ...newItems[itemIndex].bullets,
        primary: newBullets,
      },
    }
    onChange({ items: newItems })
  }

  const handleSwapBullet = (itemIndex: number, bulletIndex: number, alternate: string) => {
    const newItems = [...data.items]
    const currentBullet = newItems[itemIndex].bullets.primary[bulletIndex]
    const newAlternates = newItems[itemIndex].bullets.alternates.filter((a) => a !== alternate)
    newAlternates.push(currentBullet)

    newItems[itemIndex].bullets.primary[bulletIndex] = alternate
    newItems[itemIndex].bullets.alternates = newAlternates

    onChange({ items: newItems })
  }

  const handleAddBullet = (itemIndex: number) => {
    const newItems = [...data.items]
    newItems[itemIndex].bullets.primary.push("")
    onChange({ items: newItems })
  }

  const handleRemoveBullet = (itemIndex: number, bulletIndex: number) => {
    const newItems = [...data.items]
    newItems[itemIndex].bullets.primary = newItems[itemIndex].bullets.primary.filter(
      (_, idx) => idx !== bulletIndex
    )
    onChange({ items: newItems })
  }

  const handleAddWorkExperience = () => {
    const newItem: UIWorkExperienceItem = {
      include: true,
      company: "",
      location: "",
      title: "",
      start_date: "",
      end_date: "",
      bullets: {
        primary: [""],
        alternates: [],
      },
    }
    onChange({ items: [...data.items, newItem] })
  }

  const handleRemoveWorkExperience = (itemIndex: number) => {
    const newItems = data.items.filter((_, idx) => idx !== itemIndex)
    onChange({ items: newItems })
  }

  const handleReorderBullet = (itemIndex: number, fromIndex: number, toIndex: number) => {
    const newItems = [...data.items]
    const bullets = [...newItems[itemIndex].bullets.primary]
    const [moved] = bullets.splice(fromIndex, 1)
    bullets.splice(toIndex, 0, moved)
    
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      bullets: {
        ...newItems[itemIndex].bullets,
        primary: bullets,
      },
    }
    onChange({ items: newItems })
  }

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

  const getBulletQuality = (text: string) => {
    const wc = wordCount(text)
    if (wc >= 12 && wc <= 20) {
      return { score: 100, label: "Optimal", color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/20" }
    } else if (wc >= 8 && wc < 12) {
      return { score: 80, label: "Good", color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" }
    } else if (wc > 20 && wc <= 25) {
      return { score: 70, label: "Long", color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" }
    } else if (wc < 8) {
      return { score: 40, label: "Too short", color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" }
    } else {
      return { score: 30, label: "Too long", color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" }
    }
  }

  const getBulletTypeIcon = (idx: number) => {
    switch (idx) {
      case 0: return <Target className="h-3 w-3" />
      case 1: return <BarChart className="h-3 w-3" />
      case 2: return <Zap className="h-3 w-3" />
      default: return <Sparkles className="h-3 w-3" />
    }
  }

  const getBulletTypeLabel = (idx: number) => {
    switch (idx) {
      case 0: return "Results Focus"
      case 1: return "Technical Detail"
      case 2: return "Leadership Angle"
      default: return "Alternative"
    }
  }

  const calculateSectionScore = () => {
    if (data.items.length === 0) return 0
    
    let totalScore = 0
    let bulletCount = 0
    
    data.items.forEach(item => {
      if (item.include) {
        item.bullets.primary.forEach(bullet => {
          const quality = getBulletQuality(bullet)
          totalScore += quality.score
          bulletCount++
        })
      }
    })
    
    return bulletCount > 0 ? Math.round(totalScore / bulletCount) : 0
  }

  const sectionScore = calculateSectionScore()

  return (
    <TooltipProvider>
      <Card className="relative">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Work Experience
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Professional experience with CAR format bullet points
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                <TrendingUp className="h-3 w-3" />
                <span className={`text-xs font-medium ${sectionScore >= 80 ? 'text-green-500' : sectionScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {sectionScore}%
                </span>
              </div>
              <Switch
                checked={data.include}
                onCheckedChange={(checked) => onChange({ include: checked })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {data.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className="p-4 border border-border rounded-lg space-y-4 bg-card/50 relative"
                draggable
                onDragStart={() => setDraggedItem(itemIndex)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedItem !== null && draggedItem !== itemIndex) {
                    const newItems = [...data.items]
                    const [moved] = newItems.splice(draggedItem, 1)
                    newItems.splice(itemIndex, 0, moved)
                    onChange({ items: newItems })
                    setDraggedItem(null)
                  }
                }}
              >
                {/* Drag Handle */}
                <div className="absolute top-2 left-2 text-muted-foreground cursor-move">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Item Header */}
                <div className="flex items-center justify-between ml-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Position {itemIndex + 1}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {item.bullets.primary.length} bullets
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveWorkExperience(itemIndex)}
                      className="h-8 w-8"
                      disabled={data.items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={item.include}
                      onCheckedChange={(checked) =>
                        handleItemUpdate(itemIndex, { include: checked })
                      }
                    />
                  </div>
                </div>

                {/* Company & Title */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`company-${itemIndex}`} className="flex items-center gap-1 text-sm">
                      <Building2 className="h-4 w-4" />
                      Company
                    </Label>
                    <Input
                      id={`company-${itemIndex}`}
                      value={item.company}
                      onChange={(e) => handleItemUpdate(itemIndex, { company: e.target.value })}
                      placeholder="Acme Corp"
                      disabled={!item.include || !data.include}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`title-${itemIndex}`} className="flex items-center gap-1 text-sm">
                      <Briefcase className="h-4 w-4" />
                      Job Title
                    </Label>
                    <Input
                      id={`title-${itemIndex}`}
                      value={item.title}
                      onChange={(e) => handleItemUpdate(itemIndex, { title: e.target.value })}
                      placeholder="Senior Product Designer"
                      disabled={!item.include || !data.include}
                    />
                  </div>
                </div>

                {/* Location & Dates */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`location-${itemIndex}`} className="flex items-center gap-1 text-sm">
                      <MapPin className="h-4 w-4" />
                      Location
                    </Label>
                    <Input
                      id={`location-${itemIndex}`}
                      value={item.location}
                      onChange={(e) => handleItemUpdate(itemIndex, { location: e.target.value })}
                      placeholder="San Francisco, CA"
                      disabled={!item.include || !data.include}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`start-${itemIndex}`} className="flex items-center gap-1 text-sm">
                      <Calendar className="h-4 w-4" />
                      Start Date
                    </Label>
                    <Input
                      id={`start-${itemIndex}`}
                      value={item.start_date}
                      onChange={(e) => handleItemUpdate(itemIndex, { start_date: e.target.value })}
                      placeholder="Jan 2021"
                      disabled={!item.include || !data.include}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`end-${itemIndex}`} className="flex items-center gap-1 text-sm">
                      <Calendar className="h-4 w-4" />
                      End Date
                    </Label>
                    <Input
                      id={`end-${itemIndex}`}
                      value={item.end_date}
                      onChange={(e) => handleItemUpdate(itemIndex, { end_date: e.target.value })}
                      placeholder="Present"
                      disabled={!item.include || !data.include}
                    />
                  </div>
                </div>

                {/* Bullets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Achievements & Responsibilities</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBullet(itemIndex)}
                      disabled={!item.include || !data.include}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Bullet
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {item.bullets.primary.map((bullet, bulletIndex) => (
                      <div
                        key={bulletIndex}
                        className="space-y-2 border border-border/50 rounded-lg p-3 bg-background/50"
                        draggable
                        onDragStart={() => setDraggedBullet({itemIndex, bulletIndex})}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedBullet && draggedBullet.itemIndex === itemIndex && draggedBullet.bulletIndex !== bulletIndex) {
                            handleReorderBullet(itemIndex, draggedBullet.bulletIndex, bulletIndex)
                            setDraggedBullet(null)
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 mt-2">
                            {bullet && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                            <div className="text-muted-foreground cursor-move">
                              <GripVertical className="h-4 w-4" />
                            </div>
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <Textarea
                              value={bullet}
                              onChange={(e) =>
                                handleBulletChange(itemIndex, bulletIndex, e.target.value)
                              }
                              placeholder="Led [initiative] → [specific action with metric] → resulted in [business impact]"
                              disabled={!item.include || !data.include}
                              rows={2}
                              className="resize-none text-sm"
                            />
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {bullet && <Badge variant="outline" className={`text-xs ${getBulletQuality(bullet).bgColor} ${getBulletQuality(bullet).borderColor} ${getBulletQuality(bullet).color}`}>
                                  {getBulletQuality(bullet).label} ({wordCount(bullet)}w)
                                </Badge>}
                                {bullet && wordCount(bullet) > 0 && (
                                  <Progress value={getBulletQuality(bullet).score} className="w-16 h-1" />
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {item.bullets.alternates.length > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <AIButton
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={!item.include || !data.include}
                                      />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[420px]">
                                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                        AI-Generated Alternatives
                                      </div>
                                      {item.bullets.alternates.map((alternate, altIdx) => (
                                        <DropdownMenuItem
                                          key={altIdx}
                                          onClick={() =>
                                            handleSwapBullet(itemIndex, bulletIndex, alternate)
                                          }
                                          className="cursor-pointer whitespace-normal leading-relaxed p-3"
                                        >
                                          <div className="space-y-2 w-full">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                {getBulletTypeIcon(altIdx)}
                                                <Badge variant="secondary" className="text-xs">
                                                  {getBulletTypeLabel(altIdx)}
                                                </Badge>
                                              </div>
                                              <Badge variant="outline" className={`text-xs ${getBulletQuality(alternate).bgColor} ${getBulletQuality(alternate).borderColor} ${getBulletQuality(alternate).color}`}>
                                                {getBulletQuality(alternate).label} ({wordCount(alternate)}w)
                                              </Badge>
                                            </div>
                                            <p className="text-sm text-left">{alternate}</p>
                                          </div>
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                
                                {item.bullets.primary.length > 1 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <ArrowUpDown className="h-4 w-4 text-muted-foreground cursor-move" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Drag to reorder bullets</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRemoveBullet(itemIndex, bulletIndex)}
                                  disabled={!item.include || !data.include}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {item.bullets.primary.length > 0 && (
                    <TipsSection
                      title="CAR Format Tips"
                      description="Context-Action-Result methodology for impact"
                      tips={[
                        "Start with a strong action verb (Led, Developed, Implemented).",
                        "Include specific metrics and results (increased by 25%, reduced costs by $50K).",
                        "Keep bullets concise: 12–20 words is optimal.",
                        "Include 2–3 keywords from the job description naturally."
                      ]}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Add Work Experience Button */}
            <Button
              variant="outline"
              onClick={handleAddWorkExperience}
              className="w-full"
              disabled={!data.include}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Work Experience
            </Button>
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
