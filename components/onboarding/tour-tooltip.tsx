"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import type { TourStep, TooltipPosition } from "./tour-steps"

interface TourTooltipProps {
  step: TourStep
  stepNumber: number
  totalSteps: number
  targetRect: DOMRect | null
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

export function TourTooltip({
  step,
  stepNumber,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [arrowPosition, setArrowPosition] = useState<TooltipPosition>("top")

  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return

    const tooltip = tooltipRef.current
    const tooltipRect = tooltip.getBoundingClientRect()
    const padding = step.spotlightPadding || 8
    const arrowOffset = 12

    let top = 0
    let left = 0
    let finalPosition = step.position

    // Calculate position based on preferred position
    switch (step.position) {
      case "bottom":
        top = targetRect.bottom + padding + arrowOffset
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
        break
      case "top":
        top = targetRect.top - padding - tooltipRect.height - arrowOffset
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
        break
      case "left":
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
        left = targetRect.left - padding - tooltipRect.width - arrowOffset
        break
      case "right":
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
        left = targetRect.right + padding + arrowOffset
        break
    }

    // Viewport boundary checks
    const viewportPadding = 16
    const maxLeft = window.innerWidth - tooltipRect.width - viewportPadding
    const maxTop = window.innerHeight - tooltipRect.height - viewportPadding

    // Adjust if out of bounds
    if (left < viewportPadding) left = viewportPadding
    if (left > maxLeft) left = maxLeft
    if (top < viewportPadding) {
      // Flip to bottom if too high
      if (step.position === "top") {
        top = targetRect.bottom + padding + arrowOffset
        finalPosition = "bottom"
      } else {
        top = viewportPadding
      }
    }
    if (top > maxTop) {
      // Flip to top if too low
      if (step.position === "bottom") {
        top = targetRect.top - padding - tooltipRect.height - arrowOffset
        finalPosition = "top"
      } else {
        top = maxTop
      }
    }

    setPosition({ top, left })
    setArrowPosition(finalPosition)
  }, [targetRect, step])

  const isFirstStep = stepNumber === 0
  const isLastStep = stepNumber === totalSteps - 1

  return (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-[70] max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl",
        "dark:border-white/20 dark:bg-zinc-900"
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
      role="dialog"
      aria-label={step.title}
    >
      {/* Arrow */}
      <div
        className={cn(
          "absolute h-3 w-3 rotate-45 border bg-card",
          "dark:border-white/20 dark:bg-zinc-900",
          arrowPosition === "bottom" && "-top-1.5 left-1/2 -translate-x-1/2 border-l border-t",
          arrowPosition === "top" && "-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r",
          arrowPosition === "left" && "-right-1.5 top-1/2 -translate-y-1/2 border-r border-t",
          arrowPosition === "right" && "-left-1.5 top-1/2 -translate-y-1/2 border-b border-l"
        )}
      />

      {/* Close button */}
      <button
        onClick={onSkip}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Skip tour"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="pr-6">
        <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{step.content}</p>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                i === stepNumber
                  ? "bg-emerald-500"
                  : i < stepNumber
                    ? "bg-emerald-500/50"
                    : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              className="h-8 px-2"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}
          <Button
            size="sm"
            onClick={onNext}
            className="h-8 bg-emerald-500 px-3 hover:bg-emerald-400"
          >
            {isLastStep ? (
              "Get Started"
            ) : (
              <>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
