import { type NextRequest, NextResponse } from 'next/server'
import { updateUserSubscription } from '@/lib/db'

// Best-effort extraction of clerkUserId from arbitrary webhook payloads
function findClerkUserId(obj: any): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  if (typeof obj.clerkUserId === 'string' && obj.clerkUserId) return obj.clerkUserId
  if (obj.metadata && typeof obj.metadata.clerkUserId === 'string') return obj.metadata.clerkUserId
  for (const key of Object.keys(obj)) {
    const v = (obj as any)[key]
    const found = findClerkUserId(v)
    if (found) return found
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const eventType: string = body?.type || body?.event || 'unknown'
    const data = body?.data || body

    const clerkUserId = findClerkUserId(data)

    console.log('[POLAR_WEBHOOK]', {
      eventType,
      hasUser: !!clerkUserId,
    })

    if (!clerkUserId) {
      // Acknowledge to avoid retries; we don't have mapping yet
      return NextResponse.json({ received: true, ignored: true })
    }

    // Map Polar-like events to internal subscription states
    if (eventType === 'subscription.created') {
      await updateUserSubscription(clerkUserId, { subscription_status: 'trialing' })
    } else if (
      eventType === 'subscription.active' ||
      eventType === 'order.paid'
    ) {
      await updateUserSubscription(clerkUserId, { subscription_status: 'active' })
    } else if (
      eventType === 'subscription.updated'
    ) {
      // Keep as active unless payload suggests otherwise
      await updateUserSubscription(clerkUserId, { subscription_status: 'active' })
    } else if (
      eventType === 'subscription.canceled' ||
      eventType === 'subscription.revoked'
    ) {
      await updateUserSubscription(clerkUserId, {
        subscription_status: 'canceled',
        subscription_plan: 'free',
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[POLAR_WEBHOOK] handler error', { message: error?.message })
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
