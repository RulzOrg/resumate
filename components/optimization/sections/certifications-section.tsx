"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Award, Plus, Trash2, MapPin, Calendar, AlertCircle, GripVertical,
  TrendingUp, Star, Zap, CheckCircle, Clock
} from "lucide-react"
import { TipsSection } from "./tips-section"
import type { UICertifications } from "@/lib/schemas-v2"

interface CertificationsSectionProps {
  data: UICertifications
  onChange: (updates: Partial<UICertifications>) => void
}

export function CertificationsSection({ data, onChange }: CertificationsSectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleItemUpdate = (index: number, field: string, value: string) => {
    const newItems = [...data.items]
    newItems[index] = { ...newItems[index], [field]: value }
    onChange({ items: newItems })
  }

  const handleAddCertification = () => {
    const newItem = {
      name: "",
      issuer: "",
    }
    onChange({ items: [...data.items, newItem] })
  }

  const handleRemoveCertification = (index: number) => {
    const newItems = data.items.filter((_, idx) => idx !== index)
    onChange({ items: newItems })
  }

  const handleReorderCertification = (fromIndex: number, toIndex: number) => {
    const newItems = [...data.items]
    const [moved] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, moved)
    onChange({ items: newItems })
  }

  const calculateCertificationsScore = () => {
    if (data.items.length === 0) return 0
    
    let completedFields = 0
    let totalFields = 0
    
    data.items.forEach(item => {
      if (item.name) completedFields++
      if (item.issuer) completedFields++
      totalFields += 2
    })
    
    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0
  }

  const certificationsScore = calculateCertificationsScore()

  const isRecentCertification = (date: string) => {
    if (!date) return false
    const certDate = new Date(date)
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    return certDate > twoYearsAgo
  }

  const getCertificationType = (name: string) => {
    const certName = name.toLowerCase()
    if (certName.includes('aws') || certName.includes('azure') || certName.includes('gcp')) return 'Cloud'
    if (certName.includes('project') || certName.includes('pmp') || certName.includes('scrum')) return 'Project'
    if (certName.includes('security') || certName.includes('cyber')) return 'Security'
    if (certName.includes('data') || certName.includes('analytics')) return 'Data'
    if (certName.includes('developer') || certName.includes('engineer')) return 'Development'
    return 'Professional'
  }

  const getCertificationTypeColor = (type: string) => {
    switch (type) {
      case 'Cloud': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'Project': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'Security': return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'Data': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'Development': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      default: return 'bg-muted text-muted-foreground border'
    }
  }

  return (
    <TooltipProvider>
      <Card className="relative">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certifications
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Professional certifications and credentials
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                    <TrendingUp className="h-3 w-3" />
                    <span className={`text-xs font-medium ${certificationsScore >= 80 ? 'text-green-500' : certificationsScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {certificationsScore}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Certifications completeness score</p>
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
            {data.items.map((item, index) => {
              const certType = getCertificationType(item.name)
              const hasDate = !!item.date
              
              return (
                <div
                  key={index}
                  className="p-4 border border-border rounded-lg space-y-4 bg-card/50 relative"
                  draggable
                  onDragStart={() => setDraggedIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedIndex !== null && draggedIndex !== index) {
                      handleReorderCertification(draggedIndex, index)
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
                      <span className="text-sm font-medium">Certification {index + 1}</span>
                      {item.name && (
                        <Badge variant="outline" className={`text-xs ${getCertificationTypeColor(certType)}`}>
                          {certType}
                        </Badge>
                      )}
                      {hasDate && isRecentCertification(item.date) && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          <Clock className="h-3 w-3 mr-1" />
                          Recent
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveCertification(index)}
                      className="h-8 w-8"
                      disabled={data.items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Certification Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-2">
                      <Label htmlFor={`cert-name-${index}`} className="text-sm">Certification Name</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`cert-name-${index}`}
                          value={item.name}
                          onChange={(e) => handleItemUpdate(index, "name", e.target.value)}
                          placeholder="Certified ScrumMaster (CSM)"
                          disabled={!data.include}
                          className="flex-1"
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="px-2 py-1 rounded-md bg-muted text-xs">
                              Tip: Include credential abbreviations
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Common formats: PMP, CSPO, AWS, CISSP, etc.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`cert-date-${index}`} className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date
                      </Label>
                      <Input
                        id={`cert-date-${index}`}
                        value={item.date}
                        onChange={(e) => handleItemUpdate(index, "date", e.target.value)}
                        placeholder="2023"
                        disabled={!data.include}
                      />
                    </div>
                  </div>

                  {/* Issuer & Location */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`cert-issuer-${index}`} className="flex items-center gap-1 text-sm">
                        <Award className="h-4 w-4" />
                        Issuing Organization
                      </Label>
                      <Input
                        id={`cert-issuer-${index}`}
                        value={item.issuer}
                        onChange={(e) => handleItemUpdate(index, "issuer", e.target.value)}
                        placeholder="Scrum Alliance, Project Management Institute"
                        disabled={!data.include}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`cert-location-${index}`} className="flex items-center gap-1 text-sm">
                        <MapPin className="h-4 w-4" />
                        Location <span className="text-muted-foreground">(Optional)</span>
                      </Label>
                      <Input
                        id={`cert-location-${index}`}
                        value={""}
                        onChange={(e) => {
                          // You could store location in a separate field if schema supports it
                          console.log('Location:', e.target.value)
                        }}
                        placeholder="San Francisco, CA"
                        disabled={!data.include}
                      />
                    </div>
                  </div>

                  {/* Status & Validation */}
                  {item.name && item.issuer && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600">
                        Complete Certification Information
                      </span>
                    </div>
                  )}
                  
                  {item.name && !item.issuer && (
                    <div className="text-xs text-amber-600">
                      Tip: Add the issuing organization for ATS optimization
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add Certification Button */}
          <Button
            variant="outline"
            onClick={handleAddCertification}
            className="w-full"
            disabled={!data.include}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Certification
          </Button>

          {/* Tips Section */}
          <TipsSection
            title="Certification Tips"
            description="Professional credentials that strengthen your candidacy"
            tips={[
              "Include both full name and credential abbreviation (e.g., \"Certified ScrumMaster (CSM)\").",
              "Add issuing organization for better ATS keyword matching.",
              "Include year of certification to show currency of skills.",
              "Prioritize current/relevant certifications over expired ones.",
              "Group by category: Technical, Project Management, Security, etc."
            ]}
          />

          {/* Expert Tip */}
          <TipsSection
            title="Expert Tip"
            variant="amber"
            icon={Star}
            content={
              <p>
                Focus on certifications that directly relate to your target role. 
                For technical positions, emphasize current cloud/development certifications. 
                For leadership roles, highlight project management or strategic certifications.
              </p>
            }
          />

          {/* Popular Certifications Examples */}
          <TipsSection
            title="Popular Examples"
            variant="purple"
            icon={Zap}
            content={
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                <div>
                  <p className="font-medium">Technical:</p>
                  <p>AWS Solutions Architect, Google Cloud Professional, Microsoft Azure, CCNA</p>
                </div>
                <div>
                  <p className="font-medium">Project Management:</p>
                  <p>PMP, CSM, Prince2, Agile Certified Practitioner</p>
                </div>
                <div>
                  <p className="font-medium">Other:</p>
                  <p>CISSP, CISA, Six Sigma, Salesforce Administrator</p>
                </div>
              </div>
            }
          />
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
