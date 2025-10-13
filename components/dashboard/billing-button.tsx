"use client"

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

        if (response.ok) {
          const { url } = await response.json()
          if (url) {
            window.location.href = url
          }
        } else {
          const { error } = await response.json()
          // For development: show alert with error, in production: handle more gracefully
          alert(`Billing portal not available: ${error}\n\nThis is expected in development with test data. In production, this would open the Stripe customer portal.`)
        }
      }
    } catch (error) {
      console.error("Error handling billing:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleBilling} 
      disabled={isLoading}
      className="mt-4 w-full text-center text-sm font-medium text-foreground/80 dark:text-white/80 hover:text-foreground dark:hover:text-white transition bg-surface-muted dark:bg-white/10 rounded-full py-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Loading..." : subscriptionPlan === "free" ? "Upgrade Plan" : "Manage Billing"}
    </button>
  )
}
