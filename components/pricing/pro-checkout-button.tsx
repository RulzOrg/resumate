"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"

interface ProCheckoutButtonProps {
  className?: string
}

export function ProCheckoutButton({ className }: ProCheckoutButtonProps) {
  const { isSignedIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleClick = async () => {
    if (isLoading) return
    setIsLoading(true)
    setError(null)

    try {
      if (isSignedIn) {
        // Logged in users: Use API to create checkout with email pre-filled
        const response = await fetch("/api/billing/create-checkout", {
          method: "POST",
        })

        if (!response.ok) {
          // Try to extract error message from API response
          let errorMessage = "Failed to create checkout session"
          try {
            const errorData = await response.json()
            if (errorData?.error && typeof errorData.error === "string") {
              errorMessage = errorData.error
            }
          } catch {
            // If response isn't JSON, use default message
          }
          throw new Error(errorMessage)
        }

        const data = await response.json()

        // Assert payload shape: ensure url property exists and is a string
        if (!data || typeof data !== "object" || !("url" in data)) {
          throw new Error("Invalid response: missing url property")
        }

        if (typeof data.url !== "string" || data.url.trim() === "") {
          throw new Error("Invalid response: url must be a non-empty string")
        }

        // Validate URL format and scheme
        let checkoutUrl: URL
        try {
          checkoutUrl = new URL(data.url)
        } catch (urlError) {
          throw new Error(`Malformed checkout URL: ${urlError instanceof Error ? urlError.message : "Invalid URL format"}`)
        }

        // Only allow http/https schemes
        if (checkoutUrl.protocol !== "https:" && checkoutUrl.protocol !== "http:") {
          throw new Error(`Unsafe URL scheme: ${checkoutUrl.protocol}. Only http/https allowed.`)
        }

        // Only allow redirects to trusted Polar checkout domains
        const trustedDomains = ["checkout.polar.sh", "sandbox.checkout.polar.sh", "polar.sh", "sandbox.polar.sh"]
        if (!trustedDomains.includes(checkoutUrl.hostname)) {
          console.error("Untrusted checkout domain:", checkoutUrl.hostname)
          throw new Error(`Untrusted checkout domain: ${checkoutUrl.hostname}`)
        }

        // Use the validated URL object for redirect
        window.location.href = checkoutUrl.href
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

      if (isSignedIn) {
        // Logged-in users: show error message and stay on page
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to start checkout. Please try again."
        setError(errorMessage)
      } else {
        // Not logged in: redirect to signup
        window.location.href = "/auth/signup"
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? "Loading..." : "Choose Pro"}
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
