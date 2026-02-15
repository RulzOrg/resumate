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

    // Debug: Log the optimized content length and preview
    console.log(`[Resume Detail] Loading optimized resume:`, {
      id: optimized.id,
      title: optimized.title,
      contentLength: optimized.optimized_content?.length || 0,
      contentPreview: optimized.optimized_content?.slice(0, 200) || 'EMPTY',
      userId: user.id,
    })

    // Debug: Log optimization_summary to diagnose Agent panel data
    console.log(`[Resume Detail] optimization_summary:`, {
      isNull: optimized.optimization_summary === null,
      isUndefined: optimized.optimization_summary === undefined,
      keys: optimized.optimization_summary ? Object.keys(optimized.optimization_summary) : [],
      changes_made_count: optimized.optimization_summary?.changes_made?.length ?? 'MISSING',
      keywords_added_count: optimized.optimization_summary?.keywords_added?.length ?? 'MISSING',
      skills_highlighted_count: optimized.optimization_summary?.skills_highlighted?.length ?? 'MISSING',
      sections_improved_count: optimized.optimization_summary?.sections_improved?.length ?? 'MISSING',
      recommendations_count: optimized.optimization_summary?.recommendations?.length ?? 'MISSING',
      match_score_before: optimized.optimization_summary?.match_score_before ?? 'MISSING',
      match_score_after: optimized.optimization_summary?.match_score_after ?? 'MISSING',
    })

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
