"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Check, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProcessingStep {
  label: string
  status: "pending" | "active" | "completed"
}

export interface ProcessingOverlayProps {
  isOpen: boolean
  title: string
  steps: ProcessingStep[]
  currentStepIndex: number
  progress?: number
  icon?: React.ReactNode
  subtitle?: string
  onCancel?: () => void
  showCancel?: boolean
  error?: string | null
  onRetry?: () => void
  timeout?: number
}

function StepIndicator({ step }: { step: ProcessingStep }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2",
        step.status === "pending" && "opacity-40",
        step.status === "active" && "opacity-100",
        step.status === "completed" && "opacity-70"
      )}
    >
      <div className="flex items-center justify-center w-5 h-5">
        {step.status === "completed" && (
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-primary" />
          </div>
        )}
        {step.status === "active" && (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        )}
        {step.status === "pending" && (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>

      <span
        className={cn(
          "text-sm",
          step.status === "completed" && "text-primary",
          step.status === "active" && "text-foreground font-medium",
          step.status === "pending" && "text-muted-foreground"
        )}
      >
        {step.label}
      </span>
    </div>
  )
}

function OverlayContent({
  title,
  steps,
  progress,
  icon,
  subtitle,
  onCancel,
  showCancel,
  error,
  onRetry,
  timeout = 30000,
}: Omit<ProcessingOverlayProps, "isOpen" | "currentStepIndex">) {
  const completedSteps = steps.filter((s) => s.status === "completed").length
  const displayProgress = progress ?? Math.round((completedSteps / steps.length) * 100)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)

  useEffect(() => {
    if (error) return
    const timer = setTimeout(() => setShowTimeoutWarning(true), timeout)
    return () => clearTimeout(timer)
  }, [timeout, error])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="processing-title"
      aria-describedby={subtitle ? "processing-subtitle" : undefined}
      aria-busy="true"
      aria-live="polite"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            {icon || (
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
            )}
          </div>

          {/* Title */}
          <h2
            id="processing-title"
            className="text-lg font-semibold text-center mb-1 text-foreground"
          >
            {title}
          </h2>

          {subtitle && (
            <p id="processing-subtitle" className="text-sm text-muted-foreground text-center mb-5">
              {subtitle}
            </p>
          )}

          {/* Error state */}
          {error ? (
            <div className="mt-4 space-y-4">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>

              {/* Progress text */}
              <p className="text-xs text-muted-foreground text-center mb-5">
                {displayProgress}% completed
              </p>

              {/* Timeout warning */}
              {showTimeoutWarning && (
                <div className="flex items-center gap-2 p-2.5 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Taking longer than expected...
                  </p>
                </div>
              )}

              {/* Steps */}
              <div className="space-y-0.5">
                {steps.map((step, index) => (
                  <StepIndicator key={index} step={step} />
                ))}
              </div>
            </>
          )}

          {/* Cancel button */}
          {showCancel && onCancel && !error && (
            <button
              onClick={onCancel}
              className="mt-5 w-full py-2 px-4 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProcessingOverlay(props: ProcessingOverlayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (props.isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [props.isOpen])

  useEffect(() => {
    if (!props.isOpen || !props.onCancel || !props.showCancel) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onCancel?.()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [props.isOpen, props.onCancel, props.showCancel])

  if (!mounted || !props.isOpen) return null

  return createPortal(<OverlayContent {...props} />, document.body)
}

// Helper hook to manage processing steps
export function useProcessingSteps(stepLabels: string[]) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const steps: ProcessingStep[] = stepLabels.map((label, index) => ({
    label,
    status:
      index < currentStep
        ? "completed"
        : index === currentStep && isProcessing
        ? "active"
        : "pending",
  }))

  const start = () => {
    setCurrentStep(0)
    setIsProcessing(true)
  }

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, stepLabels.length - 1))
  }

  const complete = () => {
    setCurrentStep(stepLabels.length)
    setIsProcessing(false)
  }

  const reset = () => {
    setCurrentStep(0)
    setIsProcessing(false)
  }

  return {
    steps,
    currentStep,
    isProcessing,
    start,
    nextStep,
    complete,
    reset,
    setCurrentStep,
    setIsProcessing,
  }
}
