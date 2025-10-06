import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import {
  getOrCreateUserProfile,
  getUserSubscriptionUsage,
} from "@/lib/db"
import { getBillingProvider } from "@/lib/billing/config"
import { SettingsTabs } from "@/components/settings/settings-tabs"
import { PlanSummarySidebar } from "@/components/settings/plan-summary-sidebar"

export default async function SettingsPage() {
  const user = await getAuthenticatedUser()
  
  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent('/dashboard/settings')}`)
  }
  
  if (!user.onboarding_completed_at) {
    redirect("/onboarding")
  }

  // Fetch all necessary data
  const [profile, usage, billingProvider] = await Promise.all([
    getOrCreateUserProfile(user.clerkId, user.id).catch(() => null),
    getUserSubscriptionUsage(user.id).catch(() => ({
      jobs_saved: 0,
      cvs_generated: 0,
      ai_credits: 0,
      period_start: new Date().toISOString(),
    })),
    Promise.resolve(getBillingProvider()),
  ])

  return (
    <section className="sm:px-6 lg:px-8 pt-6 pr-4 pb-6 pl-4">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">
          Settings
        </h1>
        <p className="mt-1 text-sm text-white/60 font-geist">
          Manage your account, subscription, and security preferences.
        </p>
      </div>

      {/* Main content */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Settings tabs (2 columns) */}
        <div className="xl:col-span-2">
          <SettingsTabs
            user={user}
            profile={profile}
            usage={usage}
            billingProvider={billingProvider}
          />
        </div>

        {/* Sidebar (1 column) */}
        <PlanSummarySidebar user={user} />
      </div>
    </section>
  )
}
