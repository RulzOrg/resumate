import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getUserById, getUserResumes, getUserJobAnalyses } from "@/lib/db"
import { canPerformAction, getUsageLimits } from "@/lib/subscription"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import OptimizerUiOnly from "@/components/optimization/optimizer-ui-only"

export default async function OptimizePage() {
  const session = await getSession()
  if (!session) {
    redirect("/auth/login")
  }

  const user = await getUserById(session.userId)
  if (!user) {
    redirect("/auth/login")
  }

  // Existing data fetches are not required for the UI-only mock, but we keep session validation above.

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />

      <main className="py-8">
        <OptimizerUiOnly />
      </main>
    </div>
  )
}
