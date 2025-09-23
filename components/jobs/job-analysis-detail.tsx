"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  Building2, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Star, 
  CheckCircle, 
  Target,
  ExternalLink,
  Zap,
  FileText,
  TrendingUp
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { JobAnalysis } from "@/lib/db"

interface JobAnalysisDetailProps {
  analysis: JobAnalysis
}

export function JobAnalysisDetail({ analysis }: JobAnalysisDetailProps) {
  const analysisData = analysis.analysis_result

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{analysis.job_title}</h1>
          <div className="flex items-center gap-6 mt-2 text-muted-foreground">
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
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Analyzed {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button>
            <Zap className="w-4 h-4 mr-2" />
            Optimize Resume
          </Button>
          {analysis.job_url && (
            <Button variant="outline" asChild>
              <a href={analysis.job_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Original Posting
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{analysisData.required_skills.length}</div>
            <div className="text-sm text-muted-foreground">Required Skills</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">{analysisData.keywords.length}</div>
            <div className="text-sm text-muted-foreground">Keywords</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-chart-2">{analysisData.key_requirements.length}</div>
            <div className="text-sm text-muted-foreground">Key Requirements</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-chart-3">{analysisData.benefits.length}</div>
            <div className="text-sm text-muted-foreground">Benefits</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Required Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Must-Have Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysisData.required_skills.map((skill, index) => (
                <Badge 
                  key={index} 
                  variant="default" 
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preferred Skills */}
        {analysisData.preferred_skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                Nice-to-Have Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysisData.preferred_skills.map((skill, index) => (
                  <Badge key={index} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keywords */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Target className="w-5 h-5 mr-2 text-accent" />
              Key Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysisData.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Experience Level */}
        {analysisData.experience_level && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <TrendingUp className="w-5 h-5 mr-2 text-chart-2" />
                Experience Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-base px-4 py-2">
                {analysisData.experience_level}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Sections */}
      <div className="space-y-6">
        {/* Key Requirements */}
        {analysisData.key_requirements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Key Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysisData.key_requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Nice to Have */}
        {analysisData.nice_to_have.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Nice to Have</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysisData.nice_to_have.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Company Culture */}
        {analysisData.company_culture.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Company Culture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysisData.company_culture.map((culture, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="bg-blue-500/10 text-blue-600 border-blue-500/20"
                  >
                    {culture}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        {analysisData.benefits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Benefits & Perks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {analysisData.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Resume Optimization CTA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Ready to optimize your resume?</h3>
          <p className="text-muted-foreground mb-4">
            Use this job analysis to create a tailored resume that matches the requirements perfectly.
          </p>
          <Button size="lg">
            <Zap className="w-5 h-5 mr-2" />
            Optimize Resume for This Job
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}