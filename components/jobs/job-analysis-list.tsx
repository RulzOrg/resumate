"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, MapPin, Clock, MoreHorizontal, ExternalLink, Trash2, Zap, DollarSign, Users, Star, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import type { JobAnalysis } from "@/lib/db"

interface JobAnalysisListProps {
  analyses: JobAnalysis[]
}

interface JobAnalysisCardProps {
  analysis: JobAnalysis
}

function JobAnalysisCard({ analysis }: JobAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const analysisData = analysis.analysis_result
  const keywords = analysisData?.keywords ?? []

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{analysis.job_title}</CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {analysis.company_name && (
                <div className="flex items-center">
                  <Building2 className="w-4 h-4 mr-1" />
                  {analysis.company_name}
                </div>
              )}
              {analysisData.location && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {analysisData.location}
                </div>
              )}
              {analysisData.salary_range && (
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  {analysisData.salary_range}
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Zap className="mr-2 h-4 w-4" />
                Optimize Resume
              </DropdownMenuItem>
              {analysis.job_url && (
                <DropdownMenuItem asChild>
                  <a href={analysis.job_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Original
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            Analyzed {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
          </div>
          {analysisData.experience_level && (
            <Badge variant="secondary">{analysisData.experience_level}</Badge>
          )}
        </div>

        {/* Key Insights Summary */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{analysisData.required_skills?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Required Skills</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{keywords.length}</div>
            <div className="text-xs text-muted-foreground">Key Keywords</div>
          </div>
        </div>

        {/* Essential Skills */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Star className="w-4 h-4 mr-1 text-yellow-500" />
            Must-Have Skills
          </h4>
          <div className="flex flex-wrap gap-1">
            {(analysisData.required_skills ?? []).slice(0, 6).map((skill, index) => (
              <Badge key={index} variant="default" className="text-xs bg-primary/10 text-primary border-primary/20">
                {skill}
              </Badge>
            ))}
            {(analysisData.required_skills?.length ?? 0) > 6 && (
              <Badge variant="outline" className="text-xs">
                +{(analysisData.required_skills?.length ?? 0) - 6} more
              </Badge>
            )}
          </div>
        </div>

        {/* Keywords Preview */}
        <div>
          <h4 className="text-sm font-medium mb-2">Key Keywords</h4>
          <div className="flex flex-wrap gap-1">
            {keywords.slice(0, 5).map((keyword, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {keyword}
              </Badge>
            ))}
            {keywords.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{keywords.length - 5} more
              </Badge>
            )}
          </div>
        </div>

        {/* Expandable Detailed Analysis */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            {/* Preferred Skills */}
            {analysisData.preferred_skills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Nice-to-Have Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {analysisData.preferred_skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Key Requirements */}
            {analysisData.key_requirements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Key Requirements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {analysisData.key_requirements.slice(0, 3).map((req, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-2 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Company Culture */}
            {analysisData.company_culture.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  Company Culture
                </h4>
                <div className="flex flex-wrap gap-1">
                  {analysisData.company_culture.map((culture, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                      {culture}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {analysisData.benefits.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Benefits & Perks</h4>
                <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground">
                  {analysisData.benefits.slice(0, 4).map((benefit, index) => (
                    <div key={index} className="flex items-center">
                      <span className="w-1 h-1 bg-green-500 rounded-full mr-2" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/jobs/${analysis.id}`}>
              View
            </Link>
          </Button>
          <Button size="sm" className="flex-1">
            <Zap className="w-4 h-4 mr-2" />
            Optimize Resume
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Details
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function JobAnalysisList({ analyses }: JobAnalysisListProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {analyses.map((analysis) => (
        <JobAnalysisCard key={analysis.id} analysis={analysis} />
      ))}
    </div>
  )
}
