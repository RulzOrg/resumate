import { NextRequest, NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'

let polarClient: Polar | null = null

function getPolarClient(): Polar | null {
  if (!process.env.POLAR_API_KEY) {
    return null
  }

  if (!polarClient) {
    polarClient = new Polar({
      accessToken: process.env.POLAR_API_KEY,
      server: process.env.POLAR_SERVER || 'production' // 'production' or 'sandbox'
    })
  }

  return polarClient
}

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

// Create a checkout session using the Polar API
export async function createPolarCheckoutSession(params: {
  planId?: string
  priceId?: string
  successUrl: string
  cancelUrl: string
  clerkUserId: string
  request: NextRequest
}) {
  const { planId, priceId, successUrl, cancelUrl, clerkUserId } = params

  // Prefer hosted checkout URLs if provided (for quick setup)
  if (planId) {
    const hosted = getPolarHostedCheckoutUrlForPlan(planId)
    if (hosted) {
      // Append user metadata to the URL if possible
      const url = new URL(hosted)
      url.searchParams.set('metadata[clerk_user_id]', clerkUserId)
      url.searchParams.set('success_url', successUrl)
      return NextResponse.json({ url: url.toString() })
    }
  }

  // Use Polar API to create a checkout session
  const polar = getPolarClient()
  if (!polar) {
    return NextResponse.json({
      error: 'Polar billing not configured. Please set POLAR_API_KEY environment variable.'
    }, { status: 503 })
  }

  // Determine the price ID to use
  const finalPriceId = priceId || (planId ? getPolarPriceIdForPlan(planId) : undefined)

  if (!finalPriceId) {
    return NextResponse.json({
      error: 'No price ID specified for checkout. Please provide either a planId or priceId.'
    }, { status: 400 })
  }

  try {
    // Create checkout session with Polar API
    const checkoutSession = await polar.checkouts.custom.create({
      productPriceId: finalPriceId,
      successUrl: successUrl,
      metadata: {
        clerk_user_id: clerkUserId,
      }
    })

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id
    })
  } catch (error: any) {
    console.error('Failed to create Polar checkout session:', error)

    // Fallback to hosted URLs if API fails but hosted URLs are configured
    if (planId) {
      const hosted = getPolarHostedCheckoutUrlForPlan(planId)
      if (hosted) {
        return NextResponse.json({ url: hosted })
      }
    }

    return NextResponse.json({
      error: error.message || 'Failed to create checkout session'
    }, { status: 500 })
  }
}

export async function createPolarPortalSession(params: {
  returnUrl: string
  clerkUserId: string
}) {
  // First check if a static portal URL is configured
  const staticUrl = process.env.POLAR_PORTAL_URL
  if (staticUrl) {
    // Append return URL if possible
    const url = new URL(staticUrl)
    url.searchParams.set('return_url', params.returnUrl)
    return NextResponse.json({ url: url.toString() })
  }

  // Use Polar API to create a customer portal session
  const polar = getPolarClient()
  if (!polar) {
    return NextResponse.json({
      error: 'Polar portal not configured. Set POLAR_API_KEY or POLAR_PORTAL_URL.'
    }, { status: 503 })
  }

  try {
    // Get customer by clerk_user_id metadata
    const customers = await polar.customers.list({
      query: `metadata.clerk_user_id:${params.clerkUserId}`
    })

    if (!customers.items || customers.items.length === 0) {
      // No customer found, return generic portal URL if available
      if (process.env.POLAR_PORTAL_BASE_URL) {
        return NextResponse.json({ url: process.env.POLAR_PORTAL_BASE_URL })
      }
      return NextResponse.json({
        error: 'No subscription found. Please subscribe first.'
      }, { status: 404 })
    }

    const customer = customers.items[0]

    // Create a customer portal session
    const portalSession = await polar.customerPortalSessions.create({
      customerId: customer.id,
      returnUrl: params.returnUrl
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error('Failed to create Polar portal session:', error)

    // Fallback to static URL if configured
    if (process.env.POLAR_PORTAL_BASE_URL) {
      return NextResponse.json({ url: process.env.POLAR_PORTAL_BASE_URL })
    }

    return NextResponse.json({
      error: error.message || 'Failed to create portal session'
    }, { status: 500 })
  }
}
