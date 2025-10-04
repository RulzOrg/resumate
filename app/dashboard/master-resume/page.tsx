import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { getMasterResumesWithMetadata, getMasterResumeActivity } from "@/lib/db"
import { MasterResumeList } from "@/components/master-resume/master-resume-list"
import { InsightsSidebar } from "@/components/master-resume/insights-sidebar"

export default async function MasterResumePage() {
  const user = await getAuthenticatedUser()
  
  if (!user?.id) {
    return null
  }
  
  if (!user.onboarding_completed_at) {
    redirect("/onboarding")
  }

  // Fetch all master resumes and activity
  const [resumes, activities] = await Promise.all([
    getMasterResumesWithMetadata(user.id).catch(() => []),
    getMasterResumeActivity(user.id, 10).catch(() => [])
  ])

  return (
    <section className="sm:px-6 lg:px-8 pt-6 pr-4 pb-6 pl-4">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">
          Master resume
        </h1>
        <p className="mt-1 text-sm text-white/60 font-geist">
          Manage multiple resumes. Edit details inline or open a resume in the editor for full control.
        </p>
      </div>

      {/* Full-width app area */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Master Resumes (spans 2) */}
        <MasterResumeList resumes={resumes} />

        {/* Insights / Right Column */}
        <InsightsSidebar resumes={resumes} activities={activities} />
      </div>
    </section>
  )
}
