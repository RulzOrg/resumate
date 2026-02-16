"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Lightbulb, X } from "lucide-react"
import type { ScoreHint } from "@/lib/ats-checker/live-score"

interface ScoreHintsProps {
  hints: ScoreHint[]
  onDismiss: (index: number) => void
}

function HintIcon({ type }: { type: ScoreHint["type"] }) {
  switch (type) {
    case "improvement":
      return <TrendingUp className="h-3.5 w-3.5 shrink-0 text-primary" />
    case "warning":
      return <TrendingDown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
    case "tip":
      return <Lightbulb className="h-3.5 w-3.5 shrink-0 text-blue-500" />
  }
}

function hintBorderColor(type: ScoreHint["type"]) {
  switch (type) {
    case "improvement":
      return "border-primary/30 bg-primary/5"
    case "warning":
      return "border-amber-500/30 bg-amber-500/5"
    case "tip":
      return "border-blue-500/30 bg-blue-500/5"
  }
}

function HintCard({
  hint,
  onDismiss,
  index,
}: {
  hint: ScoreHint
  onDismiss: (index: number) => void
  index: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-md border text-xs transition-all duration-300 ${hintBorderColor(hint.type)} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <HintIcon type={hint.type} />
      <span className="flex-1 text-foreground/80 leading-relaxed">
        {hint.message}
      </span>
      <button
        onClick={() => onDismiss(index)}
        className="shrink-0 p-0.5 rounded hover:bg-muted/50 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-label="Dismiss hint"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export function ScoreHints({ hints, onDismiss }: ScoreHintsProps) {
  if (hints.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5" aria-live="polite" aria-label="Score change hints">
      {hints.map((hint, i) => (
        <HintCard
          key={`${hint.message}-${i}`}
          hint={hint}
          onDismiss={onDismiss}
          index={i}
        />
      ))}
    </div>
  )
}
