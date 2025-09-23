import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, MapPin, Clock, MoreHorizontal, ExternalLink, Trash2, Zap } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { JobAnalysis } from "@/lib/db"

interface JobAnalysisListProps {
  analyses: JobAnalysis[]
}

export function JobAnalysisList({ analyses }: JobAnalysisListProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {analyses.map((analysis) => (
        <Card
          key={analysis.id}
          className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors"
        >
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
                  {analysis.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {analysis.location}
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
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-1" />
              Analyzed {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
            </div>

            {analysis.experience_level && (
              <div>
                <Badge variant="secondary">{analysis.experience_level}</Badge>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.required_skills.slice(0, 6).map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {analysis.required_skills.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{analysis.required_skills.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Key Keywords</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.keywords.slice(0, 5).map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {analysis.keywords.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{analysis.keywords.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1">
                <Zap className="w-4 h-4 mr-2" />
                Optimize Resume
              </Button>
              <Button size="sm" variant="outline">
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
