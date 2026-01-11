"use client"

import Link from "next/link"
import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useSignIn, useAuth } from "@clerk/nextjs"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Step = "email" | "code" | "success"

export default function ForgotPasswordPage() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const { signIn, isLoaded } = useSignIn()
  
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // If already signed in, redirect to dashboard
  if (isSignedIn) {
    if (typeof window !== "undefined") router.replace("/dashboard")
    return null
  }

  const extractClerkError = (error: unknown) => {
    if (typeof error === "object" && error !== null && "errors" in error) {
      const clerkError = error as {
        errors?: Array<{ code?: string; message?: string }>
      }
      const message = clerkError.errors?.[0]?.message
      if (message) return message
    }
    if (error instanceof Error) {
      return error.message
    }
    return "Something went wrong. Please try again."
  }

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isLoaded || !signIn) return

    setIsLoading(true)
    setError(null)

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      })
      setStep("code")
    } catch (err) {
      console.error("[Clerk] reset_password_email_code failed", err)
      setError(extractClerkError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isLoaded || !signIn) return

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      })

      if (result.status === "complete") {
        setStep("success")
      } else {
        setError("Unable to reset password. Please try again.")
      }
    } catch (err) {
      console.error("[Clerk] attemptFirstFactor failed", err)
      setError(extractClerkError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!isLoaded || !signIn) return
    setError(null)
    
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      })
    } catch (err) {
      setError(extractClerkError(err))
    }
  }

  return (
    <div className="min-h-screen w-full text-foreground dark:text-white bg-background dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 backdrop-blur"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M21 21v-5h-5" />
              </svg>
            </span>
            <span className="text-base font-medium tracking-tighter" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Useresumate
            </span>
          </Link>
        </div>

        {/* Step: Email Input */}
        {step === "email" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                Reset your password
              </h1>
              <p className="mt-2 text-sm text-foreground/60 dark:text-white/60">
                Enter your email and we'll send you a code to reset your password.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleEmailSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-white/80" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-foreground dark:text-white shadow-sm placeholder-foreground/40 dark:placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              {error && (
                <Alert className="border-red-500/30 bg-red-500/10 text-red-200">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-full bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:pointer-events-none disabled:opacity-60"
              >
                {isLoading ? "Sending..." : "Send Reset Code"}
              </button>
            </form>
          </>
        )}

        {/* Step: Verification Code + New Password */}
        {step === "code" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                Check your email
              </h1>
              <p className="mt-2 text-sm text-foreground/60 dark:text-white/60">
                We sent a code to {email}. Enter it below with your new password.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleCodeSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-white/80" htmlFor="code">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="block w-full rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-foreground dark:text-white shadow-sm placeholder-foreground/40 dark:placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-white/80" htmlFor="new-password">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-foreground dark:text-white shadow-sm placeholder-foreground/40 dark:placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-white/80" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-foreground dark:text-white shadow-sm placeholder-foreground/40 dark:placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              {error && (
                <Alert className="border-red-500/30 bg-red-500/10 text-red-200">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-sm font-medium text-foreground/70 dark:text-white/70 transition-colors hover:text-foreground dark:hover:text-white"
                >
                  Resend code
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex flex-1 justify-center rounded-full bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:pointer-events-none disabled:opacity-60"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-emerald-500/10">
              <svg
                className="h-6 w-6 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Password reset!
            </h1>
            <p className="mt-2 text-sm text-foreground/60 dark:text-white/60">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-flex w-full justify-center rounded-full bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-emerald-400"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* Back to login link */}
        {step !== "success" && (
          <p className="mt-6 text-center text-sm text-foreground/60 dark:text-white/60">
            Remember your password?{" "}
            <Link href="/auth/login" className="font-medium text-emerald-500 hover:text-emerald-400">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

