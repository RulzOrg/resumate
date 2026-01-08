export interface PricingFeature {
  text: string
  comingSoon?: boolean
}

export interface PricingTier {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year'
  stripePriceId: string
  features: (string | PricingFeature)[]
  limits: {
    resumeOptimizations: number | 'unlimited'
    jobAnalyses: number | 'unlimited'
    resumeVersions: number | 'unlimited'
    supportLevel: 'community' | 'email' | 'priority' | 'dedicated'
  }
  popular?: boolean
}

// Function to get pricing tiers with runtime environment variables
function getPricingTiers(): PricingTier[] {
  return [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started with AI resume optimization.',
      price: 0,
      currency: 'USD',
      interval: 'month',
      stripePriceId: '', // No Stripe price needed for free tier
      features: [
        '3 resume optimizations / month',
        'Basic job analysis',
        'ATS compatibility check',
        { text: 'Standard templates', comingSoon: true },
        'Export to PDF/Word',
        'Community support'
      ],
      limits: {
        resumeOptimizations: 3,
        jobAnalyses: 5,
        resumeVersions: 3,
        supportLevel: 'community'
      },
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Ideal for active job seekers and career changers.',
      price: 19,
      currency: 'USD',
      interval: 'month',
      stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_1234567890',
      features: [
        'Unlimited resume optimizations',
        'Advanced job analysis',
        'ATS compatibility check',
        { text: 'AI cover letter generator', comingSoon: true },
        { text: 'Premium templates', comingSoon: true },
        'Resume version management',
        'Keyword optimization',
        'Priority email support',
        'Export to PDF/Word/TXT'
      ],
      limits: {
        resumeOptimizations: 'unlimited',
        jobAnalyses: 'unlimited',
        resumeVersions: 'unlimited',
        supportLevel: 'priority'
      },
      popular: true
    }
  ]
}

// Export functions instead of constants to ensure runtime evaluation
export function getAllPricingTiers() {
  return getPricingTiers()
}

// Keep backward compatibility
export const pricingTiers = getAllPricingTiers()
export const annualPricingTiers: PricingTier[] = [] // Deprecated - we only offer monthly pricing now

// Helper functions
export function getPricingTier(tierId: string): PricingTier | undefined {
  return getPricingTiers().find(tier => tier.id === tierId)
}

export function getPricingTierByStripePrice(stripePriceId: string): PricingTier | undefined {
  return getPricingTiers().find(tier => tier.stripePriceId === stripePriceId)
}

// Provider-agnostic resolver for price IDs
export function getPriceIdForProvider(tierId: string, provider: 'stripe' | 'polar'): string | undefined {
  if (provider === 'stripe') {
    return getPricingTier(tierId)?.stripePriceId
  }
  // Polar IDs come from env; we only support Pro tiers for now
  if (tierId === 'pro') return process.env.POLAR_PRICE_PRO_MONTHLY
  if (tierId === 'pro-annual') return process.env.POLAR_PRICE_PRO_YEARLY
  return undefined
}

export function isFeatureAvailable(userPlan: string, feature: keyof PricingTier['limits']): boolean {
  const tier = getPricingTier(userPlan)
  if (!tier) return false

  const val = tier.limits[feature] as unknown
  if (val === 'unlimited') return true
  if (typeof val === 'number') return val > 0
  return false
}

export function canUserPerformAction(
  userPlan: string, 
  currentUsage: number, 
  action: keyof PricingTier['limits']
): boolean {
  const tier = getPricingTier(userPlan)
  if (!tier) return false
  
  const limit = tier.limits[action]
  if (limit === 'unlimited') return true
  if (typeof limit === 'number') return currentUsage < limit
  
  return false
}

// Format price for display
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(price)
}

// Calculate savings for annual plans
export function calculateAnnualSavings(monthlyPrice: number): { savings: number, percentage: number } {
  const annualMonthlyEquivalent = monthlyPrice * 12
  const annualPrice = monthlyPrice * 10 // 2 months free
  const savings = annualMonthlyEquivalent - annualPrice
  const percentage = Math.round((savings / annualMonthlyEquivalent) * 100)
  
  return { savings, percentage }
}