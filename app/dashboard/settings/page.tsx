import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrCreateUser } from "@/lib/db"
import { getCurrentSubscription, getUsageLimits } from "@/lib/subscription"
import { SettingsClient } from "./settings-client"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import Link from "next/link"

export const metadata = {
  title: "Settings | AI Resume Optimizer",
  description: "Manage your account settings and subscription",
}

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  const user = await getOrCreateUser()
  if (!user) {
    redirect("/dashboard")
  }

  const clerkUser = await currentUser()
  const userEmail = clerkUser?.emailAddresses?.find(
    (email) => email.id === clerkUser.primaryEmailAddressId
  )?.emailAddress || ""
  const userName = clerkUser?.fullName || clerkUser?.firstName || "User"

  const subscription = await getCurrentSubscription()
  const usageLimits = await getUsageLimits()

  return (
    <div className="antialiased text-foreground bg-background font-geist min-h-screen">
      <div className="absolute top-0 left-0 w-full h-[400px] -z-10 gradient-blur" />

      <DashboardHeader user={user as any} />

      <main className="py-8 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl tracking-tight font-space-grotesk font-semibold">Settings</h1>
            <p className="mt-1 text-base text-foreground/60 dark:text-white/60">Manage your account, subscription, and preferences</p>
          </div>

          <SettingsClient
            user={{
              id: user.id,
              name: userName,
              email: userEmail,
            }}
            subscription={subscription}
            usageLimits={usageLimits}
          />
        </div>
      </main>

      <footer className="border-t border-border dark:border-white/20 mt-16">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-foreground/50 dark:text-white/50">&copy; {new Date().getFullYear()} ResuMate AI</p>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                Dashboard
              </Link>
              <Link href="/pricing" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                Pricing
              </Link>
              <Link href="/terms" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                Terms
              </Link>
              <Link href="/privacy" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                Privacy
              </Link>
              <Link href="/support" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
