"use client"

import { CirclePlay } from "lucide-react"

interface WelcomeVideoButtonProps {
  onClick: () => void
}

export function WelcomeVideoButton({ onClick }: WelcomeVideoButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Watch welcome video"
      title="Watch welcome video"
      className="relative p-2 rounded-full bg-surface-subtle dark:bg-white/5 border border-border dark:border-white/10 backdrop-blur text-foreground/60 dark:text-white/60 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-500/50 dark:hover:border-emerald-400/50 transition-colors"
    >
      <CirclePlay className="h-4 w-4" />
    </button>
  )
}
