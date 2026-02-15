import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrCreateUser } from "@/lib/db"
import { getCurrentSubscription, getUsageLimits } from "@/lib/subscription"
import { SettingsClient } from "./settings-client"

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
    <main className="py-5 sm:py-6">
      <div className="px-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">Settings</h1>
          <p className="mt-1 text-base text-muted-foreground">Manage your account, subscription, and preferences</p>
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
