import { getAuthenticatedUser } from "@/lib/user-data"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { WelcomeVideoProvider } from "@/components/providers/welcome-video-provider"
import Link from "next/link"

const WELCOME_VIDEO_URL = "/videos/welcome.mp4"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()
  if (!user?.id) {
    redirect("/auth/login")
  }

  return (
    <WelcomeVideoProvider
      showOnMount={!user.onboarding_completed_at}
      videoUrl={WELCOME_VIDEO_URL}
    >
      <div className="antialiased text-foreground bg-background font-geist min-h-screen">
        <div className="absolute top-0 left-0 w-full h-[400px] -z-10 gradient-blur" />

        <DashboardHeader user={user as any} />

        {children}

        <footer className="border-t border-border dark:border-white/20 mt-16">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-foreground/50 dark:text-white/50">&copy; {new Date().getFullYear()} Useresumate</p>
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                  Dashboard
                </Link>
                <Link href="/dashboard/settings" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                  Settings
                </Link>
                <Link href="/pricing" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                  Pricing
                </Link>
                <Link href="/terms" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                  Terms
                </Link>
                <Link href="/privacy" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                  Privacy
                </Link>
                <Link href="/support" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white">
                  Support
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </WelcomeVideoProvider>
  )
}
