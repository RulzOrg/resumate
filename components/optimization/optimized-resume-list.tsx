"use client"

import { toast } from "sonner"
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
import { Building2, Clock, MoreHorizontal, Download, Eye, Trash2, TrendingUp, Settings2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import type { OptimizedResume } from "@/lib/db"
import { useState } from "react"
import { LayoutSelector } from "./layout-selector"

interface OptimizedResumeListProps {
  optimizedResumes: (OptimizedResume & {
    original_resume_title: string
    job_title: string
    company_name?: string
  })[]
}

export function OptimizedResumeList({ optimizedResumes }: OptimizedResumeListProps) {
  const [layout, setLayout] = useState<string>("modern")
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false)
  const matchClasses = (score?: number | null) => {
    const s = typeof score === 'number' ? score : null
    if (s === null) return { badge: 'bg-surface-muted text-muted-foreground', icon: 'text-muted-foreground' }
    if (s === 0) return { badge: 'bg-red-500/10 text-red-400', icon: 'text-red-400' }
    if (s < 60) return { badge: 'bg-amber-500/10 text-amber-400', icon: 'text-amber-400' }
    return { badge: 'bg-primary/10 text-primary', icon: 'text-primary' }
  }
  const handleDownload = async (resumeId: string, format = "docx", layout = "modern") => {
    try {
      const response = await fetch(`/api/resumes/export?resume_id=${resumeId}&format=${format}&layout=${layout}`)
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
        toast.success("Download started")
      } else {
        toast.error("Download failed. Try again.")
      }
    } catch {
      toast.error("Download failed. Try again.")
    }
  }

  const handleDelete = async (resumeId: string) => {
    if (confirm("Are you sure you want to delete this optimized resume?")) {
      try {
        const response = await fetch(`/api/resumes/optimized/${resumeId}`, {
          method: "DELETE",
        })
        if (response.ok) {
          toast.success("Resume deleted")
          window.location.reload()
        } else {
          toast.error("Delete failed. Try again.")
        }
      } catch {
        toast.error("Delete failed. Try again.")
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
                <CardTitle className="text-lg truncate" title={`${resume.job_title} - (${resume.original_resume_title})`}>
                  {resume.job_title} - <span className="text-muted-foreground font-normal">({resume.original_resume_title})</span>
                </CardTitle>
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
                  <DropdownMenuItem onClick={() => handleDownload(resume.id, "docx", layout)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download DOCX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(resume.id, "html", layout)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview (HTML)
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

            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" className="flex-1" asChild>
                <Link href={`/dashboard/optimized/${resume.id}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsLayoutModalOpen(true)}
                  className="h-9 text-xs bg-surface-muted border-border px-3 flex items-center gap-1.5"
                >
                  <Settings2 className="h-4 w-4" />
                  {layout.charAt(0).toUpperCase() + layout.slice(1)}
                </Button>
                <Button size="sm" variant="outline" className="bg-surface-muted border-border" onClick={() => handleDownload(resume.id, "docx", layout)}>
                  <Download className="w-4 h-4 mr-2" />
                  DOCX
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <LayoutSelector 
        open={isLayoutModalOpen} 
        onOpenChange={setIsLayoutModalOpen} 
        currentLayout={layout} 
        onSelect={setLayout} 
      />
    </div>
  )
}
