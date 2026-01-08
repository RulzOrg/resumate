"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"

interface ProCheckoutButtonProps {
  className?: string
}

export function ProCheckoutButton({ className }: ProCheckoutButtonProps) {
  const { isSignedIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)

    try {
      if (isSignedIn) {
        // Logged in users: Use API to create checkout with email pre-filled
        const response = await fetch("/api/billing/create-checkout", {
          method: "POST",
        })

        if (!response.ok) {
          throw new Error("Failed to create checkout")
        }

        const { url } = await response.json()
        window.location.href = url
      } else {
        // Not logged in: Use direct Polar checkout URL from env
        const checkoutUrl = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL_PRO_MONTHLY

        if (checkoutUrl) {
          window.location.href = checkoutUrl
        } else {
          // Fallback: redirect to signup if no checkout URL configured
          console.warn("NEXT_PUBLIC_POLAR_CHECKOUT_URL_PRO_MONTHLY not configured")
          window.location.href = "/auth/signup"
        }
      }
    } catch (error) {
      console.error("Checkout error:", error)
      setIsLoading(false)
      // Fallback to signup page on error
      window.location.href = "/auth/signup"
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? "Loading..." : "Choose Pro"}
    </button>
  )
}
