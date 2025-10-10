"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  GraduationCap, Plus, Trash2, MapPin, Calendar, Award, AlertCircle,
  GripVertical, TrendingUp, Star, BookOpen
} from "lucide-react"
import { TipsSection } from "./tips-section"
import type { UIEducation } from "@/lib/schemas-v2"

interface EducationSectionProps {
  data: UIEducation
  onChange: (updates: Partial<UIEducation>) => void
}

export function EducationSection({ data, onChange }: EducationSectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleItemUpdate = (index: number, field: string, value: string) => {
    const newItems = [...data.items]
    newItems[index] = { ...newItems[index], [field]: value }
    onChange({ items: newItems })
  }

  const handleAddEducation = () => {
    const newItem = {
      degree: "",
      institution: "",
      notes: "",
    }
    onChange({ items: [...data.items, newItem] })
  }

  const handleRemoveEducation = (index: number) => {
    const newItems = data.items.filter((_, idx) => idx !== index)
    onChange({ items: newItems })
  }

  const handleReorderEducation = (fromIndex: number, toIndex: number) => {
    const newItems = [...data.items]
    const [moved] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, moved)
    onChange({ items: newItems })
  }

  const validateGPA = (gpa: string) => {
    const gpaPattern = /^([0-4]\.\d+|[0-4])$/i
    return gpaPattern.test(gpa) && parseFloat(gpa) <= 4.0
  }

  const extractGPAFromNotes = (notes: string) => {
    const gpaMatch = notes.match(/GPA[:\s]*(\d\.\d+|\d)/i)
    return gpaMatch ? gpaMatch[1] : null
  }

  const calculateEducationScore = () => {
    if (data.items.length === 0) return 0
    
    let completedFields = 0
    let totalFields = 0
    
    data.items.forEach(item => {
      if (item.degree) completedFields++
      if (item.institution) completedFields++
      if (item.notes) completedFields++
      totalFields += 3
    })
    
    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0
  }

  const educationScore = calculateEducationScore()

  return (
    <TooltipProvider>
      <Card className="relative">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Academic qualifications and achievements
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                    <TrendingUp className="h-3 w-3" />
                    <span className={`text-xs font-medium ${educationScore >= 80 ? 'text-green-500' : educationScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {educationScore}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Education completeness score</p>
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
          <div className="space-y-4">
            {data.items.map((item, index) => (
              <div
                key={index}
                className="p-4 border border-border rounded-lg space-y-4 bg-card/50 relative"
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedIndex !== null && draggedIndex !== index) {
                    handleReorderEducation(draggedIndex, index)
                    setDraggedIndex(null)
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
                    <span className="text-sm font-medium">Education {index + 1}</span>
                    {item.institution && (
                      <Badge variant="outline" className="text-xs">
                        {item.institution.split(' ')[0]}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveEducation(index)}
                    className="h-8 w-8"
                    disabled={data.items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Institution & Degree */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`institution-${index}`} className="flex items-center gap-1 text-sm">
                      <BookOpen className="h-4 w-4" />
                      Institution
                    </Label>
                    <Input
                      id={`institution-${index}`}
                      value={item.institution}
                      onChange={(e) => handleItemUpdate(index, "institution", e.target.value)}
                      placeholder="Harvard University"
                      disabled={!data.include}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`degree-${index}`} className="flex items-center gap-1 text-sm">
                      <Award className="h-4 w-4" />
                      Degree / Field of Study
                    </Label>
                    <Input
                      id={`degree-${index}`}
                      value={item.degree}
                      onChange={(e) => handleItemUpdate(index, "degree", e.target.value)}
                      placeholder="Bachelor of Science in Computer Science"
                      disabled={!data.include}
                    />
                  </div>
                </div>

                {/* Dates (parsed from notes) */}
                <div className="space-y-2">
                  <Label className="text-sm">Period & Details</Label>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`start-${index}`} className="flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3" />
                        Start Date
                      </Label>
                      <Input
                        id={`start-${index}`}
                        value={extractGPAFromNotes(item.notes) ? "" : ""}
                        onChange={(e) => {
                          const startDate = e.target.value
                          const currentGPA = extractGPAFromNotes(item.notes)
                          // You could parse dates from notes here and handle separately
                          if (!currentGPA) {
                            handleItemUpdate(index, "notes", `${startDate} - Present`)
                          }
                        }}
                        placeholder="Sep 2016"
                        disabled={!data.include}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`end-${index}`} className="flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3" />
                        End Date
                      </Label>
                      <Input
                        id={`end-${index}`}
                        value={extractGPAFromNotes(item.notes) ? "" : ""}
                        onChange={(e) => {
                          const endDate = e.target.value
                          const currentGPA = extractGPAFromNotes(item.notes)
                          if (!currentGPA) {
                            // Update notes with date range
                            handleItemUpdate(index, "notes", endDate)
                          }
                        }}
                        placeholder="May 2020"
                        disabled={!data.include}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`location-${index}`} className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" />
                        Location
                      </Label>
                      <Input
                        id={`location-${index}`}
                        value={extractGPAFromNotes(item.notes) ? "" : ""}
                        onChange={(e) => {
                          const location = e.target.value
                          const currentGPA = extractGPAFromNotes(item.notes)
                          if (!currentGPA) {
                            handleItemUpdate(index, "notes", location)
                          }
                        }}
                        placeholder="Cambridge, MA"
                        disabled={!data.include}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes with GPA validation */}
                <div className="space-y-2">
                  <Label htmlFor={`notes-${index}`} className="text-sm">
                    Additional Information <span className="text-muted-foreground">(GPA, Honors, Coursework)</span>
                  </Label>
                  <Textarea
                    id={`notes-${index}`}
                    value={item.notes}
                    onChange={(e) => handleItemUpdate(index, "notes", e.target.value)}
                    placeholder="GPA: 3.8/4.0, Dean's List, Relevant Coursework: Data Structures, Algorithms, Machine Learning"
                    disabled={!data.include}
                    rows={3}
                    className="text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {extractGPAFromNotes(item.notes) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              validateGPA(extractGPAFromNotes(item.notes)!)
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            } border`}>
                              GPA: {extractGPAFromNotes(item.notes)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>GPA detected from notes. {validateGPA(extractGPAFromNotes(item.notes)!) ? "Valid" : "Should be 0.0-4.0"}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {item.notes.toLowerCase().includes('dean') && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                          Dean's List
                        </Badge>
                      )}
                      {item.notes.toLowerCase().includes('honor') && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20">
                          Honors
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Tip: Include GPA (0.0-4.0 scale), honors, relevant coursework, or academic achievements
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Education Button */}
          <Button
            variant="outline"
            onClick={handleAddEducation}
            className="w-full"
            disabled={!data.include}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Education
          </Button>

          {/* Tips Section */}
          <TipsSection
            title="Education Tips"
            description="Optimize academic credentials for ATS and recruiters"
            tips={[
              "Include degree and field of study for ATS keyword matching.",
              "Add GPA if 3.0 or higher, especially for recent graduates.",
              "List honors and academic achievements (Dean's List, scholarships).",
              "Include relevant coursework for career changers or recent graduates.",
              "Format dates consistently (e.g., \"Sep 2016 - May 2020\" or \"2018\")."
            ]}
          />

          {/* Expert Tip */}
          <TipsSection
            title="Expert Tip"
            variant="amber"
            icon={Star}
            content={
              <p>
                For experienced professionals, limit education to most recent degree unless field is different from career. 
                For recent graduates, include graduation date and relevant coursework.
              </p>
            }
          />
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
