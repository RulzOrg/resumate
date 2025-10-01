"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PricingTier, formatPrice } from "@/lib/pricing"

interface PricingCardProps {
  tier: PricingTier
  billingCycle: 'monthly' | 'annual'
  currentPlan?: string
  popular?: boolean
}

export function PricingCard({
  tier,
  billingCycle,
  currentPlan,
  popular = false,
}: PricingCardProps) {
  const { isSignedIn, user } = useUser()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const isCurrentPlan = currentPlan === tier.id
  const isFreeTier = tier.id === 'free'
  const isEnterprise = tier.id === 'enterprise' || tier.id === 'enterprise-annual'

  // Calculate display price based on billing cycle
  // For annual plans: tier.price is the annual total, display as monthly equivalent
  const displayPrice = billingCycle === 'annual' && !isFreeTier ? tier.price / 12 : tier.price

  // Calculate savings: Compare annual price to monthly price × 12
  // Monthly Pro: $19/month = $228/year
  // Annual Pro: $190/year (saves $38 = 17%)
  const monthlyEquivalent = tier.id.includes('annual') ? 19 : tier.price // Base monthly price
  const annualPrice = tier.id.includes('annual') ? tier.price : tier.price * 12
  const annualIfMonthly = monthlyEquivalent * 12
  const annualSavings = billingCycle === 'annual' && !isFreeTier && tier.id.includes('annual')
    ? Math.round(((annualIfMonthly - annualPrice) / annualIfMonthly) * 100)
    : 0

  const handleSubscribe = async () => {
    if (!isSignedIn) {
      router.push("/auth/signup")
      return
    }

    if (isFreeTier) {
      router.push("/dashboard")
      return
    }

    if (isEnterprise) {
      window.open("mailto:sales@resumeai.com?subject=Enterprise Plan Inquiry", "_blank")
      return
    }

    if (isCurrentPlan) {
      router.push("/dashboard")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: tier.id,
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      // You could add a toast notification here
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonText = () => {
    if (isLoading) return "Loading..."
    if (isCurrentPlan) return "Current Plan"
    if (isFreeTier) return "Get Started Free"
    if (isEnterprise) return "Contact Sales"
    return `Start ${tier.name} Plan`
  }

  const getButtonVariant = () => {
    if (isCurrentPlan) return "outline" as const
    if (popular || tier.id === 'pro') return "default" as const
    return "outline" as const
  }

  return (
    <Card
      className={`relative overflow-hidden rounded-2xl border ${
        popular ? 'border-emerald-500/50 ring-1 ring-emerald-500' : 'border-white/10'
      } bg-white/5 backdrop-blur p-0 ${isCurrentPlan ? 'ring-2 ring-emerald-500' : ''}`}
    >
      {popular && (
        <Badge className="absolute top-3 right-3 bg-emerald-500/10 text-emerald-200 border border-emerald-500/30">
          <Sparkles className="w-3 h-3 mr-1" />
          Most Popular
        </Badge>
      )}

      {isCurrentPlan && (
        <Badge className="absolute top-3 left-3 bg-emerald-600 text-black">
          Current Plan
        </Badge>
      )}

      <CardHeader className="text-center pb-4 pt-8">
        <CardTitle className="text-xl text-white tracking-tight">{tier.name}</CardTitle>
        <div className="mt-4 flex items-baseline justify-center gap-2">
          <span className="text-4xl font-semibold text-white">
            {isFreeTier ? '$0' : formatPrice(displayPrice)}
          </span>
          {!isFreeTier && (
            <span className="text-sm text-white/70">
              /{billingCycle === 'annual' ? 'month' : tier.interval}
            </span>
          )}
        </div>
        {billingCycle === 'annual' && !isFreeTier && annualSavings > 0 && (
          <Badge variant="secondary" className="mt-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Save {annualSavings}%
          </Badge>
        )}
        <CardDescription className="text-sm mt-3 text-white/70">
          {tier.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-8 pt-4">
        <ul className="space-y-4">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-white/90">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className={`${
            popular || tier.id === 'pro'
              ? 'bg-emerald-500 text-black hover:bg-emerald-400'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
          } w-full`}
          variant={getButtonVariant()}
          onClick={handleSubscribe}
          disabled={isLoading || isCurrentPlan}
        >
          {getButtonText()}
        </Button>
        {tier.id === 'pro' && (
          <p className="text-xs text-center text-white/60">7-day free trial • Cancel anytime</p>
        )}
      </CardContent>
    </Card>
  )
}
