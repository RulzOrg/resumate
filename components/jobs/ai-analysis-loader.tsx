"use client"

import { useEffect, useState } from "react"
import { Loader2, Sparkles, FileSearch, Brain, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIAnalysisLoaderProps {
  className?: string
}

const analysisSteps = [
  { icon: FileSearch, label: "Reading job description", duration: 2000 },
  { icon: Brain, label: "Analyzing requirements", duration: 3000 },
  { icon: Sparkles, label: "Computing match score", duration: 2500 },
  { icon: CheckCircle2, label: "Generating insights", duration: 2000 }
]

export function AIAnalysisLoader({ className }: AIAnalysisLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const totalDuration = analysisSteps.reduce((acc, step) => acc + step.duration, 0)
    let elapsed = 0

    const interval = setInterval(() => {
      elapsed += 100
      const newProgress = Math.min((elapsed / totalDuration) * 100, 95) // Cap at 95%
      setProgress(newProgress)

      // Update step based on progress
      let cumulativeDuration = 0
      for (let i = 0; i < analysisSteps.length; i++) {
        cumulativeDuration += analysisSteps[i].duration
        if (elapsed < cumulativeDuration) {
          setCurrentStep(i)
          break
        }
      }

      if (elapsed >= totalDuration) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const CurrentIcon = analysisSteps[currentStep]?.icon || Sparkles

  return (
    <div className={cn("rounded-xl border border-white/10 bg-white/5 p-6", className)}>
      <div className="max-w-md mx-auto space-y-6">
        {/* Icon and Loading Spinner */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-20 h-20 animate-spin text-emerald-500/20" />
          </div>
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10">
              <CurrentIcon className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Current Step Label */}
        <div className="text-center">
          <h3 className="text-lg font-medium text-white mb-2 font-geist">
            Analyzing Job Description
          </h3>
          <p className="text-sm text-white/60 font-geist">
            {analysisSteps[currentStep]?.label || "Processing..."}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40 font-mono">
            <span>{Math.round(progress)}%</span>
            <span>~{Math.ceil((100 - progress) / 10)} sec</span>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          {analysisSteps.map((step, index) => {
            const Icon = step.icon
            const isComplete = index < currentStep
            const isCurrent = index === currentStep
            
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 text-sm font-geist transition-opacity",
                  isCurrent ? "text-emerald-400" : isComplete ? "text-emerald-400/60" : "text-white/30"
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isCurrent && "animate-pulse")} />
                )}
                <span>{step.label}</span>
                {isCurrent && (
                  <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                )}
              </div>
            )
          })}
        </div>

        {/* Tip */}
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-white/40 text-center font-geist">
            💡 Tip: More detailed job descriptions yield better match scores
          </p>
        </div>
      </div>
    </div>
  )
}
