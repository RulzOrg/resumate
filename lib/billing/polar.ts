import { NextRequest, NextResponse } from 'next/server'

export function isPolarConfigured(): boolean {
  return Boolean(process.env.POLAR_API_KEY)
}

export function getPolarPriceIdForPlan(planId: string): string | undefined {
  if (planId === 'pro') return process.env.POLAR_PRICE_PRO_MONTHLY
  if (planId === 'pro-annual') return process.env.POLAR_PRICE_PRO_YEARLY
  return undefined
}

export function getPolarHostedCheckoutUrlForPlan(planId: string): string | undefined {
  if (planId === 'pro') return process.env.POLAR_CHECKOUT_URL_PRO_MONTHLY
  if (planId === 'pro-annual') return process.env.POLAR_CHECKOUT_URL_PRO_YEARLY
  return undefined
}

// Placeholder implementation until full Polar API integration is added.
// If hosted checkout URLs are provided via env, we use them. Otherwise, we return 501 instructing configuration.
export async function createPolarCheckoutSession(params: {
  planId?: string
  priceId?: string
  successUrl: string
  cancelUrl: string
  clerkUserId: string
  request: NextRequest
}) {
  const { planId, priceId, successUrl, cancelUrl } = params

  // Prefer hosted checkout URLs if provided
  if (planId) {
    const hosted = getPolarHostedCheckoutUrlForPlan(planId)
    if (hosted) {
      return NextResponse.json({ url: hosted })
    }
  }

  // If a priceId is present and API key configured, this is where a server-to-server Polar API call would be made.
  if (priceId && isPolarConfigured()) {
    // TODO: Implement Polar API call to create checkout session
    return NextResponse.json({ 
      error: 'Polar API checkout creation not yet implemented. Provide POLAR_CHECKOUT_URL_* envs as a temporary workaround.' 
    }, { status: 501 })
  }

  return NextResponse.json({
    error: 'Polar billing not fully configured. Set POLAR_API_KEY and either POLAR_CHECKOUT_URL_* or allow server API integration.'
  }, { status: 503 })
}

export async function createPolarPortalSession(params: {
  returnUrl: string
  clerkUserId: string
}) {
  const url = process.env.POLAR_PORTAL_URL
  if (url) {
    return NextResponse.json({ url })
  }
  return NextResponse.json({
    error: 'Polar portal not configured. Set POLAR_PORTAL_URL or implement server-side portal creation.'
  }, { status: 503 })
}
