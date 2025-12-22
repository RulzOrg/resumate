import { getAuthenticatedUser } from "@/lib/auth-utils"
import { getUserResumes, getUserOptimizedResumes } from "@/lib/db"
import { getCurrentSubscription, getUsageLimits } from "@/lib/subscription"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { GeneratedResumesCompactList } from "@/components/optimization/GeneratedResumesCompactList"
import Link from "next/link"
import { AccountStatusCard } from "@/components/dashboard/AccountStatusCard"
import { MasterResumesSection } from "@/components/dashboard/MasterResumesSection"
import { QuickOptimizeForm } from "@/components/dashboard/QuickOptimizeForm"

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
    <div className="antialiased text-foreground bg-background font-geist min-h-screen">
      <div className="absolute top-0 left-0 w-full h-[400px] -z-10 gradient-blur"></div>

      <DashboardHeader user={user as any} />

      <main className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl tracking-tight font-space-grotesk font-semibold">Dashboard</h1>
            <p className="mt-1 text-base text-foreground/60 dark:text-white/60">Welcome back, {user.name}. Let's land your next job.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Optimize Section */}
              <div className="rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8">
                <h2 className="text-xl font-medium tracking-tight font-space-grotesk mb-6">Quick Optimize</h2>
                <QuickOptimizeForm resumes={resumes} />
              </div>

              {/* Optimized Resumes */}
              {optimizedResumes.length > 0 && (
                <div className="rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8">
                  <h2 className="text-xl font-medium tracking-tight font-space-grotesk mb-6">Optimized Resumes</h2>
                  <GeneratedResumesCompactList resumes={optimizedResumes.slice(0, 5)} limit={5} />
                  {optimizedResumes.length > 5 && (
                    <div className="mt-4 text-center">
                      <Link 
                        href="/dashboard/optimized" 
                        className="text-sm text-emerald-500 hover:text-emerald-400"
                      >
                        View all {optimizedResumes.length} optimized resumes →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8 mt-8 lg:mt-0">
              <AccountStatusCard
                plan={subscription?.plan || 'free'}
                status={subscription?.status || 'free'}
                periodEnd={subscription?.periodEnd?.toISOString()}
                jobAnalyses={0}
                optimizedResumes={optimizedResumes.length}
                usageLimits={usageLimits || undefined}
              />

              <MasterResumesSection resumes={resumes} />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border dark:border-white/10 mt-16">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-foreground/50 dark:text-white/50">© {new Date().getFullYear()} ResuMate AI</p>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/settings" className="text-sm text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white">
                Settings
              </Link>
              <Link href="/pricing" className="text-sm text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white">
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
