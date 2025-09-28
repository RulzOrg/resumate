import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { clerkConfig } from "@/lib/clerk-config"
import { dark } from "@clerk/themes"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "ResuMate AI - AI-Powered Resume Optimization",
  description:
    "Transform your resume with AI-driven improvements tailored to specific job descriptions. Increase your chances of getting shortlisted.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  if (process.env.E2E_TEST_MODE === '1') {
    return (
      <html lang="en" className="dark">
        <body className={`font-sans ${inter.variable} ${GeistMono.variable} ${spaceGrotesk.variable} antialiased`}>
          {children}
        </body>
      </html>
    )
  }
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (!publishableKey) {
    return (
      <html lang="en" className="dark">
        <body className={`font-sans ${inter.variable} ${GeistMono.variable} ${spaceGrotesk.variable} antialiased`}>
          <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="text-center space-y-4">
              <h1 className="text-xl font-semibold text-white">Authentication Configuration Error</h1>
              <p className="text-gray-400">Missing Clerk publishable key. Please check your environment variables.</p>
              <p className="text-sm text-gray-500">
                Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to your environment variables.
              </p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${inter.variable} ${GeistMono.variable} ${spaceGrotesk.variable} antialiased`}>
        <ClerkProvider
          publishableKey={publishableKey}
          signInUrl={clerkConfig.signInUrl}
          signUpUrl={clerkConfig.signUpUrl}
          afterSignInUrl={clerkConfig.afterSignInUrl}
          afterSignUpUrl={clerkConfig.afterSignUpUrl}
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: "#10b981",
              colorBackground: "#000000",
              colorInputBackground: "#111111",
              colorInputText: "#ffffff",
              colorText: "#ffffff",
              colorTextSecondary: "#9ca3af",
              colorNeutral: "#374151",
              colorDanger: "#ef4444",
              colorSuccess: "#10b981",
              colorWarning: "#f59e0b",
              borderRadius: "0.5rem",
            },
            elements: {
              formButtonPrimary: "bg-emerald-500 text-white hover:bg-emerald-600",
              card: "bg-gray-900 border border-gray-800",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton: "border border-gray-700 bg-gray-800 text-white hover:bg-gray-700",
              formFieldInput: "bg-gray-800 border border-gray-700 text-white",
              footerActionLink: "text-emerald-500 hover:text-emerald-400",
            },
          }}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  )
}
