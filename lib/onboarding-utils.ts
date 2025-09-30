import { auth } from "@clerk/nextjs/server"
import { getUserByClerkId, markUserOnboardingComplete } from "./db"

/**
 * Check if the authenticated user needs to complete onboarding
 * @returns true if user needs onboarding, false if already completed
 */
export async function needsOnboarding(): Promise<boolean> {
  const { userId } = await auth()
  
  if (!userId) {
    return false
  }

  const user = await getUserByClerkId(userId)
  
  if (!user) {
    // User doesn't exist in DB yet, needs onboarding
    return true
  }

  // User needs onboarding if onboarding_completed_at is NULL
  return !user.onboarding_completed_at
}

/**
 * Mark the authenticated user's onboarding as complete
 */
export async function completeOnboarding(): Promise<void> {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error("User not authenticated")
  }

  const user = await getUserByClerkId(userId)
  
  if (!user) {
    throw new Error("User not found")
  }

  await markUserOnboardingComplete(user.id)
}

/**
 * Check if a specific user has completed onboarding
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const user = await getUserByClerkId(userId)
  
  if (!user) {
    return false
  }

  return !!user.onboarding_completed_at
}
