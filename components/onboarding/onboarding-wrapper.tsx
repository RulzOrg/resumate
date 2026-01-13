"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import { WelcomeVideoModal } from "@/components/dashboard/welcome-video-modal"
import { TOUR_STEPS, TOUR_STEPS_NO_RESUMES, type TourStep } from "./tour-steps"
import { SpotlightTour } from "./spotlight-tour"

// Combined context for both video and tour state
interface OnboardingContextType {
  // Video controls
  openWelcomeVideo: () => void
  isVideoOpen: boolean
  // Tour controls
  isTourActive: boolean
  currentStep: number
  totalSteps: number
  startTour: () => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  completeTour: () => void
  getCurrentStep: () => TourStep | null
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

interface OnboardingWrapperProps {
  children: ReactNode
  showVideoOnMount: boolean
  showTourAfterVideo: boolean
  hasResumes: boolean
  videoUrl: string
}

export function OnboardingWrapper({
  children,
  showVideoOnMount,
  showTourAfterVideo,
  hasResumes,
  videoUrl,
}: OnboardingWrapperProps) {
  // Video state
  const [isVideoOpen, setIsVideoOpen] = useState(showVideoOnMount)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)

  // Tour state
  const [isTourActive, setIsTourActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasCompletedTour, setHasCompletedTour] = useState(false)

  // Use different tour steps based on whether user has resumes
  // Users with no resumes see upload prompt, users with resumes see full tour with select prompt
  const activeTourSteps = hasResumes ? TOUR_STEPS : TOUR_STEPS_NO_RESUMES
  const totalSteps = activeTourSteps.length

  // Video controls
  const openWelcomeVideo = useCallback(() => {
    setIsVideoOpen(true)
  }, [])

  const handleVideoComplete = useCallback(async () => {
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

  const handleVideoOpenChange = useCallback(
    (open: boolean) => {
      setIsVideoOpen(open)

      // When video closes, start the tour if appropriate
      if (!open && showTourAfterVideo && !hasCompletedTour) {
        // Small delay to allow video modal to fully close
        setTimeout(() => {
          setIsTourActive(true)
        }, 400)
      }
    },
    [showTourAfterVideo, hasCompletedTour]
  )

  // Tour controls
  const startTour = useCallback(() => {
    if (hasCompletedTour) return
    setCurrentStep(0)
    setIsTourActive(true)
  }, [hasCompletedTour])

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep, totalSteps])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const completeTour = useCallback(async () => {
    if (hasCompletedTour) return

    setIsTourActive(false)
    setHasCompletedTour(true) // Always set locally to prevent re-triggering

    // Only persist to DB if user has seen the full tour
    // Users without resumes will see the tour again after page refresh
    if (hasResumes) {
      try {
        await fetch("/api/user/onboarding/complete-tour", {
          method: "POST",
        })
      } catch (error) {
        console.error("Failed to mark tour complete:", error)
      }
    }
  }, [hasCompletedTour, hasResumes])

  const skipTour = useCallback(() => {
    completeTour()
  }, [completeTour])

  const getCurrentStep = useCallback(() => {
    return activeTourSteps[currentStep] || null
  }, [currentStep, activeTourSteps])

  // If tour should show but video doesn't need to show first
  useEffect(() => {
    if (showTourAfterVideo && !showVideoOnMount && !hasCompletedTour && !isTourActive) {
      // No video to show, start tour directly
      setTimeout(() => {
        setIsTourActive(true)
      }, 500)
    }
  }, [showTourAfterVideo, showVideoOnMount, hasCompletedTour, isTourActive])

  const contextValue: OnboardingContextType = {
    // Video
    openWelcomeVideo,
    isVideoOpen,
    // Tour
    isTourActive,
    currentStep,
    totalSteps,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    getCurrentStep,
  }

  const isLastStep = currentStep === totalSteps - 1

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}

      {/* Welcome Video Modal */}
      <WelcomeVideoModal
        open={isVideoOpen}
        onOpenChange={handleVideoOpenChange}
        onComplete={handleVideoComplete}
        videoUrl={videoUrl}
      />

      {/* Spotlight Tour */}
      {isTourActive && (
        <SpotlightTour
          steps={activeTourSteps}
          currentStep={currentStep}
          onNext={isLastStep ? completeTour : nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          onComplete={completeTour}
        />
      )}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  return context
}
