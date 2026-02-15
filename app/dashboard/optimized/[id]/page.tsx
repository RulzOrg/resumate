import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/user-data"
import { getOptimizedResumeById, getResumeById } from "@/lib/db"
import { ResumeViewerV2 } from "@/components/optimization/ResumeViewerV2"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OptimizedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser()
  if (!user) redirect("/auth/login")

  const { id } = await params

  let optimized
  let original

  try {
    optimized = await getOptimizedResumeById(id, user.id)

    if (!optimized) {
      console.error(`[Resume Detail] Optimized resume not found: ${id}`)
      redirect("/dashboard")
    }

    original = await getResumeById(optimized.original_resume_id, user.id)
  } catch (error) {
    console.error(`[Resume Detail] Error loading resume:`, error)
    redirect("/dashboard")
  }

  return (
    <main className="py-5 sm:py-6">
      <div className="px-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">Optimized Resume</h1>
          <p className="mt-1 text-base text-muted-foreground">
            For {optimized.job_title}{optimized.company_name ? ` at ${optimized.company_name}` : ''}
          </p>
        </div>
        <ResumeViewerV2
          optimizedId={optimized.id}
          title={optimized.title}
          optimizedContent={optimized.optimized_content}
          structuredOutput={optimized.structured_output}
          revisionToken={optimized.updated_at}
          matchScore={optimized.match_score}
          optimizationSummary={optimized.optimization_summary}
          jobTitle={optimized.job_title}
          companyName={optimized.company_name}
          jobDescription={optimized.job_description}
        />
      </div>
    </main>
  )
}
