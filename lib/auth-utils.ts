import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getUserByClerkId, createUserFromClerk } from "./db"

export async function getAuthenticatedUser() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/auth/login")
  }

  const user = await currentUser()

  let dbUser = await getUserByClerkId(userId)

  if (!dbUser && user) {
    // Create user in our database if they don't exist
    dbUser = await createUserFromClerk(
      userId,
      user.emailAddresses[0]?.emailAddress || "",
      user.fullName || user.firstName || "User",
    )
  }

  return {
    id: dbUser?.id || userId,
    clerkId: userId,
    email: user?.emailAddresses[0]?.emailAddress || "",
    name: user?.fullName || user?.firstName || "User",
    subscriptionStatus: dbUser?.subscription_status || "free",
    subscriptionPlan: dbUser?.subscription_plan || "free",
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
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const user = await currentUser()
  let dbUser = await getUserByClerkId(userId)

  if (!dbUser && user) {
    dbUser = await createUserFromClerk(
      userId,
      user.emailAddresses[0]?.emailAddress || "",
      user.fullName || user.firstName || "User",
    )
  }

  return dbUser
}
