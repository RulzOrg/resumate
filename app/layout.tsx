import type React from "react"
import type { Metadata } from "next"
import { Lora } from "next/font/google"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import Script from "next/script"

import { ClerkProvider } from "@clerk/nextjs"
import { clerkConfig } from "@/lib/clerk-config"
import { dark } from "@clerk/themes"
import { ThemeProvider } from "@/components/theme-provider"
import { FeedbackWidget } from "@/components/feedback-widget"
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts/keyboard-shortcuts-provider"
import { Toaster } from "sonner"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
})

export const metadata: Metadata = {
  title: "AI Resume Optimizer - ATS Friendly Resume Tailoring for Multiple Jobs",
  description: "Create ATS-friendly resumes optimized for each job application. Our AI generates multiple tailored versions to increase interview rates. Free ATS checker included.",
  keywords: "AI resume optimizer, ATS friendly resume, resume tailoring tool, job specific resume, resume scanner, application tracking system, ATS resume checker, multiple resume versions, cover letter generator, job application tracking, AI resume builder, resume optimization, ATS formatting, resume keyword optimization",
  authors: [{ name: "Useresumate" }],
  creator: "Useresumate",
  publisher: "Useresumate",
  robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  openGraph: {
    title: "AI Resume Optimizer - ATS Friendly Resume Tailoring for Multiple Jobs",
    description: "Create ATS-friendly resumes optimized for each job application. Our AI generates multiple tailored versions to increase interview rates. Free ATS checker included.",
    url: "https://www.useresumate.com",
    siteName: "Useresumate",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Useresumate - AI Resume Optimizer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Resume Optimizer - ATS Friendly Resume Tailoring",
    description: "Create ATS-friendly resumes optimized for each job application. Our AI generates multiple tailored versions to increase interview rates.",
    creator: "@useresumate",
    images: ["/images/twitter-image.webp"],
  },
  metadataBase: new URL("https://www.useresumate.com"),
  alternates: {
    canonical: "/",
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
      <html lang="en" suppressHydrationWarning>
        <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${spaceGrotesk.variable} ${lora.variable} antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <FeedbackWidget />
            <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} richColors closeButton />
          </ThemeProvider>
        </body>
      </html>
    )
  }
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (!publishableKey) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${spaceGrotesk.variable} ${lora.variable} antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-screen flex items-center justify-center bg-background">
              <div className="text-center space-y-4">
                <h1 className="text-xl font-semibold text-foreground">Authentication Configuration Error</h1>
                <p className="text-muted-foreground">Missing Clerk publishable key. Please check your environment variables.</p>
                <p className="text-sm text-muted-foreground">
                  Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to your environment variables.
                </p>
              </div>
            </div>
            <FeedbackWidget />
            <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} richColors closeButton />
          </ThemeProvider>
        </body>
      </html>
    )
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${spaceGrotesk.variable} ${lora.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider
            publishableKey={publishableKey}
            signInUrl={clerkConfig.signInUrl}
            signUpUrl={clerkConfig.signUpUrl}
            signInFallbackRedirectUrl={clerkConfig.afterSignInUrl}
            signUpFallbackRedirectUrl={clerkConfig.afterSignUpUrl}
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
                formButtonPrimary: "bg-emerald-500 text-foreground dark:text-white hover:bg-emerald-600",
                card: "bg-gray-900 border border-gray-800",
                headerTitle: "text-foreground dark:text-white",
                headerSubtitle: "text-gray-400",
                socialButtonsBlockButton: "border border-gray-700 bg-gray-800 text-foreground dark:text-white hover:bg-gray-700",
                formFieldInput: "bg-gray-800 border border-gray-700 text-foreground dark:text-white",
                footerActionLink: "text-emerald-500 hover:text-emerald-400",
              },
            }}
          >
            <KeyboardShortcutsProvider>
              {children}
            </KeyboardShortcutsProvider>
          </ClerkProvider>
          <FeedbackWidget />
          <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} richColors closeButton />
          <Analytics />
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-4FGR9B5JK4"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-4FGR9B5JK4');
            `}
          </Script>
        </ThemeProvider>
      </body>
    </html>
  )
}
