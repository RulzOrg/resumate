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
      className="relative p-2 rounded-full bg-surface-subtle border border-border backdrop-blur text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
    >
      <CirclePlay className="h-4 w-4" />
    </button>
  )
}
