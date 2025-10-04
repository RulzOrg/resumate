import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import {
  getUserApplicationsWithDetails,
  getApplicationStats,
  getActivityFeed,
  getApplicationTrends,
  getKeywordGap,
} from "@/lib/db"
import { getATSHealthStatus } from "@/lib/ats-checker"
import { Send, Wand2, Files, Gauge } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { ApplicationsSection } from "@/components/dashboard/applications-section"
import { OptimizationSidebar } from "@/components/dashboard/optimization-sidebar"
import { ActivityFeed } from "@/components/dashboard/activity-feed"

export default async function DashboardPage() {
  const user = await getAuthenticatedUser()
  
  if (!user?.id) {
    return null
  }
  
  if (!user.onboarding_completed_at) {
    redirect("/onboarding")
  }

  const [applications, stats, activities, trends, keywordGap] = await Promise.all([
    getUserApplicationsWithDetails(user.id).catch(() => []),
    getApplicationStats(user.id).catch(() => ({
      applications: 0,
      optimizations: 0,
      variants: 0,
      avgMatch: 0,
    })),
    getActivityFeed(user.id, 2).catch(() => []),
    getApplicationTrends(user.id).catch(() => ({
      applicationsChange: 0,
      optimizationsChange: 0,
      variantsChange: 0,
      matchChange: 0,
    })),
    getKeywordGap(user.id).catch(() => ({
      missingCount: 0,
      missingKeywords: [],
    })),
  ])

  // Get ATS health status from most recent resume
  let atsHealth = { atsHealthy: true, formattingGood: true }
  if (applications.length > 0) {
    // In production, you'd fetch the actual resume content here
    // For now, we'll use a placeholder
    atsHealth = await getATSHealthStatus("").catch(() => ({
      atsHealthy: true,
      formattingGood: true,
    })) as { atsHealthy: boolean; formattingGood: boolean }
  }

  // Format trend subtitles
  const formatChange = (change: number, suffix: string = "this week") => {
    if (change === 0) return `No change ${suffix}`
    const sign = change > 0 ? "+" : ""
    return `${sign}${change} ${suffix}`
  }

  return (
    <section className="sm:px-6 lg:px-8 pt-6 pr-4 pb-6 pl-4">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">
          Resume optimization
        </h1>
        <p className="mt-1 text-sm text-white/60 font-geist">
          Tailor your resume to each application. Review match scores and improvement suggestions.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Applications"
          value={stats.applications}
          subtitle={formatChange(trends.applicationsChange)}
          icon={Send}
          iconColor="text-emerald-300"
        />
        <KpiCard
          title="Optimizations"
          value={stats.optimizations}
          subtitle={formatChange(trends.optimizationsChange)}
          icon={Wand2}
          iconColor="text-emerald-300"
        />
        <KpiCard
          title="Resume variants"
          value={stats.variants}
          subtitle={formatChange(trends.variantsChange, "new this week")}
          icon={Files}
          iconColor="text-emerald-300"
        />
        <KpiCard
          title="Avg match"
          value={`${stats.avgMatch}%`}
          subtitle={formatChange(trends.matchChange, "vs last week")}
          icon={Gauge}
          iconColor="text-emerald-300"
        />
      </div>

      {/* Main content area */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Applications table (2 columns) */}
        <div className="xl:col-span-2 rounded-xl border border-white/10 bg-white/5">
          <ApplicationsSection applications={applications} />
        </div>

        {/* Optimization sidebar (1 column) */}
        <OptimizationSidebar
          variantCount={stats.variants}
          atsHealthy={atsHealth.atsHealthy}
          formattingGood={atsHealth.formattingGood}
          keywordsNeeded={keywordGap.missingCount}
        />
      </div>

      {/* Activity feed */}
      {activities.length > 0 && <ActivityFeed activities={activities} />}
    </section>
  )
}
