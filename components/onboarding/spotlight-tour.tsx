"use client"

import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { TourSpotlight } from "./tour-spotlight"
import { TourTooltip } from "./tour-tooltip"
import type { TourStep } from "./tour-steps"

interface SpotlightTourProps {
  steps: TourStep[]
  currentStep: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onComplete: () => void
}

export function SpotlightTour({
  steps,
  currentStep,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}: SpotlightTourProps) {
  const [mounted, setMounted] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)

  const step = steps[currentStep]

  // Find and track the target element
  const findTargetElement = useCallback(() => {
    if (!step?.target) return null
    const element = document.querySelector<HTMLElement>(step.target)
    return element
  }, [step?.target])

  // Update target rect when element changes or window resizes
  const updateTargetRect = useCallback(() => {
    const element = findTargetElement()
    setTargetElement(element)

    if (element) {
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)

      // Scroll element into view if needed
      const isInView =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth

      if (!isInView) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        })
        // Update rect after scroll
        setTimeout(() => {
          setTargetRect(element.getBoundingClientRect())
        }, 300)
      }
    } else {
      setTargetRect(null)
    }
  }, [findTargetElement])

  // Set mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update target when step changes
  useEffect(() => {
    if (!mounted) return

    // Small delay to allow any animations to complete
    const timeoutId = setTimeout(updateTargetRect, 100)

    return () => clearTimeout(timeoutId)
  }, [mounted, currentStep, updateTargetRect])

  // Handle window resize
  useEffect(() => {
    if (!mounted) return

    const handleResize = () => {
      updateTargetRect()
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("scroll", handleResize, true)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("scroll", handleResize, true)
    }
  }, [mounted, updateTargetRect])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSkip()
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        onNext()
      } else if (e.key === "ArrowLeft") {
        onPrev()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onNext, onPrev, onSkip])

  // Lock body scroll when tour is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  if (!mounted || !step) return null

  const isLastStep = currentStep === steps.length - 1

  return createPortal(
    <>
      {/* Spotlight overlay */}
      <TourSpotlight
        targetRect={targetRect}
        padding={step.spotlightPadding}
      />

      {/* Tooltip */}
      {targetRect && (
        <TourTooltip
          step={step}
          stepNumber={currentStep}
          totalSteps={steps.length}
          targetRect={targetRect}
          onNext={isLastStep ? onComplete : onNext}
          onPrev={onPrev}
          onSkip={onSkip}
        />
      )}

      {/* Fallback when target not found */}
      {!targetRect && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75">
          <div className="max-w-sm rounded-xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.content}</p>
            <p className="mt-4 text-xs text-amber-500">
              The target element could not be found. You may need to scroll or the page may still be loading.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onSkip}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Skip tour
              </button>
              <button
                onClick={onNext}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {isLastStep ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
