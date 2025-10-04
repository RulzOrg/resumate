import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { BarChart3 } from "lucide-react"

export default async function ReportsPage() {
  const user = await getAuthenticatedUser()
  
  if (!user?.id) {
    return null
  }
  
  if (!user.onboarding_completed_at) {
    redirect("/onboarding")
  }

  return (
    <section className="sm:px-6 lg:px-8 pt-6 pr-4 pb-6 pl-4">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">
          Reports & Analytics
        </h1>
        <p className="mt-1 text-sm text-white/60 font-geist">
          Track your application performance and optimization metrics.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-white/5 mb-4">
            <BarChart3 className="h-6 w-6 text-white/80" />
          </div>
          <h3 className="text-lg font-medium text-white/90 font-geist mb-2">Reports Coming Soon</h3>
          <p className="text-sm text-white/60 font-geist">
            Detailed analytics and insights about your job applications will be available here.
          </p>
        </div>
      </div>
    </section>
  )
}
