import { redirect } from "next/navigation"
import { auth, clerkClient } from "@clerk/nextjs/server"

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { getMasterResume, getOrCreateUser, getUserJobTargets } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/auth/login")
  }

  const user = await getOrCreateUser(userId)
  if (!user) {
    redirect("/auth/login")
  }

  const [clerkUser, masterResume, jobTargets] = await Promise.all([
    clerkClient.users.getUser(userId).catch(() => null),
    getMasterResume(user.id),
    getUserJobTargets(user.id),
  ])

  const displayName =
    clerkUser?.firstName?.trim() ||
    (user.name ? user.name.split(" ")[0] : "")

  return (
    <OnboardingFlow
      userName={displayName}
      hasMasterResume={Boolean(masterResume)}
      masterResumeTitle={masterResume?.title}
      initialJobTargets={jobTargets}
    />
  )
}
