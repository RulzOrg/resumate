import { auth } from "@clerk/nextjs/server"
// import { getOrCreateUser, getAllCurrentUsage } from "./db" // Removed to break circular dependency
import { pricingTiers, getPricingTier, canUserPerformAction } from "./pricing"
import { getEnv } from "./env"

export type SubscriptionStatus = 
  | 'free' 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'unpaid'

export interface SubscriptionInfo {
  status: SubscriptionStatus
  plan: string
  periodEnd?: Date
  cancelAtPeriodEnd?: boolean
  polarCustomerId?: string
  polarSubscriptionId?: string
}

export interface UsageLimits {
  resumeOptimizations: {
    used: number
    limit: number | 'unlimited'
    canUse: boolean
  }
  jobAnalyses: {
    used: number
    limit: number | 'unlimited'
    canUse: boolean
  }
  resumeVersions: {
    used: number
    limit: number | 'unlimited'
    canUse: boolean
  }
}

/**
 * Get current user's subscription information
 */
export async function getCurrentSubscription(): Promise<SubscriptionInfo | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null

    // Dynamic import to avoid circular dependency
    const { getOrCreateUser } = await import("./db")
    
    let user = await getOrCreateUser()
    if (!user) {
      // Fallback when DB not ready
      return { status: 'free' as const, plan: 'free' }
    }

    // Check if user is whitelisted for unlimited access
    const { WHITELISTED_EMAILS } = getEnv()
    if (user.email && WHITELISTED_EMAILS.includes(user.email.toLowerCase())) {
      return {
        status: 'active',
        plan: 'pro',
        periodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 10)), // 10 years from now
      }
    }

    return {
      status: (user.subscription_status as SubscriptionStatus) || 'free',
      plan: user.subscription_plan || 'free',
      periodEnd: user.subscription_period_end ? new Date(user.subscription_period_end) : undefined,
      polarCustomerId: user.polar_customer_id || undefined,
      polarSubscriptionId: user.polar_subscription_id || undefined,
    }
  } catch (error) {
    console.error('Error getting current subscription:', error)
    return null
  }
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const subscription = await getCurrentSubscription()
  return subscription?.status === 'active' || subscription?.status === 'trialing'
}

/**
 * Check if user can perform a specific action based on their plan limits
 */
export async function canPerformAction(action: 'resumeOptimizations' | 'jobAnalyses' | 'resumeVersions'): Promise<boolean> {
  try {
    const { userId } = await auth()
    if (!userId) return false

    // Dynamic import to avoid circular dependency
    const { getOrCreateUser, getAllCurrentUsage } = await import("./db")

    const user = await getOrCreateUser(userId)
    if (!user) return false

    const subscription = await getCurrentSubscription()
    if (!subscription) return false

    // Get real usage from the database
    const actualUsage = await getAllCurrentUsage(user.id)

    return canUserPerformAction(subscription.plan, actualUsage[action], action)
  } catch (error) {
    console.error('Error checking action permission:', error)
    return false
  }
}

/**
 * Get user's current usage limits and status
 */
export async function getUsageLimits(): Promise<UsageLimits | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null

    // Dynamic import to avoid circular dependency
    const { getOrCreateUser, getAllCurrentUsage } = await import("./db")

    const user = await getOrCreateUser(userId)
    if (!user) return null

    const subscription = await getCurrentSubscription()
    if (!subscription) return null

    const tier = getPricingTier(subscription.plan)
    if (!tier) return null

    // Get real usage from the database
    const actualUsage = await getAllCurrentUsage(user.id)

    return {
      resumeOptimizations: {
        used: actualUsage.resumeOptimizations,
        limit: tier.limits.resumeOptimizations,
        canUse: canUserPerformAction(subscription.plan, actualUsage.resumeOptimizations, 'resumeOptimizations')
      },
      jobAnalyses: {
        used: actualUsage.jobAnalyses,
        limit: tier.limits.jobAnalyses,
        canUse: canUserPerformAction(subscription.plan, actualUsage.jobAnalyses, 'jobAnalyses')
      },
      resumeVersions: {
        used: actualUsage.resumeVersions,
        limit: tier.limits.resumeVersions,
        canUse: canUserPerformAction(subscription.plan, actualUsage.resumeVersions, 'resumeVersions')
      }
    }
  } catch (error) {
    console.error('Error getting usage limits:', error)
    return null
  }
}

/**
 * Check if user is on free plan
 */
export async function isFreePlan(): Promise<boolean> {
  const subscription = await getCurrentSubscription()
  return !subscription || subscription.plan === 'free'
}

/**
 * Check if user is on pro plan or higher
 */
export async function isProPlan(): Promise<boolean> {
  const subscription = await getCurrentSubscription()
  return subscription?.plan === 'pro' || subscription?.plan === 'pro-annual' || isEnterprisePlan()
}

/**
 * Check if user is on enterprise plan
 */
export async function isEnterprisePlan(): Promise<boolean> {
  const subscription = await getCurrentSubscription()
  return subscription?.plan === 'enterprise' || subscription?.plan === 'enterprise-annual'
}

/**
 * Get plan display name and features
 */
export async function getPlanInfo() {
  const subscription = await getCurrentSubscription()
  if (!subscription) return null

  const tier = getPricingTier(subscription.plan)
  if (!tier) return null

  return {
    name: tier.name,
    features: tier.features,
    limits: tier.limits,
    price: tier.price,
    interval: tier.interval
  }
}

/**
 * Format usage display (e.g., "2 of 3" or "2 of unlimited")
 */
export function formatUsage(used: number, limit: number | 'unlimited'): string {
  if (limit === 'unlimited') return `${used} of unlimited`
  return `${used} of ${limit}`
}

/**
 * Get usage percentage for progress bars
 */
export function getUsagePercentage(used: number, limit: number | 'unlimited'): number {
  if (limit === 'unlimited') return 0
  if (typeof limit === 'number') {
    return Math.min((used / limit) * 100, 100)
  }
  return 0
}