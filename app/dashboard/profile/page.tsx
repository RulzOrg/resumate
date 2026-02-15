import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrCreateUser, getUserResumes, getUserOptimizedResumes, getUserJobAnalyses } from "@/lib/db"
import { getCurrentSubscription, getUsageLimits } from "@/lib/subscription"
import { ProfileClient } from "./profile-client"

export const metadata = {
  title: "Profile | Useresumate",
  description: "Manage your profile, resumes, and job application history",
}

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/auth/login")
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
  const userImageUrl = clerkUser?.imageUrl || null

  // Fetch all user data in parallel
  const [resumes, optimizedResumes, jobAnalyses, subscription, usageLimits] = await Promise.all([
    getUserResumes(user.id).catch(() => []),
    getUserOptimizedResumes(user.id).catch(() => []),
    getUserJobAnalyses(user.id).catch(() => []),
    getCurrentSubscription().catch(() => null),
    getUsageLimits().catch(() => null),
  ])

  // Separate master/uploaded resumes from generated ones
  const masterResumes = resumes.filter(r => r.kind === 'master' || r.kind === 'uploaded')

  return (
    <main className="py-5 sm:py-6">
      <div className="px-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">Profile</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Manage your profile, resumes, and track your job application history
          </p>
        </div>

        <ProfileClient
          user={{
            id: user.id,
            name: userName,
            email: userEmail,
            imageUrl: userImageUrl,
            avatarUrl: user.avatar_url || null,
            createdAt: user.created_at,
          }}
          subscription={subscription}
          usageLimits={usageLimits}
          masterResumes={masterResumes}
          optimizedResumes={optimizedResumes}
          jobAnalyses={jobAnalyses}
        />
      </div>
    </main>
  )
}
