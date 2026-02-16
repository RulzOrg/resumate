"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FileText, Download, Settings2, Eye } from "lucide-react"
import type { OptimizedResume } from "@/lib/db"
import { useState } from "react"
import { LayoutSelector } from "./layout-selector"
import Link from "next/link"

interface GeneratedResumesCompactListProps {
  resumes: (OptimizedResume & {
    original_resume_title?: string
    job_title?: string
  })[]
  limit?: number
}

export function GeneratedResumesCompactList({ resumes, limit }: GeneratedResumesCompactListProps) {
  const [layout, setLayout] = useState<string>("modern")
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false)
  const items = typeof limit === "number" ? resumes.slice(0, limit) : resumes
  const finiteScore = (score?: number | null) => (
    typeof score === 'number' && Number.isFinite(score) ? score : null
  )
  const matchClass = (score?: number | null) => {
    const s = finiteScore(score)
    if (s === null) return 'text-muted-foreground'
    if (s === 0) return 'text-red-400'
    if (s < 60) return 'text-amber-400'
    return 'text-primary'
  }
  const handleDownload = async (id: string, format = "docx", layout = "modern") => {
    try {
      const response = await fetch(`/api/resumes/export?resume_id=${id}&format=${format}&layout=${layout}`)
      if (!response.ok) {
        toast.error("Download failed. Try again.")
        return
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `resume-${id}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Download started")
    } catch {
      toast.error("Download failed. Try again.")
    }
  }

  return (
    <div className="space-y-0">
      {items.map((resume, index) => (
        <div key={resume.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 py-4 ${index > 0 ? 'border-t border-border' : ''}`}>
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-surface-subtle border border-border">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-2" title={resume.job_title ? `${resume.job_title} - (${resume.original_resume_title || resume.title})` : resume.title}>
                {resume.job_title ? (
                  <>
                    {resume.job_title} - <span className="text-muted-foreground font-normal">({resume.original_resume_title || resume.title})</span>
                  </>
                ) : (
                  resume.title
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                Generated {new Date(resume.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
            <div className="text-center mr-2">
              <p className={`font-medium ${matchClass(resume.match_score)}`}>
                {finiteScore(resume.match_score) === null ? '—' : `${finiteScore(resume.match_score)}%`}
              </p>
              <p className="text-xs text-muted-foreground">Match</p>
            </div>
            <Button size="sm" variant="ghost" className="h-9 w-9 rounded-full bg-surface-muted hover:bg-surface-strong p-0" asChild>
              <Link href={`/dashboard/optimized/${resume.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsLayoutModalOpen(true)}
              className="h-8 text-[10px] bg-surface-muted border-border px-2 flex items-center gap-1.5"
            >
              <Settings2 className="h-3 w-3" />
              {layout.charAt(0).toUpperCase() + layout.slice(1)}
            </Button>
            <Button size="sm" variant="ghost" className="h-9 w-9 rounded-full bg-surface-muted hover:bg-surface-strong p-0" onClick={() => handleDownload(resume.id, "docx", layout)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
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

