"use client"

import { Button } from "@/components/ui/button"
import { FileText, Download } from "lucide-react"
import type { OptimizedResume } from "@/lib/db"
import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface GeneratedResumesCompactListProps {
  resumes: OptimizedResume[]
  limit?: number
}

export function GeneratedResumesCompactList({ resumes, limit }: GeneratedResumesCompactListProps) {
  const [layout, setLayout] = useState<string>("modern")
  const items = typeof limit === "number" ? resumes.slice(0, limit) : resumes
  const finiteScore = (score?: number | null) => (
    typeof score === 'number' && Number.isFinite(score) ? score : null
  )
  const matchClass = (score?: number | null) => {
    const s = finiteScore(score)
    if (s === null) return 'text-foreground/60 dark:text-white/60'
    if (s === 0) return 'text-red-400'
    if (s < 60) return 'text-amber-400'
    return 'text-emerald-400'
  }
  const handleDownload = async (id: string, format = "docx", layout = "modern") => {
    try {
      const response = await fetch(`/api/resumes/export?resume_id=${id}&format=${format}&layout=${layout}`)
      if (!response.ok) {
        console.error('Download failed:', response.statusText)
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
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  return (
    <div className="space-y-0">
      {items.map((resume, index) => (
        <div key={resume.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 py-4 ${index > 0 ? 'border-t border-gray-300 dark:border-white/10' : ''}`}>
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10">
              <FileText className="h-5 w-5 text-foreground/70 dark:text-white/70" />
            </div>
            <div>
              <p className="font-medium">Resume for {resume.title}</p>
              <p className="text-sm text-foreground/60 dark:text-white/60">
                Generated {new Date(resume.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="text-center mr-2">
              <p className={`font-medium ${matchClass(resume.match_score)}`}>
                {finiteScore(resume.match_score) === null ? '—' : `${finiteScore(resume.match_score)}%`}
              </p>
              <p className="text-xs text-foreground/60 dark:text-white/60">Match</p>
            </div>
            <Select value={layout} onValueChange={setLayout}>
              <SelectTrigger className="w-[100px] h-8 text-[10px] bg-surface-muted dark:bg-white/10 border-border dark:border-white/10">
                <SelectValue placeholder="Layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic" className="text-xs">Classic</SelectItem>
                <SelectItem value="modern" className="text-xs">Modern</SelectItem>
                <SelectItem value="compact" className="text-xs">Compact</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-9 w-9 rounded-full bg-surface-muted dark:bg-white/10 hover:bg-surface-strong dark:hover:bg-white/20 p-0" onClick={() => handleDownload(resume.id, "docx", layout)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

