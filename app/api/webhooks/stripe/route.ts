import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { updateUserSubscription } from "@/lib/db"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = (await headers()).get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const clerkUserId = session.metadata?.clerkUserId

        if (clerkUserId && session.subscription) {
          await updateUserSubscription(clerkUserId, {
            subscription_status: "active",
            subscription_plan: "pro",
            stripe_subscription_id: session.subscription as string,
          })
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(subscription.customer as string)

        if (customer && !customer.deleted) {
          const clerkUserId = customer.metadata?.clerkUserId

          if (clerkUserId) {
            await updateUserSubscription(clerkUserId, {
              subscription_status: subscription.status,
              subscription_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            })
          }
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(subscription.customer as string)

        if (customer && !customer.deleted) {
          const clerkUserId = customer.metadata?.clerkUserId

          if (clerkUserId) {
            await updateUserSubscription(clerkUserId, {
              subscription_status: "canceled",
              subscription_plan: "free",
            })
          }
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customer = await stripe.customers.retrieve(invoice.customer as string)

        if (customer && !customer.deleted) {
          const clerkUserId = customer.metadata?.clerkUserId

          if (clerkUserId) {
            await updateUserSubscription(clerkUserId, {
              subscription_status: "past_due",
            })
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
