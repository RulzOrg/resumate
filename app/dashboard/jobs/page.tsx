import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import {
  getJobStats,
  getJobsWithDetails,
  getTopKeywords,
  getJobActivity,
} from "@/lib/db"
import { JobsKpiSection } from "@/components/jobs/jobs-kpi-section"
import { JobsTableSection } from "@/components/jobs/jobs-table-section"
import { JobInsightsSidebar } from "@/components/jobs/job-insights-sidebar"
import { JobsActivityFeed } from "@/components/jobs/jobs-activity-feed"

export default async function JobsPage() {
  const user = await getAuthenticatedUser()

  if (!user?.id) {
    return null
  }

  if (!user.onboarding_completed_at) {
    redirect("/onboarding")
  }

  const [stats, jobs, topKeywords, activity] = await Promise.all([
    getJobStats(user.id).catch(() => ({
      jobsSaved: 0,
      cvsGenerated: 0,
      keywordsExtracted: 0,
      avgMatch: 0,
    })),
    getJobsWithDetails(user.id).catch(() => []),
    getTopKeywords(user.id, 3).catch(() => []),
    getJobActivity(user.id, 2).catch(() => []),
  ])

  return (
    <section className="sm:px-6 lg:px-8 pt-6 pr-4 pb-6 pl-4">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">
          Jobs
        </h1>
        <p className="mt-1 text-sm text-white/60 font-geist">
          Jobs you've added. Review match scores, extracted keywords, and generate a CV tailored to each job.
        </p>
      </div>

      {/* KPIs */}
      <JobsKpiSection stats={stats} />

      {/* Main content area */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Jobs table (2 columns) */}
        <div className="xl:col-span-2">
          <JobsTableSection jobs={jobs} />
        </div>

        {/* Sidebar panel (right) */}
        <JobInsightsSidebar topKeywords={topKeywords} avgMatch={stats.avgMatch} />
      </div>

      {/* Activity */}
      <JobsActivityFeed activities={activity} />
    </section>
  )
}
