"use client"

import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"
import { useState } from "react"

interface BillingButtonProps {
  subscriptionStatus: string
  subscriptionPlan: string
}

export function BillingButton({ subscriptionStatus, subscriptionPlan }: BillingButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleBilling = async () => {
    setIsLoading(true)

    try {
      if (subscriptionPlan === "free") {
        // Redirect to pricing page
        window.location.href = "/pricing"
      } else {
        // Open Stripe customer portal
        const response = await fetch("/api/billing/portal", {
          method: "POST",
        })

        const { url } = await response.json()

        if (url) {
          window.location.href = url
        }
      }
    } catch (error) {
      console.error("Error handling billing:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleBilling} disabled={isLoading}>
      <CreditCard className="w-4 h-4 mr-2" />
      {isLoading ? "Loading..." : subscriptionPlan === "free" ? "Upgrade Plan" : "Manage Billing"}
    </Button>
  )
}
