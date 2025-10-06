import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { getOptimizedResumeById, getResumeById } from "@/lib/db"
import { OptimizedDetailView } from "@/components/optimization/OptimizedDetailView"

export default async function OptimizedDetailPage({ params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) redirect("/auth/login")

  const optimized = await getOptimizedResumeById(params.id, user.id)
  if (!optimized) redirect("/dashboard/optimized")

  const original = await getResumeById(optimized.original_resume_id, user.id)

  return (
    <section className="sm:px-6 lg:px-8 pt-6 pr-4 pb-6 pl-4">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">
          Optimized Resume
        </h1>
        <p className="mt-1 text-sm text-white/60 font-geist">
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
    </section>
  )
}
