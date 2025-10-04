import { FileText, FileDown, Pencil, Gauge } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"

interface ResumesKpiSectionProps {
  stats: {
    resumesSaved: number
    pdfExports: number
    editsMade: number
    avgScore: number
  }
}

export function ResumesKpiSection({ stats }: ResumesKpiSectionProps) {
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Resumes saved"
        value={stats.resumesSaved}
        subtitle="+2 this week"
        icon={FileText}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="PDF exports"
        value={stats.pdfExports}
        subtitle="+1 this week"
        icon={FileDown}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="Edits made"
        value={stats.editsMade}
        subtitle="+6 this week"
        icon={Pencil}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="Avg score"
        value={`${stats.avgScore}%`}
        subtitle="+3 vs last week"
        icon={Gauge}
        iconColor="text-emerald-300"
      />
    </div>
  )
}
