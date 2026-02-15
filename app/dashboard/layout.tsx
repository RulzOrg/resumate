import { getAuthenticatedUser } from "@/lib/user-data"
import { redirect } from "next/navigation"
import { OnboardingWrapper } from "@/components/onboarding/onboarding-wrapper"
import { getUserResumes } from "@/lib/db"
import { AppLayout } from "@/components/dashboard/app-layout"

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
      <div className="antialiased text-foreground bg-background font-sans min-h-screen">
        <AppLayout user={user as any}>
          {children}
        </AppLayout>
      </div>
    </OnboardingWrapper>
  )
}
