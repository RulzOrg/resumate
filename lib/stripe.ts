import Stripe from "stripe"

let stripeSingleton: Stripe | null = null

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("Stripe not configured: STRIPE_SECRET_KEY is missing")
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2025-08-27.basil",
    })
  }
  return stripeSingleton
}
