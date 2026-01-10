"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { WelcomeVideoModal } from "@/components/dashboard/welcome-video-modal"

interface WelcomeVideoContextType {
  openWelcomeVideo: () => void
  isOpen: boolean
}

const WelcomeVideoContext = createContext<WelcomeVideoContextType | null>(null)

interface WelcomeVideoProviderProps {
  children: ReactNode
  showOnMount: boolean
  videoUrl: string
}

export function WelcomeVideoProvider({
  children,
  showOnMount,
  videoUrl,
}: WelcomeVideoProviderProps) {
  const [isOpen, setIsOpen] = useState(showOnMount)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)

  const openWelcomeVideo = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleComplete = useCallback(async () => {
    if (hasCompletedOnboarding) return

    try {
      await fetch("/api/user/onboarding/complete", {
        method: "POST",
      })
      setHasCompletedOnboarding(true)
    } catch (error) {
      console.error("Failed to mark onboarding complete:", error)
    }
  }, [hasCompletedOnboarding])

  return (
    <WelcomeVideoContext.Provider value={{ openWelcomeVideo, isOpen }}>
      {children}
      <WelcomeVideoModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onComplete={handleComplete}
        videoUrl={videoUrl}
      />
    </WelcomeVideoContext.Provider>
  )
}

export function useWelcomeVideo() {
  const context = useContext(WelcomeVideoContext)
  if (!context) {
    throw new Error("useWelcomeVideo must be used within a WelcomeVideoProvider")
  }
  return context
}
