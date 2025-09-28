"use client"

import { Button } from "@/components/ui/button"
import { FileText, Download } from "lucide-react"
import type { OptimizedResume } from "@/lib/db"

interface GeneratedResumesCompactListProps {
  resumes: OptimizedResume[]
  limit?: number
}

export function GeneratedResumesCompactList({ resumes, limit = 3 }: GeneratedResumesCompactListProps) {
  const items = resumes.slice(0, limit)
  const finiteScore = (score?: number | null) => (
    typeof score === 'number' && Number.isFinite(score) ? score : null
  )
  const matchClass = (score?: number | null) => {
    const s = finiteScore(score)
    if (s === null) return 'text-white/60'
    if (s === 0) return 'text-red-400'
    if (s < 60) return 'text-amber-400'
    return 'text-emerald-400'
  }
  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(`/api/resumes/download?id=${id}&format=pdf`)
      if (!response.ok) {
        console.error('Download failed:', response.statusText)
        return
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `resume-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  return (
    <div className="divide-y divide-white/10">
      {items.map((resume) => (
        <div key={resume.id} className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-white/5">
              <FileText className="h-5 w-5 text-white/70" />
            </div>
            <div>
              <p className="font-medium">Resume for {resume.title}</p>
              <p className="text-sm text-white/60">
                Generated {new Date(resume.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 self-start sm:self-center">
            <div className="text-center">
              <p className={`font-medium ${matchClass(resume.match_score)}`}>
                {finiteScore(resume.match_score) === null ? '—' : `${finiteScore(resume.match_score)}%`}
              </p>
              <p className="text-xs text-white/60">Match</p>
            </div>
            <Button size="sm" variant="ghost" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 p-0" onClick={() => handleDownload(resume.id)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}


