import { Suspense } from "react"
import { getSession } from "@/lib/auth"
import { getUserById } from "@/lib/db"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ResumeVersionManager } from "@/components/versions/resume-version-manager"

export default async function VersionsPage() {
  const session = await getSession()
  if (!session) {
    redirect("/auth/login")
  }

  const user = await getUserById(session.userId)
  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Resume Versions</h1>
          <p className="text-muted-foreground">Manage and compare all your resume versions in one place</p>
        </div>

        <Suspense fallback={<div>Loading versions...</div>}>
          <ResumeVersionManager userId={session.userId} />
        </Suspense>
      </main>
    </div>
  )
}
