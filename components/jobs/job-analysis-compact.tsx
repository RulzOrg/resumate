import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, MapPin, Star, Zap } from "lucide-react"
import type { JobAnalysis } from "@/lib/db"

interface JobAnalysisCompactProps {
  analysis: JobAnalysis
  showOptimizeButton?: boolean
}

export function JobAnalysisCompact({ analysis, showOptimizeButton = true }: JobAnalysisCompactProps) {
  const analysisData = analysis.analysis_result

  return (
    <div className="p-4 rounded-lg border border-border/50 bg-card/30 hover:bg-card/50 transition-colors">
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h3 className="font-medium truncate">{analysis.job_title}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {analysis.company_name && (
              <div className="flex items-center">
                <Building2 className="w-3 h-3 mr-1" />
                {analysis.company_name}
              </div>
            )}
            {analysisData.location && (
              <div className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {analysisData.location}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            <span>{analysisData.required_skills.length} skills</span>
          </div>
          <div>
            <span>{analysisData.keywords.length} keywords</span>
          </div>
          {analysisData.experience_level && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {analysisData.experience_level}
            </Badge>
          )}
        </div>

        {/* Top Skills Preview */}
        <div className="flex flex-wrap gap-1">
          {analysisData.required_skills.slice(0, 3).map((skill, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className="text-xs bg-primary/5 text-primary border-primary/20"
            >
              {skill}
            </Badge>
          ))}
          {analysisData.required_skills.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{analysisData.required_skills.length - 3}
            </Badge>
          )}
        </div>

        {/* Action Button */}
        {showOptimizeButton && (
          <Button size="sm" className="w-full">
            <Zap className="w-3 h-3 mr-1" />
            Optimize
          </Button>
        )}
      </div>
    </div>
  )
}