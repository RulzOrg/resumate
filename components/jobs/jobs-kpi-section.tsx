import { Briefcase, FileText, List, Gauge } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"

interface JobsKpiSectionProps {
  stats: {
    jobsSaved: number
    cvsGenerated: number
    keywordsExtracted: number
    avgMatch: number
  }
}

export function JobsKpiSection({ stats }: JobsKpiSectionProps) {
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Jobs saved"
        value={stats.jobsSaved}
        subtitle="+3 this week"
        icon={Briefcase}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="CVs generated"
        value={stats.cvsGenerated}
        subtitle="+2 this week"
        icon={FileText}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="Keywords extracted"
        value={stats.keywordsExtracted}
        subtitle="+28 this week"
        icon={List}
        iconColor="text-emerald-300"
      />
      <KpiCard
        title="Avg match"
        value={`${stats.avgMatch}%`}
        subtitle="+3 vs last week"
        icon={Gauge}
        iconColor="text-emerald-300"
      />
    </div>
  )
}
