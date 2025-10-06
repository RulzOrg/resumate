import { Briefcase, FileText, List, Gauge } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"

interface JobsKpiSectionProps {
  stats: {
    jobsSaved: number
    cvsGenerated: number
    keywordsExtracted: number
    avgMatch: number
  }
  trends: {
    jobsSavedChange: number
    cvsGeneratedChange: number
    keywordsExtractedChange: number
    avgMatchChange: number
  }
}

const formatChange = (change: number, suffix: string) => {
  if (change === 0) {
    return `No change ${suffix}`
  }

  const sign = change > 0 ? "+" : ""
  return `${sign}${change} ${suffix}`
}

export function JobsKpiSection({ stats, trends }: JobsKpiSectionProps) {
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Jobs saved"
        value={stats.jobsSaved}
        subtitle={formatChange(trends.jobsSavedChange, "this week")}
        icon={Briefcase}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="CVs generated"
        value={stats.cvsGenerated}
        subtitle={formatChange(trends.cvsGeneratedChange, "this week")}
        icon={FileText}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="Keywords extracted"
        value={stats.keywordsExtracted}
        subtitle={formatChange(trends.keywordsExtractedChange, "this week")}
        icon={List}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="Avg match"
        value={`${stats.avgMatch}%`}
        subtitle={formatChange(trends.avgMatchChange, "vs last week")}
        icon={Gauge}
        iconColor="text-emerald-300"
      />
    </div>
  )
}
