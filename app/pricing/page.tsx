import { getCurrentSubscription } from "@/lib/subscription"
import { getAllPricingTiers, getAllAnnualPricingTiers } from "@/lib/pricing"
import { PricingClient } from "./pricing-client"

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const subscription = await getCurrentSubscription()
  
  // Get pricing data on the server where env vars are available
  const pricingTiers = getAllPricingTiers()
  const annualPricingTiers = getAllAnnualPricingTiers()
  
  return (
    <PricingClient 
      currentPlan={subscription?.plan}
      pricingTiers={pricingTiers}
      annualPricingTiers={annualPricingTiers}
    />
  )
}
