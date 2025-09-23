"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface PricingCardProps {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  buttonText: string
  buttonVariant: "default" | "outline"
  popular?: boolean
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  buttonText,
  buttonVariant,
  popular = false,
}: PricingCardProps) {
  const { isSignedIn, user } = useUser()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!isSignedIn) {
      router.push("/auth/signup")
      return
    }

    if (name === "Free") {
      router.push("/dashboard")
      return
    }

    if (name === "Enterprise") {
      // Handle enterprise contact
      window.open("mailto:sales@resumeai.com?subject=Enterprise Plan Inquiry", "_blank")
      return
    }

    setIsLoading(true)

    try {
      // Create Stripe checkout session
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: name === "Pro" ? "price_pro_monthly" : "price_enterprise_monthly",
          userId: user?.id,
        }),
      })

      const { url } = await response.json()

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={`relative ${popular ? "border-primary shadow-lg scale-105" : "border-border/50"}`}>
      {popular && (
        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
          Most Popular
        </Badge>
      )}
      <CardHeader className="text-center pb-8">
        <CardTitle className="text-2xl">{name}</CardTitle>
        <div className="flex items-baseline justify-center space-x-1">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-muted-foreground">/{period}</span>
        </div>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full" variant={buttonVariant} onClick={handleSubscribe} disabled={isLoading}>
          {isLoading ? "Loading..." : buttonText}
        </Button>
      </CardContent>
    </Card>
  )
}
