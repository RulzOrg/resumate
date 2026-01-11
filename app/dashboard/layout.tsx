import { getAuthenticatedUser } from "@/lib/user-data"
import { WelcomeVideoProvider } from "@/components/providers/welcome-video-provider"

const WELCOME_VIDEO_URL = "/videos/welcome.mp4"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()
  const showOnMount = user?.id && !user?.onboarding_completed_at

  return (
    <WelcomeVideoProvider
      showOnMount={!!showOnMount}
      videoUrl={WELCOME_VIDEO_URL}
    >
      {children}
    </WelcomeVideoProvider>
  )
}
