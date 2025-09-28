import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrCreateUser, ensureUserSyncRecord } from "./db"

export async function getSession() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/auth/login")
  }

  const dbUser = await getOrCreateUser(userId)

  if (!dbUser) {
    redirect("/auth/login")
  }

  // Harden FK integrity: ensure users_sync row exists by id even if created via other flows
  await ensureUserSyncRecord({
    id: dbUser.id,
    clerkUserId: dbUser.clerk_user_id,
    email: dbUser.email,
    name: dbUser.name,
    subscription_plan: dbUser.subscription_plan,
    subscription_status: dbUser.subscription_status,
  })

  return {
    userId: dbUser.id,
    clerkId: userId,
    email: dbUser.email,
    name: dbUser.name,
    subscriptionStatus: dbUser.subscription_status,
    subscriptionPlan: dbUser.subscription_plan,
  }
}

export async function requireAuth() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/auth/login")
  }

  return userId
}
