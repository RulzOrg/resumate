import { getAuthenticatedUser } from "@/lib/user-data"
import { getUserResumes, getUserOptimizedResumes } from "@/lib/db"
import { getCurrentSubscription, getUsageLimits } from "@/lib/subscription"
import { GeneratedResumesCompactList } from "@/components/optimization/GeneratedResumesCompactList"
import Link from "next/link"
import { AccountStatusCard } from "@/components/dashboard/AccountStatusCard"
import { MasterResumesSection } from "@/components/dashboard/MasterResumesSection"
import { QuickOptimizeForm } from "@/components/dashboard/QuickOptimizeForm"
import { GettingStartedCard } from "@/components/dashboard/getting-started-card"

export default async function DashboardPage() {
  const user = await getAuthenticatedUser()
  if (!user?.id) {
    return null
  }

  const [
    resumes,
    optimizedResumes,
    subscription,
    usageLimits,
  ] = await Promise.all([
    getUserResumes(user.id).catch(() => [] as any[]),
    getUserOptimizedResumes(user.id).catch(() => [] as any[]),
    getCurrentSubscription().catch(() => null),
    getUsageLimits().catch(() => null),
  ])

  return (
    <main className="py-5 sm:py-6">
      <div className="px-6">
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back, {user.name}. Let's land your next job.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-5">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Quick Optimize Section */}
            <div className="rounded-2xl border border-border bg-surface-subtle p-4 sm:p-5">
              <h2 className="text-lg font-medium tracking-tight font-space-grotesk mb-4">Quick Optimize</h2>
              <QuickOptimizeForm resumes={resumes} />
            </div>

            {/* Optimized Resumes */}
            {optimizedResumes.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface-subtle p-4 sm:p-5">
                <h2 className="text-lg font-medium tracking-tight font-space-grotesk mb-4">Optimized Resumes</h2>
                <GeneratedResumesCompactList resumes={optimizedResumes.slice(0, 5)} limit={5} />
                {optimizedResumes.length > 5 && (
                  <div className="mt-4 text-center">
                    <Link
                      href="/dashboard/optimized"
                      className="text-sm text-primary hover:text-primary/90"
                    >
                      View all {optimizedResumes.length} optimized resumes →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5 mt-5 lg:mt-0">
            {/* Getting Started Card - shows for new users */}
            {!user.getting_started_dismissed_at && (
              <GettingStartedCard
                hasResume={resumes.length > 0}
                hasOptimized={optimizedResumes.length > 0}
                currentResumeCount={resumes.length}
              />
            )}

            <AccountStatusCard
              plan={subscription?.plan || 'free'}
              status={subscription?.status || 'free'}
              periodEnd={subscription?.periodEnd?.toISOString()}
              jobAnalyses={usageLimits?.jobAnalyses?.used ?? 0}
              optimizedResumes={usageLimits?.resumeOptimizations?.used ?? optimizedResumes.length}
              usageLimits={usageLimits || undefined}
            />

            <MasterResumesSection resumes={resumes} />
          </div>
        </div>
      </div>
    </main>
  )
}
