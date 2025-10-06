import { FileText, FileDown, Pencil, Gauge } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"

interface ResumesKpiSectionProps {
  stats: {
    resumesSaved: number
    pdfExports: number
    editsMade: number
    avgScore: number
  }
  trends: {
    resumesSavedChange: number
    pdfExportsChange: number
    editsMadeChange: number
    avgScoreChange: number
  }
}

const formatChange = (change: number, {
  suffix,
  zeroLabel,
}: {
  suffix: string
  zeroLabel?: string
}) => {
  if (change === 0) {
    return zeroLabel ?? `No change ${suffix}`
  }
  const sign = change > 0 ? "+" : ""
  return `${sign}${change} ${suffix}`
}

export function ResumesKpiSection({ stats, trends }: ResumesKpiSectionProps) {
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Resumes saved"
        value={stats.resumesSaved}
        subtitle={formatChange(trends.resumesSavedChange, { suffix: "this week" })}
        icon={FileText}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="PDF exports"
        value={stats.pdfExports}
        subtitle={formatChange(trends.pdfExportsChange, {
          suffix: "this week",
          zeroLabel: "No exports tracked this week",
        })}
        icon={FileDown}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="Edits made"
        value={stats.editsMade}
        subtitle={formatChange(trends.editsMadeChange, { suffix: "this week" })}
        icon={Pencil}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="Avg score"
        value={`${stats.avgScore}%`}
        subtitle={formatChange(trends.avgScoreChange, {
          suffix: "vs last week",
          zeroLabel: "No change vs last week",
        })}
        icon={Gauge}
        iconColor="text-emerald-300"
      />
    </div>
  )
}
