import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

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
  title: "AI Resume Optimizer - ATS Friendly Resume Tailoring for Multiple Jobs",
  description: "Create ATS-friendly resumes optimized for each job application. Our AI generates multiple tailored versions to increase interview rates. Free ATS checker included.",
  keywords: "AI resume optimizer, ATS friendly resume, resume tailoring tool, job specific resume, resume scanner, application tracking system, ATS resume checker, multiple resume versions, cover letter generator, job application tracking, AI resume builder, resume optimization, ATS formatting, resume keyword optimization",
  authors: [{ name: "ResuMate AI" }],
  creator: "ResuMate AI",
  publisher: "ResuMate AI",
  robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  openGraph: {
    title: "AI Resume Optimizer - ATS Friendly Resume Tailoring for Multiple Jobs",
    description: "Create ATS-friendly resumes optimized for each job application. Our AI generates multiple tailored versions to increase interview rates. Free ATS checker included.",
    url: "https://www.useresumate.com",
    siteName: "ResuMate AI",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ResuMate AI - AI Resume Optimizer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Resume Optimizer - ATS Friendly Resume Tailoring",
    description: "Create ATS-friendly resumes optimized for each job application. Our AI generates multiple tailored versions to increase interview rates.",
    creator: "@resumate_ai",
    images: ["/images/twitter-image.jpg"],
  },
  metadataBase: new URL("https://www.useresumate.com"),
  verification: {
    google: "google-site-verification-code",
    yandex: "yandex-verification-code",
    yahoo: "yahoo-site-verification-code",
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
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
          signInFallbackRedirectUrl={clerkConfig.afterSignInUrl}
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
          {children}
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  )
}
