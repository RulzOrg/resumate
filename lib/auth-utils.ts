import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrCreateUser as getOrCreateUserRecord } from "./db"
import { currentUser } from "@clerk/nextjs/server"

export async function getAuthenticatedUser() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/auth/login")
  }

  const dbUser = await getOrCreateUserRecord()
  if (!dbUser) {
    // DB not ready: synthesize minimal user from Clerk so dashboard can render
    const cUser = await currentUser()
    return {
      id: userId,
      clerkId: userId,
      email: cUser?.emailAddresses?.[0]?.emailAddress || "",
      name: cUser?.fullName || cUser?.firstName || cUser?.username || "User",
      subscription_status: "free",
      subscription_plan: "free",
      subscription_period_end: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  return {
    id: dbUser.id,
    clerkId: userId,
    email: dbUser.email,
    name: dbUser.name,
    subscription_status: dbUser.subscription_status,
    subscription_plan: dbUser.subscription_plan,
    subscription_period_end: dbUser.subscription_period_end,
    onboarding_completed_at: dbUser.onboarding_completed_at,
    created_at: dbUser.created_at,
    updated_at: dbUser.updated_at,
  }
}

export async function requireAuth() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/auth/login")
  }

  return userId
}

export async function getOrCreateUser() {
  return getOrCreateUserRecord()
}
