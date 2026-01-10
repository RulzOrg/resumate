"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useSignIn, useSignUp, useAuth } from "@clerk/nextjs"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Tab = "signin" | "signup"

interface Props {
  defaultTab?: Tab
}

export default function CustomAuthPage({ defaultTab = "signup" }: Props) {
  const { isSignedIn } = useAuth()
  const [tab, setTab] = useState<Tab>(defaultTab)
  const router = useRouter()
  const { signIn, isLoaded: isSignInLoaded, setActive: setSignInActive } = useSignIn()
  const { signUp, isLoaded: isSignUpLoaded, setActive: setSignUpActive } = useSignUp()
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [signInEmail, setSignInEmail] = useState("")
  const [signInPassword, setSignInPassword] = useState("")
  const [signInError, setSignInError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const [signUpName, setSignUpName] = useState("")
  const [signUpEmail, setSignUpEmail] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")
  const [newsletterConsent, setNewsletterConsent] = useState(false)
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationError, setVerificationError] = useState<string | null>(null)

  // Debug: Log Clerk initialization state
  useEffect(() => {
    console.log("[Clerk Debug] State:", {
      isSignInLoaded,
      isSignUpLoaded,
      hasSignIn: !!signIn,
      hasSignUp: !!signUp,
      isSignedIn,
    })
  }, [isSignInLoaded, isSignUpLoaded, signIn, signUp, isSignedIn])

  const clearFormState = () => {
    setSignInEmail("")
    setSignInPassword("")
    setSignInError(null)
    setIsSigningIn(false)
    setSignUpName("")
    setSignUpEmail("")
    setSignUpPassword("")
    setNewsletterConsent(false)
    setSignUpError(null)
    setIsSigningUp(false)
    setIsVerifying(false)
    setVerificationCode("")
    setVerificationError(null)
    setOauthError(null)
  }

  // If a Clerk session already exists, go to dashboard
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

  const handleSignInSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSignInLoaded || !signIn) return

    setIsSigningIn(true)
    setSignInError(null)

    try {
      const result = await signIn.create({
        identifier: signInEmail,
        password: signInPassword,
      })

      if (result.status === "complete" && result.createdSessionId) {
        await setSignInActive({ session: result.createdSessionId })
        router.push("/dashboard")
        return
      }

      if (result.status === "needs_first_factor") {
        setSignInError("Additional verification is required. Please follow the prompts sent to your email.")
        return
      }

      setSignInError("Unable to complete sign in. Please try again.")
    } catch (error) {
      console.error("[Clerk] signIn.create failed", error)
      const msg = extractClerkError(error)
      if (/session already exists/i.test(msg)) {
        router.replace("/dashboard")
        return
      }
      setSignInError(msg)
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleSignUpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSignUpLoaded || !signUp) return

    setIsSigningUp(true)
    setSignUpError(null)

    const trimmedName = signUpName.trim()
    const [firstName = "", ...rest] = trimmedName.split(/\s+/)
    const lastName = rest.join(" ")

    try {
      const result = await signUp.create({
        emailAddress: signUpEmail,
        password: signUpPassword,
        firstName,
        lastName,
        unsafeMetadata: {
          newsletter_consent: newsletterConsent,
        },
      })

      if (result.status === "complete" && result.createdSessionId) {
        await setSignUpActive({ session: result.createdSessionId })
        router.push("/dashboard")
        return
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setIsVerifying(true)
    } catch (error) {
      console.error("[Clerk] signUp.create failed", error)
      const msg = extractClerkError(error)
      if (/session already exists/i.test(msg)) {
        router.replace("/dashboard")
        return
      }
      setSignUpError(msg)
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleVerificationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSignUpLoaded || !signUp) return

    setVerificationError(null)

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode })

      if (result.status === "complete" && result.createdSessionId) {
        await setSignUpActive({ session: result.createdSessionId })
        router.push("/dashboard")
        return
      }

      setVerificationError("Verification incomplete. Please check the code and try again.")
    } catch (error) {
      console.error("[Clerk] signUp.attemptEmailAddressVerification failed", error)
      const msg = extractClerkError(error)
      if (/session already exists/i.test(msg)) {
        router.replace("/dashboard")
        return
      }
      setVerificationError(msg)
    }
  }

  const handleResendVerification = async () => {
    if (!isSignUpLoaded || !signUp) return
    setVerificationError(null)
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
    } catch (error) {
      console.error("[Clerk] signUp.prepareEmailAddressVerification failed", error)
      const msg = extractClerkError(error)
      if (/session already exists/i.test(msg)) {
        router.replace("/dashboard")
        return
      }
      setVerificationError(msg)
    }
  }

  const handleTabChange = (nextTab: Tab) => {
    setTab(nextTab)
    clearFormState()
  }

  async function handleOAuth(strategy: "oauth_google" | "oauth_linkedin") {
    console.log("[OAuth] handleOAuth called", { strategy, isSignInLoaded, hasSignIn: !!signIn })

    if (!isSignInLoaded || !signIn) {
      console.warn("[OAuth] Clerk not ready yet", { isSignInLoaded, signIn: !!signIn })
      setOauthError("Authentication is still loading. Please wait a moment and try again.")
      return
    }

    setOauthError(null)

    try {
      console.log("[OAuth] Starting authenticateWithRedirect...")
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
      console.log("[OAuth] authenticateWithRedirect completed (should have redirected)")
    } catch (err) {
      // Log detailed error for debugging without exposing internals to users
      console.error("[OAuth] redirect failed", {
        strategy,
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err,
      })
      const message = extractClerkError(err)
      if (/session already exists/i.test(message)) {
        router.replace("/dashboard")
        return
      }
      setOauthError(message)
    }
  }

  return (
    <div className="min-h-screen w-full text-foreground dark:text-white bg-background dark:bg-black">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="hidden md:block h-screen relative">
          <img
            src="/images/auth-hero.jpg"
            alt="A professional person smiling"
            className="absolute w-full h-full object-cover top-0 right-0 bottom-0 left-0"
          />
          <div className="absolute inset-0 bg-foreground/40 dark:bg-black/40" />
          <div className="z-10 flex flex-col relative h-full p-12 justify-end">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 backdrop-blur w-fit mb-6"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
                {/* Refresh icon */}
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
                ResuMate AI
              </span>
            </Link>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground dark:text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Land your dream job faster.
            </h2>
            <p className="mt-2 text-foreground/70 dark:text-white/70 max-w-md">
              Our AI optimizes your resume for every application, getting you past the bots and in front of hiring managers.
            </p>
          </div>
        </div>

        <div className="flex flex-col min-h-screen sm:p-6 lg:p-8 bg-background dark:bg-black p-4 justify-center">
          <div className="mx-auto w-full max-w-sm">
            <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 backdrop-blur w-fit mb-6"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
                {/* Refresh icon */}
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
                ResuMate AI
              </span>
            </Link>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground dark:text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                Welcome
              </h1>
              <p className="mt-2 text-sm text-foreground/60 dark:text-white/60">Sign in or create an account to get started.</p>
            </div>

            <div className="mt-8">
              {/* Tabs */}
              <div className="mb-6">
                <div className="flex gap-1 bg-surface-subtle dark:bg-white/5 border-border dark:border-white/10 border rounded-full p-1 backdrop-blur items-center">
                  <button
                    className={`w-full rounded-full px-4 py-2 text-sm font-medium ${
                      tab === "signin" ? "bg-surface-muted dark:bg-white/10 text-foreground dark:text-white" : "text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white"
                    }`}
                    onClick={() => handleTabChange("signin")}
                  >
                    Sign In
                  </button>
                  <button
                    className={`w-full rounded-full px-4 py-2 text-sm font-medium ${
                      tab === "signup" ? "bg-surface-muted dark:bg-white/10 text-foreground dark:text-white" : "text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white"
                    }`}
                    onClick={() => handleTabChange("signup")}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              {/* Forms */}
              <div className={tab === "signin" ? "block" : "hidden"}>
                <form className="space-y-4" onSubmit={handleSignInSubmit}>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-white/80" htmlFor="email-signin">
                      Email address
                    </label>
                    <input
                      id="email-signin"
                      type="email"
                      autoComplete="email"
                      required
                      value={signInEmail}
                      onChange={event => setSignInEmail(event.target.value)}
                      className="block w-full rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-foreground dark:text-white shadow-sm placeholder-foreground/40 dark:placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground/80 dark:text-white/80" htmlFor="password-signin">
                        Password
                      </label>
                      <Link href="/auth/forgot-password" className="text-sm font-medium text-emerald-500 hover:text-emerald-400">
                        Forgot?
                      </Link>
                    </div>
                    <input
                      id="password-signin"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={signInPassword}
                      onChange={event => setSignInPassword(event.target.value)}
                      className="mt-1.5 block w-full rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-foreground dark:text-white shadow-sm placeholder-foreground/40 dark:placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>

                  {signInError && (
                    <Alert className="border-red-500/30 bg-red-500/10 text-red-200">
                      <AlertDescription>{signInError}</AlertDescription>
                    </Alert>
                  )}

                  <button
                    type="submit"
                    disabled={isSigningIn}
                    className="mt-2 flex w-full justify-center rounded-full bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:pointer-events-none disabled:opacity-60"
                  >
                    {isSigningIn ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              </div>
              <div className={tab === "signup" ? "block" : "hidden"}>
                {!isVerifying ? (
                  <form className="space-y-4" onSubmit={handleSignUpSubmit}>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-white/80" htmlFor="name-signup">
                        Full Name
                      </label>
                      <input
                        id="name-signup"
                        type="text"
                        autoComplete="name"
                        required
                        value={signUpName}
                        onChange={event => setSignUpName(event.target.value)}
                        className="block w-full rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-foreground dark:text-white shadow-sm placeholder-foreground/40 dark:placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-white/80" htmlFor="email-signup">
                        Email address
                      </label>
                      <input
                        id="email-signup"
                        type="email"
                        autoComplete="email"
                        required
                        value={signUpEmail}
                        onChange={event => setSignUpEmail(event.target.value)}
                        className="block w-full rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-foreground dark:text-white shadow-sm placeholder-foreground/40 dark:placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-white/80" htmlFor="password-signup">
                        Password
                      </label>
                      <input
                        id="password-signup"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={signUpPassword}
                        onChange={event => setSignUpPassword(event.target.value)}
                        className="block w-full rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-foreground dark:text-white shadow-sm placeholder-foreground/40 dark:placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                      />
                    </div>

                    <div className="flex items-start space-x-2">
                      <input
                        id="newsletter-consent"
                        type="checkbox"
                        checked={newsletterConsent}
                        onChange={event => setNewsletterConsent(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                      />
                      <label htmlFor="newsletter-consent" className="text-sm text-foreground/70 dark:text-white/70 cursor-pointer">
                        I want to receive resume tips, job search advice, and product updates
                      </label>
                    </div>

                    {signUpError && (
                      <Alert className="border-red-500/30 bg-red-500/10 text-red-200">
                        <AlertDescription>{signUpError}</AlertDescription>
                      </Alert>
                    )}

                    <button
                      type="submit"
                      disabled={isSigningUp}
                      className="mt-2 flex w-full justify-center rounded-full bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:pointer-events-none disabled:opacity-60"
                    >
                      {isSigningUp ? "Creating account..." : "Create Account"}
                    </button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleVerificationSubmit}>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-white/80" htmlFor="verification-code">
                        Enter the 6-digit code sent to {signUpEmail}
                      </label>
                      <input
                        id="verification-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        value={verificationCode}
                        onChange={event => setVerificationCode(event.target.value)}
                        className="block w-full rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-foreground dark:text-white shadow-sm placeholder-foreground/40 dark:placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                      />
                    </div>

                    {verificationError && (
                      <Alert className="border-red-500/30 bg-red-500/10 text-red-200">
                        <AlertDescription>{verificationError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        className="text-sm font-medium text-foreground/70 dark:text-white/70 transition-colors hover:text-foreground dark:hover:text-white"
                      >
                        Resend code
                      </button>
                      <button
                        type="submit"
                        className="flex flex-1 justify-center rounded-full bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                      >
                        Verify &amp; Continue
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border dark:border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background dark:bg-black px-2 text-foreground/50 dark:text-white/50">Or continue with</span>
                </div>
              </div>

              {oauthError && (
                <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30 text-red-200">
                  <AlertDescription>{oauthError}</AlertDescription>
                </Alert>
              )}

              {/* Social Logins */}
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => handleOAuth("oauth_google")}
                  disabled={!isSignInLoaded}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 shadow-sm transition-colors hover:bg-surface-muted dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  <span>{!isSignInLoaded ? "Loading..." : "Continue with Google"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
