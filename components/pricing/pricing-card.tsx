"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PricingTier, PricingFeature, formatPrice } from "@/lib/pricing"

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

  // Display price is simply the tier price for monthly billing
  const displayPrice = tier.price

  const handleSubscribe = async () => {
    // Free tier: Always go to signup (Clerk handles new vs existing users)
    if (isFreeTier) {
      if (!isSignedIn) {
        router.push("/auth/signup")
      } else {
        router.push("/dashboard")
      }
      return
    }

    // Already on current plan: Go to dashboard
    if (isCurrentPlan) {
      router.push("/dashboard")
      return
    }

    setIsLoading(true)

    try {
      if (isSignedIn) {
        // Logged in users: Use API to create checkout with email pre-filled
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
      } else {
        // Not logged in: Use direct Polar checkout URL (payment-first flow)
        const checkoutUrl = billingCycle === "annual"
          ? process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL_PRO_ANNUAL
          : process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL_PRO_MONTHLY

        if (checkoutUrl) {
          window.location.href = checkoutUrl
        } else {
          // Fallback: redirect to signup if no checkout URL configured
          console.warn(`NEXT_PUBLIC_POLAR_CHECKOUT_URL_PRO_${billingCycle === "annual" ? "ANNUAL" : "MONTHLY"} not configured`)
          router.push("/auth/signup")
        }
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
    if (isFreeTier) return "Get Started"
    return "Choose Pro"
  }

  const getButtonVariant = () => {
    if (isCurrentPlan) return "outline" as const
    if (popular || tier.id === 'pro') return "default" as const
    return "outline" as const
  }

  return (
    <Card
      className={`relative overflow-hidden rounded-2xl bg-surface-subtle dark:bg-white/5 backdrop-blur p-0 border ${
        popular ? 'border-emerald-500/50 ring-1 ring-emerald-500' : '[border-color:#d1d5db] dark:border-white/20'
      } ${isCurrentPlan ? 'ring-2 ring-emerald-500' : ''}`}
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
        <CardTitle className="text-xl text-foreground dark:text-white tracking-tight">{tier.name}</CardTitle>
        <div className="mt-4 flex items-baseline justify-center gap-2">
          <span className="text-4xl font-semibold text-foreground dark:text-white">
            {isFreeTier ? '$0' : formatPrice(displayPrice)}
          </span>
          {!isFreeTier && (
            <span className="text-sm text-foreground/70 dark:text-white/70">
              / month
            </span>
          )}
        </div>
        <CardDescription className="text-sm mt-3 text-foreground/70 dark:text-white/70">
          {tier.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-8 pt-4">
        <ul className="space-y-4">
          {tier.features.map((feature, index) => {
            const featureText = typeof feature === 'string' ? feature : feature.text
            const isComingSoon = typeof feature === 'object' && feature.comingSoon
            return (
              <li key={index} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground/90 dark:text-white/90 flex items-center gap-2 flex-wrap">
                  {featureText}
                  {isComingSoon && (
                    <span className="text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 whitespace-nowrap">
                      Coming Soon
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>

        <Button
          className={`${
            popular || tier.id === 'pro'
              ? 'bg-emerald-500 text-black hover:bg-emerald-400'
              : 'bg-surface-muted dark:bg-white/10 text-foreground dark:text-white hover:bg-surface-strong dark:hover:bg-white/20 border border-border/80 dark:border-white/20'
          } w-full`}
          variant={getButtonVariant()}
          onClick={handleSubscribe}
          disabled={isLoading || isCurrentPlan}
        >
          {getButtonText()}
        </Button>
        {tier.id === 'pro' && (
          <p className="text-xs text-center text-foreground/75 dark:text-white/75">7-day free trial • Cancel anytime</p>
        )}
      </CardContent>
    </Card>
  )
}
