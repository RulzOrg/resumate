import { getAuthenticatedUser } from "@/lib/user-data"
import { getUserResumes, getUserOptimizedResumes } from "@/lib/db"
import { getInProgressSessions } from "@/lib/db/optimization-sessions"
import { getCurrentSubscription, getUsageLimits } from "@/lib/subscription"
import { AccountStatusCard } from "@/components/dashboard/AccountStatusCard"
import { MasterResumesSection } from "@/components/dashboard/MasterResumesSection"
import { GettingStartedCard } from "@/components/dashboard/getting-started-card"
import { DashboardClient } from "./dashboard-client"

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
    inProgressSessions,
  ] = await Promise.all([
    getUserResumes(user.id).catch(() => [] as any[]),
    getUserOptimizedResumes(user.id).catch(() => [] as any[]),
    getCurrentSubscription().catch(() => null),
    getUsageLimits().catch(() => null),
    getInProgressSessions(user.id, 5).catch(() => []),
  ])

  return (
    <main className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl tracking-tight font-space-grotesk font-semibold">Dashboard</h1>
          <p className="mt-1 text-base text-foreground/60 dark:text-white/60">Welcome back, {user.name}. Let's land your next job.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <DashboardClient
              resumes={resumes}
              optimizedResumes={optimizedResumes}
              inProgressSessions={inProgressSessions}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-8 mt-8 lg:mt-0">
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
