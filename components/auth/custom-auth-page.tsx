"use client"

import Link from "next/link"
import { useState, useMemo } from "react"
import { SignIn, SignUp, useSignIn } from "@clerk/nextjs"
import type { Theme } from "@clerk/types"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Tab = "signin" | "signup"

interface Props {
  defaultTab?: Tab
}

export default function CustomAuthPage({ defaultTab = "signup" }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab)
  const { signIn, isLoaded: isSignInLoaded } = useSignIn()
  const [oauthError, setOauthError] = useState<string | null>(null)

  const appearance = useMemo(
    () => ({
      layout: {
        socialButtonsVariant: "iconButton",
      },
      variables: {
        colorPrimary: "#10b981",
        colorBackground: "#000000",
        colorInputBackground: "rgba(255,255,255,0.05)",
        colorInputText: "#ffffff",
        colorText: "#ffffff",
        colorTextSecondary: "rgba(255,255,255,0.7)",
        borderRadius: "9999px",
      },
      elements: {
        rootBox: "w-full",
        card: "!bg-black !border !border-white/10 !shadow-none",
        header: "hidden",
        headerSubtitle: "hidden",
        form: "mt-0 space-y-4",
        formFieldInput: "bg-white/5 border border-white/10 text-white rounded-full px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-white/30",
        formFieldLabel: "text-white/80 mb-1.5",
        formButtonPrimary: "rounded-full bg-emerald-500 text-black hover:bg-emerald-400",
        footer: "hidden",
        footerAction__signIn: "hidden",
        footerAction__signUp: "hidden",
        socialButtons: "hidden",
        dividerRow: "hidden",
        identityPreview: "hidden",
      },
    }) satisfies Theme,
    []
  )

  async function handleOAuth(strategy: "oauth_google" | "oauth_github") {
    if (!isSignInLoaded || !signIn) return
    setOauthError(null)
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
    } catch (err) {
      // Log detailed error for debugging without exposing internals to users
      console.error("OAuth redirect failed", {
        strategy,
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err,
      })
      setOauthError(
        "Authentication failed. Please try again or use another provider.",
      )
    }
  }

  return (
    <div className="min-h-screen w-full text-white bg-black">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="hidden md:block h-screen relative">
          <img
            src="https://hoirqrkdgbmvpwutwuwj-all.supabase.co/storage/v1/object/public/assets/assets/54d286cc-805c-4764-8e62-adf0b4e17df5_800w.jpg"
            alt="A professional man smiling"
            className="absolute w-full h-full object-cover top-0 right-0 bottom-0 left-0"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="z-10 flex flex-col relative h-full p-12 justify-end">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur w-fit mb-6"
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
            <h2 className="text-3xl font-semibold tracking-tight text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Land your dream job faster.
            </h2>
            <p className="mt-2 text-white/70 max-w-md">
              Our AI optimizes your resume for every application, getting you past the bots and in front of hiring managers.
            </p>
          </div>
        </div>

        <div className="flex flex-col min-h-screen sm:p-6 lg:p-8 bg-black p-4 justify-center">
          <div className="mx-auto w-full max-w-sm">
            <div className="text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                Welcome
              </h1>
              <p className="mt-2 text-sm text-white/60">Sign in or create an account to get started.</p>
            </div>

            <div className="mt-8">
              {/* Tabs */}
              <div className="mb-6">
                <div className="flex gap-1 bg-white/5 border-white/10 border rounded-full p-1 backdrop-blur items-center">
                  <button
                    className={`text-sm font-medium w-full rounded-full py-2 px-4 ${
                      tab === "signin" ? "text-white bg-white/10" : "text-white/70 hover:text-white"
                    }`}
                    onClick={() => setTab("signin")}
                  >
                    Sign In
                  </button>
                  <button
                    className={`text-sm font-medium w-full rounded-full py-2 px-4 ${
                      tab === "signup" ? "text-white bg-white/10" : "text-white/70 hover:text-white"
                    }`}
                    onClick={() => setTab("signup")}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              {/* Forms */}
              <div className={tab === "signin" ? "block" : "hidden"}>
                <SignIn routing="hash" signUpUrl="/auth/signup" redirectUrl="/dashboard" appearance={appearance} />
              </div>
              <div className={tab === "signup" ? "block" : "hidden"}>
                <SignUp routing="hash" signInUrl="/auth/login" redirectUrl="/dashboard" appearance={appearance} />
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-black px-2 text-white/50">Or continue with</span>
                </div>
              </div>

              {oauthError && (
                <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30 text-red-200">
                  <AlertDescription>{oauthError}</AlertDescription>
                </Alert>
              )}

              {/* Social Logins */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOAuth("oauth_google")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 shadow-sm hover:bg-white/10 transition-colors"
                >
                  <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  <span>Google</span>
                </button>
                <button
                  onClick={() => handleOAuth("oauth_github")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 shadow-sm hover:bg-white/10 transition-colors"
                >
                  <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.491.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.942.359.308.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>GitHub</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


