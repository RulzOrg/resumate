import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrCreateUser } from "@/lib/db"
import { getCurrentSubscription, getUsageLimits } from "@/lib/subscription"
import { SettingsClient } from "./settings-client"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

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
    <main className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white transition-colors mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
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
  )
}
