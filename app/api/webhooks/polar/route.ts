import { type NextRequest, NextResponse } from "next/server"
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks"
import {
  getUserByEmail,
  createPendingPolarSubscription,
  updateUserSubscriptionByEmail,
  updatePendingSubscriptionStatus,
} from "@/lib/db"

const webhookSecret = process.env.POLAR_WEBHOOK_SECRET || ""

/**
 * Redact email for logging - shows only domain to avoid storing PII
 * e.g., "user@example.com" -> "***@example.com"
 */
function redactEmail(email: string | undefined | null): string {
  if (!email) return "N/A"
  const [local, domain] = email.split("@")
  if (!domain) return "***"
  return `***@${domain}`
}

export async function POST(request: NextRequest) {
  console.log("[Polar Webhook] Received webhook")

  try {
    if (!webhookSecret) {
      console.error("[Polar Webhook] Webhook secret not configured - POLAR_WEBHOOK_SECRET is missing or empty")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    const body = await request.text()
    const headers = Object.fromEntries(request.headers.entries())

    console.log("[Polar Webhook] Body length:", body.length)

    let event: ReturnType<typeof validateEvent>

    try {
      event = validateEvent(body, headers, webhookSecret)
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        console.error("[Polar Webhook] Signature verification failed:", err.message)
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
      }
      throw err
    }

    console.log(`[Polar Webhook] Processing event: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case "subscription.active": {
        await handleSubscriptionActive(event.data)
        break
      }

      case "subscription.updated": {
        await handleSubscriptionUpdated(event.data)
        break
      }

      case "subscription.canceled": {
        await handleSubscriptionCanceled(event.data)
        break
      }

      case "subscription.revoked": {
        await handleSubscriptionRevoked(event.data)
        break
      }

      default:
        console.log(`[Polar Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[Polar Webhook] Error:", {
      message: error?.message,
      stack: error?.stack,
    })

    return NextResponse.json(
      {
        error: "Webhook handler failed",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * Handle new subscription activation
 * This is the main event for payment-first flow
 */
async function handleSubscriptionActive(data: any) {
  const customerEmail = data.customer?.email
  const customerName = data.customer?.name
  const customerId = data.customer?.id
  const subscriptionId = data.id
  const status = data.status
  const currentPeriodEnd = data.currentPeriodEnd || data.current_period_end

  console.log("[Polar Webhook] Subscription active:", {
    subscriptionId,
    customerEmail: redactEmail(customerEmail),
    status,
  })

  if (!customerEmail) {
    console.error("[Polar Webhook] Missing customer email in subscription.active event")
    return
  }

  // Check if user already exists with this email
  const existingUser = await getUserByEmail(customerEmail)

  if (existingUser) {
    // User exists - update their subscription directly
    console.log("[Polar Webhook] User exists, updating subscription:", existingUser.id)

    await updateUserSubscriptionByEmail(customerEmail, {
      subscription_status: "active",
      subscription_plan: "pro",
      subscription_period_end: currentPeriodEnd,
      polar_customer_id: customerId,
      polar_subscription_id: subscriptionId,
    })

    console.log("[Polar Webhook] Updated existing user subscription:", existingUser.id)
  } else {
    // User doesn't exist - create pending subscription
    console.log("[Polar Webhook] User doesn't exist, creating pending subscription")

    await createPendingPolarSubscription({
      polar_subscription_id: subscriptionId,
      polar_customer_id: customerId,
      customer_email: customerEmail,
      customer_name: customerName,
      plan_type: "pro",
      status: "active",
      amount: data.amount || data.price?.amount || 1900, // Default to $19
      currency: data.currency || "USD",
      recurring_interval: data.recurringInterval || data.recurring_interval || "month",
      current_period_start: data.currentPeriodStart || data.current_period_start,
      current_period_end: currentPeriodEnd,
      raw_webhook_data: data,
    })

    console.log("[Polar Webhook] Created pending subscription for:", redactEmail(customerEmail))
  }
}

/**
 * Handle subscription updates (plan changes, renewals, etc.)
 */
async function handleSubscriptionUpdated(data: any) {
  const customerEmail = data.customer?.email
  const customerId = data.customer?.id
  const subscriptionId = data.id
  const status = data.status
  const currentPeriodEnd = data.currentPeriodEnd || data.current_period_end

  console.log("[Polar Webhook] Subscription updated:", {
    subscriptionId,
    customerEmail: redactEmail(customerEmail),
    status,
  })

  if (!customerEmail) {
    console.error("[Polar Webhook] Missing customer email in subscription.updated event")
    return
  }

  // Try to update existing user
  const updatedUser = await updateUserSubscriptionByEmail(customerEmail, {
    subscription_status: status === "active" ? "active" : status,
    subscription_period_end: currentPeriodEnd,
    polar_customer_id: customerId,
    polar_subscription_id: subscriptionId,
  })

  if (updatedUser) {
    console.log("[Polar Webhook] Updated user subscription:", updatedUser.id)
  } else {
    // Update pending subscription if exists
    await updatePendingSubscriptionStatus(subscriptionId, status)
    console.log("[Polar Webhook] Updated pending subscription status:", subscriptionId)
  }
}

/**
 * Handle subscription cancellation
 * User retains access until period end
 */
async function handleSubscriptionCanceled(data: any) {
  const customerEmail = data.customer?.email
  const subscriptionId = data.id
  const currentPeriodEnd = data.currentPeriodEnd || data.current_period_end

  console.log("[Polar Webhook] Subscription canceled:", {
    subscriptionId,
    customerEmail: redactEmail(customerEmail),
  })

  if (!customerEmail) {
    console.error("[Polar Webhook] Missing customer email in subscription.canceled event")
    return
  }

  // Update user subscription status to canceled but keep their plan until period end
  const updatedUser = await updateUserSubscriptionByEmail(customerEmail, {
    subscription_status: "canceled",
    subscription_period_end: currentPeriodEnd,
  })

  if (updatedUser) {
    console.log("[Polar Webhook] Marked subscription as canceled for user:", updatedUser.id)
  } else {
    await updatePendingSubscriptionStatus(subscriptionId, "canceled")
    console.log("[Polar Webhook] Updated pending subscription to canceled:", subscriptionId)
  }
}

/**
 * Handle subscription revocation (immediately ends access)
 */
async function handleSubscriptionRevoked(data: any) {
  const customerEmail = data.customer?.email
  const subscriptionId = data.id

  console.log("[Polar Webhook] Subscription revoked:", {
    subscriptionId,
    customerEmail: redactEmail(customerEmail),
  })

  if (!customerEmail) {
    console.error("[Polar Webhook] Missing customer email in subscription.revoked event")
    return
  }

  // Immediately downgrade user to free plan
  const updatedUser = await updateUserSubscriptionByEmail(customerEmail, {
    subscription_status: "free",
    subscription_plan: "free",
    subscription_period_end: null,
    polar_subscription_id: null,
  })

  if (updatedUser) {
    console.log("[Polar Webhook] Revoked subscription and downgraded user to free:", updatedUser.id)
  } else {
    await updatePendingSubscriptionStatus(subscriptionId, "revoked")
    console.log("[Polar Webhook] Updated pending subscription to revoked:", subscriptionId)
  }
}
