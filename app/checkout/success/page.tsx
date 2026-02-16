"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function CheckoutSuccessContent() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionToken = searchParams.get("customer_session_token")
  const [countdown, setCountdown] = useState(3)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Handle redirects after auth state loads
  useEffect(() => {
    if (!isLoaded) return

    // Unauthenticated users: Auto-redirect to sign up
    if (!isSignedIn) {
      router.push("/auth/signup")
      return
    }

    // Authenticated users: Auto-redirect to dashboard after countdown
    if (isSignedIn) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            router.push("/dashboard")
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }
  }, [isSignedIn, isLoaded, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        <div className="bg-surface-subtle rounded-2xl border border-border p-8 text-center space-y-6">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-primary" />
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Payment Successful!
            </h1>
            <p className="text-muted-foreground">
              Thank you for upgrading to Pro.
            </p>
          </div>

          {/* Conditional Content based on auth state */}
          {isSignedIn ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your Pro features are now active. Redirecting to dashboard in {countdown}...
                </p>
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
              </div>
              <Button
                onClick={() => {
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                  }
                  router.push("/dashboard")
                }}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Go to Dashboard Now
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create your account to activate your Pro subscription and start optimizing your resumes.
                </p>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-xs text-amber-400">
                    💡 Use the same email address you used for payment to automatically link your subscription.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  asChild
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link href="/auth/signup">Create Your Account</Link>
                </Button>

                <div className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="text-primary hover:text-primary/90 underline underline-offset-4"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Session Token for debugging */}
          {sessionToken && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground/70">
                Session: {sessionToken.slice(0, 20)}...
              </p>
            </div>
          )}
        </div>

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need help? Contact{" "}
          <a
            href="mailto:support@useresumate.com"
            className="text-primary hover:text-primary/90 underline"
          >
            support@useresumate.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
