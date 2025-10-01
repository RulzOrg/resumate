import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, updateUserSubscription } from "@/lib/db"
import { getPricingTier, getPricingTierByStripePrice, getPriceIdForProvider } from "@/lib/pricing"
import { getStripe, isStripeConfigured } from "@/lib/stripe"
import { getBillingProvider } from "@/lib/billing/config"
import { createPolarCheckoutSession } from "@/lib/billing/polar"

export async function POST(request: NextRequest) {
  try {
    const provider = getBillingProvider()
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { priceId, planId } = await request.json()

    // Compute plan based on input
    const resolvedPlanId = planId || (priceId ? getPricingTierByStripePrice(priceId)?.id : undefined)
    const pricingTier = resolvedPlanId ? getPricingTier(resolvedPlanId) : undefined

    if (provider === 'polar') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      return await createPolarCheckoutSession({
        planId: resolvedPlanId,
        priceId,
        successUrl: `${appUrl}/dashboard?success=true&plan=${resolvedPlanId || ''}`,
        cancelUrl: `${appUrl}/pricing?canceled=true`,
        clerkUserId: userId,
        request,
      })
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Billing not configured" }, { status: 503 })
    }

    if (!pricingTier) {
      return NextResponse.json({ error: "Invalid pricing plan selected" }, { status: 400 })
    }
    const stripePriceId = priceId || getPriceIdForProvider(pricingTier.id, 'stripe')
    if (!stripePriceId) {
      return NextResponse.json({ error: "Missing Stripe price for selected plan" }, { status: 400 })
    }

    console.log(`Creating Stripe checkout for plan: ${pricingTier.name} (${stripePriceId})`)

    // Get or create user in our database
    const user = await getOrCreateUser()

    if (!user) {
      return NextResponse.json({ error: "Unable to verify user account. Please try again." }, { status: 500 })
    }

    // Create or retrieve Stripe customer
    const stripe = getStripe()
    let customerId = user.stripe_customer_id

    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            clerkUserId: userId,
            userId: user.id,
            plan: pricingTier.id,
          },
        })

        customerId = customer.id
        console.log(`Created new Stripe customer: ${customerId}`)

        // Update user with Stripe customer ID
        await updateUserSubscription(userId, {
          stripe_customer_id: customerId,
        })
      } catch (stripeError) {
        console.error("Error creating Stripe customer:", stripeError)
        return NextResponse.json({ error: "Failed to create customer account" }, { status: 500 })
      }
    }

    // Check if user already has an active subscription
    if (user.subscription_status === 'active' && user.stripe_subscription_id) {
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id)
        if (existingSubscription.status === 'active') {
          return NextResponse.json({ 
            error: "You already have an active subscription. Please manage your subscription through the billing portal.",
            redirectUrl: "/dashboard" 
          }, { status: 409 })
        }
      } catch (error) {
        // If subscription doesn't exist in Stripe, continue with checkout
        console.log("Existing subscription not found in Stripe, proceeding with checkout")
      }
    }

    // Prepare checkout session configuration
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const checkoutConfig: any = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/dashboard?success=true&plan=${pricingTier.id}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      metadata: {
        clerkUserId: userId,
        userId: user.id,
        planId: pricingTier.id,
        planName: pricingTier.name,
      },
      // Add trial period for Pro plans
      subscription_data: {
        metadata: {
          clerkUserId: userId,
          userId: user.id,
          planId: pricingTier.id,
        },
      },
    }

    // Add free trial for Pro plans
    if (pricingTier.id.includes('pro')) {
      checkoutConfig.subscription_data!.trial_period_days = 7
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(checkoutConfig)

    if (!session.url) {
      throw new Error("Failed to create checkout session URL")
    }

    console.log(`Checkout session created successfully: ${session.id}`)

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id 
    })

  } catch (error: any) {
    console.error("Error creating checkout session:", error)
    
    // Return more specific error messages
    if (error?.code === 'resource_missing') {
      return NextResponse.json({ error: "Invalid pricing plan. Please refresh and try again." }, { status: 400 })
    }
    
    if (error?.type === 'StripeCardError') {
      return NextResponse.json({ error: "Payment method error. Please check your card details." }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: "Unable to create checkout session. Please try again later." 
    }, { status: 500 })
  }
}
