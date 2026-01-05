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
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

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
  )
}
