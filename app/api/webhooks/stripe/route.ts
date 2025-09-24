import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { updateUserSubscription } from "@/lib/db"
import { getPricingTierByStripePrice } from "@/lib/pricing"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook received!')
  
  try {
    const body = await request.text()
    const signature = (await headers()).get("stripe-signature")

    console.log('Webhook body length:', body.length)
    console.log('Webhook signature present:', !!signature)

    if (!signature) {
      console.error("Missing stripe-signature header")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err?.message || err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log(`Processing webhook event: ${event.type} (${event.id})`)

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout session completed: ${session.id}`)
        
        const clerkUserId = session.metadata?.clerkUserId

        if (!clerkUserId) {
          console.error("Missing clerkUserId in checkout session metadata:", session.id)
          break
        }

        if (!session.subscription) {
          console.error("Missing subscription in checkout session:", session.id)
          break
        }

        try {
          // Get the subscription to determine the plan
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const priceTier = getPricingTierByStripePrice(subscription.items.data[0]?.price.id)
          
          await updateUserSubscription(clerkUserId, {
            subscription_status: "active",
            subscription_plan: priceTier?.id || "pro",
            stripe_subscription_id: session.subscription as string,
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          
          console.log(`Successfully updated subscription for user ${clerkUserId}`)
        } catch (err: any) {
          console.error("Failed to process checkout.session.completed:", err?.message || err)
          // Don't throw error to avoid webhook retries for recoverable failures
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`)
        
        try {
          const customer = await stripe.customers.retrieve(subscription.customer as string)

          if (customer && !customer.deleted) {
            const clerkUserId = customer.metadata?.clerkUserId

            if (!clerkUserId) {
              console.error("Missing clerkUserId in customer metadata:", customer.id)
              break
            }

            // Get the plan from the subscription price
            const priceTier = getPricingTierByStripePrice(subscription.items.data[0]?.price.id)

            await updateUserSubscription(clerkUserId, {
              subscription_status: subscription.status,
              subscription_plan: priceTier?.id,
              subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            
            console.log(`Successfully updated subscription for user ${clerkUserId}: ${subscription.status}`)
          } else {
            console.error("Customer not found or deleted:", subscription.customer)
          }
        } catch (err: any) {
          console.error("Failed to process customer.subscription.updated:", err?.message || err)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`Subscription deleted: ${subscription.id}`)
        
        try {
          const customer = await stripe.customers.retrieve(subscription.customer as string)

          if (customer && !customer.deleted) {
            const clerkUserId = customer.metadata?.clerkUserId

            if (!clerkUserId) {
              console.error("Missing clerkUserId in customer metadata:", customer.id)
              break
            }

            await updateUserSubscription(clerkUserId, {
              subscription_status: "canceled",
              subscription_plan: "free",
              stripe_subscription_id: null,
              subscription_period_end: null,
            })
            
            console.log(`Successfully canceled subscription for user ${clerkUserId}`)
          } else {
            console.error("Customer not found or deleted:", subscription.customer)
          }
        } catch (err: any) {
          console.error("Failed to process customer.subscription.deleted:", err?.message || err)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment failed for invoice: ${invoice.id}`)
        
        try {
          const customer = await stripe.customers.retrieve(invoice.customer as string)

          if (customer && !customer.deleted) {
            const clerkUserId = customer.metadata?.clerkUserId

            if (!clerkUserId) {
              console.error("Missing clerkUserId in customer metadata:", customer.id)
              break
            }

            await updateUserSubscription(clerkUserId, {
              subscription_status: "past_due",
            })
            
            console.log(`Updated subscription status to past_due for user ${clerkUserId}`)
          } else {
            console.error("Customer not found or deleted:", invoice.customer)
          }
        } catch (err: any) {
          console.error("Failed to process invoice.payment_failed:", err?.message || err)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment succeeded for invoice: ${invoice.id}`)
        
        if (invoice.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
            const customer = await stripe.customers.retrieve(subscription.customer as string)

            if (customer && !customer.deleted) {
              const clerkUserId = customer.metadata?.clerkUserId

              if (clerkUserId) {
                await updateUserSubscription(clerkUserId, {
                  subscription_status: "active",
                  subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                })
                
                console.log(`Updated subscription to active for user ${clerkUserId}`)
              }
            }
          } catch (err: any) {
            console.error("Failed to process invoice.payment_succeeded:", err?.message || err)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Webhook error:", {
      message: error?.message,
      stack: error?.stack,
      event_type: error?.event?.type,
      event_id: error?.event?.id,
    })
    
    // Return 500 to trigger webhook retry in Stripe
    return NextResponse.json({ 
      error: "Webhook handler failed", 
      message: error?.message || "Unknown error"
    }, { status: 500 })
  }
}
