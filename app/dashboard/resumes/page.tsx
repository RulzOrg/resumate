import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import {
  getResumeStats,
  getResumesWithDetails,
  getTopResumesRoles,
  getResumeActivity,
  getResumeTrends,
} from "@/lib/db"
import { ResumesKpiSection } from "@/components/resumes/resumes-kpi-section"
import { ResumesTableSection } from "@/components/resumes/resumes-table-section"
import { ResumeInsightsSidebar } from "@/components/resumes/resume-insights-sidebar"
import { ResumesActivityFeed } from "@/components/resumes/resumes-activity-feed"

export default async function ResumesPage() {
  const user = await getAuthenticatedUser()
  
  if (!user?.id) {
    redirect("/login")
  }
  
  if (!user.onboarding_completed_at) {
    redirect("/onboarding")
  }

  const [stats, resumes, topRoles, activity, resumeTrends] = await Promise.all([
    getResumeStats(user.id).catch(() => ({
      resumesSaved: 0,
      pdfExports: 0,
      editsMade: 0,
      avgScore: 0,
    })),
    getResumesWithDetails(user.id).catch(() => []),
    getTopResumesRoles(user.id, 3).catch(() => []),
    getResumeActivity(user.id, 2).catch(() => []),
    getResumeTrends(user.id).catch(() => ({
      resumesSavedChange: 0,
      pdfExportsChange: 0,
      editsMadeChange: 0,
      avgScoreChange: 0,
    })),
  ])

  return (
    <section className="sm:px-6 lg:px-8 pt-6 pr-4 pb-6 pl-4">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">
          Resumes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground font-geist">
          Resumes you've generated. Review scores, edit, and export PDFs tailored to each job.
        </p>
      </div>

      {/* KPIs */}
      <ResumesKpiSection stats={stats} trends={resumeTrends} />

      {/* Main content area */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Resumes table (2 columns) */}
        <div className="xl:col-span-2">
          <ResumesTableSection resumes={resumes} />
        </div>

        {/* Sidebar panel (right) */}
        <ResumeInsightsSidebar topRoles={topRoles} avgScore={stats.avgScore} />
      </div>

      {/* Activity */}
      <ResumesActivityFeed activities={activity} />
    </section>
  )
}
