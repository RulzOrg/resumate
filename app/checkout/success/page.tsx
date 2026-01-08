"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CheckoutSuccessPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [countdown, setCountdown] = useState(3)

  // For authenticated users: Auto-redirect to dashboard after countdown
  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push("/dashboard")
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isSignedIn, isLoaded, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        <div className="bg-surface-subtle dark:bg-white/5 rounded-2xl border border-border/80 dark:border-white/10 p-8 text-center space-y-6">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-emerald-500" />
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground dark:text-white">
              Payment Successful!
            </h1>
            <p className="text-foreground/70 dark:text-white/70">
              Thank you for upgrading to Pro.
            </p>
          </div>

          {/* Conditional Content based on auth state */}
          {isSignedIn ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-foreground/70 dark:text-white/70">
                  Your Pro features are now active. Redirecting to dashboard in {countdown}...
                </p>
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mx-auto" />
              </div>
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
              >
                Go to Dashboard Now
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm text-foreground/70 dark:text-white/70">
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
                  className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
                >
                  <Link href="/auth/signup">Create Your Account</Link>
                </Button>

                <div className="text-sm text-foreground/70 dark:text-white/70">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="text-emerald-500 hover:text-emerald-400 underline underline-offset-4"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Session ID for debugging */}
          {sessionId && (
            <div className="pt-4 border-t border-border/50 dark:border-white/10">
              <p className="text-xs text-foreground/50 dark:text-white/50">
                Session ID: {sessionId.slice(0, 20)}...
              </p>
            </div>
          )}
        </div>

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-foreground/60 dark:text-white/60">
          Need help? Contact{" "}
          <a
            href="mailto:support@useresumate.com"
            className="text-emerald-500 hover:text-emerald-400 underline"
          >
            support@useresumate.com
          </a>
        </p>
      </div>
    </div>
  )
}
