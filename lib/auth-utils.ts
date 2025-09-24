import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrCreateUser as getOrCreateUserRecord } from "./db"

export async function getAuthenticatedUser() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/auth/login")
  }

  const dbUser = await getOrCreateUserRecord()

  if (!dbUser) {
    redirect("/auth/login")
  }

  return {
    id: dbUser.id,
    clerkId: userId,
    email: dbUser.email,
    name: dbUser.name,
    subscription_status: dbUser.subscription_status,
    subscription_plan: dbUser.subscription_plan,
    subscription_period_end: dbUser.subscription_period_end,
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
