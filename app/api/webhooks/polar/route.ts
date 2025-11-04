import { type NextRequest, NextResponse } from 'next/server'
import { updateUserSubscription, resetUsage } from '@/lib/db'
import { Polar, WebhookVerificationError } from '@polar-sh/sdk'
import crypto from 'crypto'

// Verify webhook signature for security
function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// Extract clerkUserId from Polar webhook payloads
function findClerkUserId(obj: any): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined

  // Check common locations for clerk_user_id in Polar webhooks
  if (obj.customer?.metadata?.clerk_user_id) return obj.customer.metadata.clerk_user_id
  if (obj.subscription?.customer?.metadata?.clerk_user_id) return obj.subscription.customer.metadata.clerk_user_id
  if (obj.metadata?.clerk_user_id) return obj.metadata.clerk_user_id

  // Legacy fallback
  if (typeof obj.clerkUserId === 'string' && obj.clerkUserId) return obj.clerkUserId

  return undefined
}

// Map Polar plan IDs to our internal plan names
function mapPolarPlanToInternal(polarPlanId: string | undefined): string {
  if (!polarPlanId) return 'free'

  // Map based on your Polar product configuration
  if (polarPlanId.includes('pro') || polarPlanId.includes('professional')) {
    if (polarPlanId.includes('annual') || polarPlanId.includes('yearly')) {
      return 'pro-annual'
    }
    return 'pro'
  }

  if (polarPlanId.includes('enterprise')) {
    if (polarPlanId.includes('annual') || polarPlanId.includes('yearly')) {
      return 'enterprise-annual'
    }
    return 'enterprise'
  }

  return 'free'
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('x-polar-signature') ||
                     request.headers.get('polar-signature')

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error('[POLAR_WEBHOOK] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Parse the webhook payload
    const body = JSON.parse(rawBody)
    const eventType: string = body?.type || body?.event || 'unknown'
    const data = body?.data || body

    // Extract clerk user ID
    const clerkUserId = findClerkUserId(data)

    console.log('[POLAR_WEBHOOK]', {
      eventType,
      hasUser: !!clerkUserId,
      subscription: data.subscription?.id,
      customer: data.customer?.id || data.subscription?.customer?.id
    })

    if (!clerkUserId) {
      // Log for debugging but acknowledge webhook
      console.warn('[POLAR_WEBHOOK] No clerk_user_id found in webhook payload')
      return NextResponse.json({ received: true, warning: 'No user mapping found' })
    }

    // Handle different Polar webhook events
    switch (eventType) {
      case 'checkout.created':
      case 'checkout.updated':
        // Checkout events - no action needed yet
        break

      case 'checkout.succeeded':
      case 'subscription.created':
        // New subscription created
        const newPlan = mapPolarPlanToInternal(data.subscription?.product?.id)
        await updateUserSubscription(clerkUserId, {
          subscription_status: 'active',
          subscription_plan: newPlan,
          subscription_period_end: data.subscription?.current_period_end
            ? new Date(data.subscription.current_period_end)
            : undefined,
        })

        // Reset usage limits for new subscription
        if (newPlan !== 'free') {
          await resetUsage(clerkUserId)
        }

        console.log('[POLAR_WEBHOOK] Subscription created', {
          clerkUserId,
          plan: newPlan
        })
        break

      case 'subscription.updated':
        // Subscription plan changed or renewed
        const updatedPlan = mapPolarPlanToInternal(data.subscription?.product?.id)
        const previousPlan = data.previous_subscription?.product?.id

        await updateUserSubscription(clerkUserId, {
          subscription_status: data.subscription?.status || 'active',
          subscription_plan: updatedPlan,
          subscription_period_end: data.subscription?.current_period_end
            ? new Date(data.subscription.current_period_end)
            : undefined,
        })

        // Reset usage if plan upgraded
        if (previousPlan !== data.subscription?.product?.id) {
          await resetUsage(clerkUserId)
        }

        console.log('[POLAR_WEBHOOK] Subscription updated', {
          clerkUserId,
          plan: updatedPlan,
          status: data.subscription?.status
        })
        break

      case 'subscription.canceled':
      case 'subscription.revoked':
        // Subscription ended
        await updateUserSubscription(clerkUserId, {
          subscription_status: 'canceled',
          subscription_plan: 'free',
          subscription_period_end: null,
        })

        console.log('[POLAR_WEBHOOK] Subscription canceled', { clerkUserId })
        break

      case 'subscription.past_due':
        // Payment failed but subscription still active
        await updateUserSubscription(clerkUserId, {
          subscription_status: 'past_due',
        })
        break

      default:
        console.log('[POLAR_WEBHOOK] Unhandled event type', { eventType })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[POLAR_WEBHOOK] Handler error', {
      message: error?.message,
      stack: error?.stack
    })
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
