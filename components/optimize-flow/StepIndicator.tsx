"use client"

import { cn } from "@/lib/utils"
import { Check, Search, Pencil, Eye, ScanLine, Mic } from "lucide-react"
import type { FlowStep } from "@/lib/types/optimize-flow"

interface StepConfig {
  number: FlowStep
  title: string
  description: string
  icon: React.ReactNode
}

const STEPS: StepConfig[] = [
  {
    number: 1,
    title: "Analyze",
    description: "Match score & gaps",
    icon: <Search className="w-4 h-4" />,
  },
  {
    number: 2,
    title: "Rewrite",
    description: "X-Y-Z optimization",
    icon: <Pencil className="w-4 h-4" />,
  },
  {
    number: 3,
    title: "Review",
    description: "Full resume edit",
    icon: <Eye className="w-4 h-4" />,
  },
  {
    number: 4,
    title: "ATS Scan",
    description: "Compatibility check",
    icon: <ScanLine className="w-4 h-4" />,
  },
  {
    number: 5,
    title: "Interview",
    description: "Prepare answers",
    icon: <Mic className="w-4 h-4" />,
  },
]

interface StepIndicatorProps {
  currentStep: FlowStep
  completedSteps: FlowStep[]
  onStepClick?: (step: FlowStep) => void
}

export function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const isStepCompleted = (step: FlowStep) => completedSteps.includes(step)
  const isStepActive = (step: FlowStep) => step === currentStep
  const isStepClickable = (step: FlowStep) =>
    onStepClick && (isStepCompleted(step) || step <= Math.max(...completedSteps, currentStep))

  return (
    <div className="w-full">
      {/* Desktop view */}
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            {/* Step circle and content */}
            <button
              onClick={() => isStepClickable(step.number) && onStepClick?.(step.number)}
              disabled={!isStepClickable(step.number)}
              className={cn(
                "flex items-center gap-3 group transition-colors",
                isStepClickable(step.number) && "cursor-pointer",
                !isStepClickable(step.number) && "cursor-default"
              )}
            >
              {/* Circle */}
              <div
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                  isStepCompleted(step.number) &&
                    "bg-emerald-500 border-emerald-500 text-black",
                  isStepActive(step.number) &&
                    !isStepCompleted(step.number) &&
                    "border-emerald-500 text-emerald-500 bg-emerald-500/10",
                  !isStepActive(step.number) &&
                    !isStepCompleted(step.number) &&
                    "border-border dark:border-white/20 text-foreground/40 dark:text-white/40",
                  isStepClickable(step.number) &&
                    !isStepActive(step.number) &&
                    "group-hover:border-emerald-500/50"
                )}
              >
                {isStepCompleted(step.number) ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Text */}
              <div className="text-left">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isStepActive(step.number) || isStepCompleted(step.number)
                      ? "text-foreground dark:text-white"
                      : "text-foreground/50 dark:text-white/50",
                    isStepClickable(step.number) &&
                      !isStepActive(step.number) &&
                      "group-hover:text-foreground/70 dark:group-hover:text-white/70"
                  )}
                >
                  {step.title}
                </p>
                <p
                  className={cn(
                    "text-xs transition-colors",
                    isStepActive(step.number)
                      ? "text-emerald-500"
                      : "text-foreground/40 dark:text-white/40"
                  )}
                >
                  {step.description}
                </p>
              </div>
            </button>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div className="flex-1 mx-4">
                <div
                  className={cn(
                    "h-0.5 rounded-full transition-colors",
                    isStepCompleted(step.number)
                      ? "bg-emerald-500"
                      : "bg-border dark:bg-white/10"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile view */}
      <div className="sm:hidden">
        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                isStepCompleted(step.number)
                  ? "bg-emerald-500"
                  : isStepActive(step.number)
                  ? "bg-emerald-500/50"
                  : "bg-border dark:bg-white/10"
              )}
            />
          ))}
        </div>

        {/* Current step info */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full border-2",
              "border-emerald-500 text-emerald-500 bg-emerald-500/10"
            )}
          >
            {STEPS[currentStep - 1].icon}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground dark:text-white">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
            </p>
            <p className="text-xs text-emerald-500">
              {STEPS[currentStep - 1].description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
