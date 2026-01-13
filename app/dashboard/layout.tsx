import { getAuthenticatedUser } from "@/lib/user-data"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { OnboardingWrapper } from "@/components/onboarding/onboarding-wrapper"
import { getUserResumes } from "@/lib/db"
import Link from "next/link"

const WELCOME_VIDEO_URL = "https://www.tella.tv/video/vid_cmkcgmm5y041604jycs8l4ab0/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()
  if (!user?.id) {
    redirect("/auth/login")
  }

  // Fetch resumes to determine tour behavior
  const resumes = await getUserResumes(user.id).catch(() => [])
  const completedResumes = resumes.filter(
    (r: any) => r.processing_status === "completed" && (r.kind === "master" || r.kind === "uploaded")
  )

  // Show tour if user hasn't completed it yet
  const shouldShowTour = !user.tour_completed_at

  return (
    <OnboardingWrapper
      showVideoOnMount={!user.onboarding_completed_at}
      showTourAfterVideo={shouldShowTour}
      hasResumes={completedResumes.length > 0}
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
    </OnboardingWrapper>
  )
}
