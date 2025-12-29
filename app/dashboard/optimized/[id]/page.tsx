import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/user-data"
import { getOptimizedResumeById, getResumeById } from "@/lib/db"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
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
    
    original = await getResumeById(optimized.original_resume_id, user.id)
  } catch (error) {
    console.error(`[Resume Detail] Error loading resume:`, error)
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user as any} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Optimized Resume</h1>
          <p className="text-muted-foreground text-sm">
            For {optimized.job_title}{optimized.company_name ? ` at ${optimized.company_name}` : ''}
          </p>
        </div>
        <ResumeViewerV2
          optimizedId={optimized.id}
          title={optimized.title}
          optimizedContent={optimized.optimized_content}
          matchScore={optimized.match_score}
        />
      </main>
    </div>
  )
}
