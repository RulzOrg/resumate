import { Filter, Download } from "lucide-react"
import { ResumesTable } from "./resumes-table"

interface Resume {
  id: string
  title: string
  job_title: string
  company_name: string
  created_at: string
  match_score: number
  original_resume_title: string
}

interface ResumesTableSectionProps {
  resumes: Resume[]
}

export function ResumesTableSection({ resumes }: ResumesTableSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-medium tracking-tight font-geist text-foreground">Resumes</h2>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-geist">Filter</span>
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition">
            <Download className="w-3.5 h-3.5" />
            <span className="font-geist">Export</span>
          </button>
        </div>
      </div>
      <ResumesTable resumes={resumes} />
    </div>
  )
}
