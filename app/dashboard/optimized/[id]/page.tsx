import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { getOptimizedResumeById, getResumeById } from "@/lib/db"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { OptimizedDetailView } from "@/components/optimization/OptimizedDetailView"

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
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user as any} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Optimized Resume</h1>
          <p className="text-muted-foreground text-sm">
            For {optimized.job_title}{optimized.company_name ? ` at ${optimized.company_name}` : ''}
          </p>
        </div>
        <OptimizedDetailView
          optimizedId={optimized.id}
          title={optimized.title}
          optimizedContent={optimized.optimized_content}
          originalContent={original?.content_text || ''}
          matchScore={optimized.match_score}
        />
      </main>
    </div>
  )
}
