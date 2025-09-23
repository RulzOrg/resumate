import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrCreateUser } from "./db"

export async function getSession() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/auth/login")
  }

  const dbUser = await getOrCreateUser()

  if (!dbUser) {
    redirect("/auth/login")
  }

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
