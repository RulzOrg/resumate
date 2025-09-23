"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import type { ReactNode } from "react"

interface Props {
  children: ReactNode
}

export function ClerkProviderWrapper({ children }: Props) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ""

  console.log("[v0] Clerk publishable key check:", {
    hasKey: !!publishableKey,
    keyLength: publishableKey.length,
    envVar: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "exists" : "missing",
  })

  if (!publishableKey) {
    console.error("Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable")
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Authentication Configuration Error</h1>
          <p className="text-muted-foreground">
            Missing Clerk publishable key. Please check your environment variables.
          </p>
          <p className="text-sm text-muted-foreground">
            Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to your environment variables.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "hsl(var(--primary))",
          colorBackground: "hsl(var(--background))",
          colorInputBackground: "hsl(var(--background))",
          colorInputText: "hsl(var(--foreground))",
          colorText: "hsl(var(--foreground))",
          colorTextSecondary: "hsl(var(--muted-foreground))",
          colorNeutral: "hsl(var(--muted))",
          colorDanger: "hsl(var(--destructive))",
          colorSuccess: "hsl(var(--primary))",
          colorWarning: "hsl(var(--warning))",
          borderRadius: "0.5rem",
        },
        elements: {
          formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
          card: "bg-card border border-border",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton: "border border-border bg-background text-foreground hover:bg-accent",
          formFieldInput: "bg-background border border-border text-foreground",
          footerActionLink: "text-primary hover:text-primary/80",
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
