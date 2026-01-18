import { getAuthenticatedUser } from "@/lib/user-data"
import { getUserResumes } from "@/lib/db"
import { OptimizeFlowWizard } from "@/components/optimize-flow/OptimizeFlowWizard"

export default async function OptimizeFlowPage() {
  const user = await getAuthenticatedUser()
  if (!user?.id) {
    return null
  }

  const resumes = await getUserResumes(user.id).catch(() => [] as any[])

  // Filter to only completed master/uploaded resumes
  const completedResumes = resumes.filter(
    (r: any) =>
      r.processing_status === "completed" &&
      (r.kind === "master" || r.kind === "uploaded")
  )

  return (
    <main className="py-8 sm:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl tracking-tight font-space-grotesk font-semibold">
            Resume Optimization Flow
          </h1>
          <p className="mt-1 text-base text-foreground/60 dark:text-white/60">
            Optimize your resume in 4 steps: Analyze, Rewrite, Scan, and Prepare
          </p>
        </div>

        <OptimizeFlowWizard resumes={completedResumes} />
      </div>
    </main>
  )
}
