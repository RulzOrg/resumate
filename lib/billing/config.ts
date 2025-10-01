export type BillingProvider = 'stripe' | 'polar'

export function getBillingProvider(): BillingProvider {
  const p = process.env.BILLING_PROVIDER?.toLowerCase()
  return p === 'polar' ? 'polar' : 'stripe'
}

export function isPolarSelected(): boolean {
  return getBillingProvider() === 'polar'
}

export function isStripeSelected(): boolean {
  return getBillingProvider() === 'stripe'
}
