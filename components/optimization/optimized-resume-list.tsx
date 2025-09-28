"use client"

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
import { Building2, Clock, MoreHorizontal, Download, Eye, Trash2, TrendingUp } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import type { OptimizedResume } from "@/lib/db"

interface OptimizedResumeListProps {
  optimizedResumes: (OptimizedResume & {
    original_resume_title: string
    job_title: string
    company_name?: string
  })[]
}

export function OptimizedResumeList({ optimizedResumes }: OptimizedResumeListProps) {
  const matchClasses = (score?: number | null) => {
    const s = typeof score === 'number' && Number.isFinite(score) ? score : null
    if (s === null) return { badge: 'bg-white/10 text-white/70', icon: 'text-white/70' }
    if (s === 0) return { badge: 'bg-red-500/10 text-red-400', icon: 'text-red-400' }
    if (s < 60) return { badge: 'bg-amber-500/10 text-amber-400', icon: 'text-amber-400' }
    return { badge: 'bg-emerald-500/10 text-emerald-400', icon: 'text-emerald-400' }
  }
  const handleDownload = async (resumeId: string, format = "pdf") => {
    try {
      const response = await fetch(`/api/resumes/download?id=${resumeId}&format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `resume.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error("Download failed")
      }
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const handleDelete = async (resumeId: string) => {
    if (confirm("Are you sure you want to delete this optimized resume?")) {
      try {
        const response = await fetch(`/api/resumes/optimized/${resumeId}`, {
          method: "DELETE",
        })
        if (response.ok) {
          window.location.reload()
        } else {
          console.error("Delete failed")
        }
      } catch (error) {
        console.error("Delete error:", error)
      }
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {optimizedResumes.map((resume) => (
        <Card
          key={resume.id}
          className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{resume.title}</CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-1" />
                    {resume.job_title}
                  </div>
                  {resume.company_name && <span>at {resume.company_name}</span>}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/optimized/${resume.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(resume.id, "pdf")}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(resume.id, "docx")}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Word
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(resume.id, "txt")}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Text
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(resume.id)}>
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
              Created {formatDistanceToNow(new Date(resume.created_at), { addSuffix: true })}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Match Score:</span>
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${matchClasses(resume.match_score).icon}`} />
                <Badge variant="secondary" className={matchClasses(resume.match_score).badge}>
                  {resume.match_score != null ? `${resume.match_score}%` : 'N/A'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">Keywords Added</h4>
                <div className="flex flex-wrap gap-1">
                  {resume.keywords_added.slice(0, 4).map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {resume.keywords_added.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{resume.keywords_added.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Skills Highlighted</h4>
                <div className="flex flex-wrap gap-1">
                  {resume.skills_highlighted.slice(0, 3).map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {resume.skills_highlighted.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{resume.skills_highlighted.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1" asChild>
                <Link href={`/dashboard/optimized/${resume.id}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDownload(resume.id, "pdf")}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
