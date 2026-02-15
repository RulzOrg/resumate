"use client"

import { CheckCircle, ArrowRight } from "lucide-react"

interface ChangesPanelProps {
  changesMade: string[]
  sectionsImproved: string[]
}

export function ChangesPanel({ changesMade, sectionsImproved }: ChangesPanelProps) {
  if (changesMade.length === 0) {
    return (
      <div className="py-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          No changes recorded for this optimization.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Re-optimize this resume to see detailed change tracking.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sectionsImproved.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border">
          {sectionsImproved.map((section) => (
            <span
              key={section}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              <ArrowRight className="h-3 w-3" />
              {section}
            </span>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {changesMade.map((change, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span className="text-foreground/90">{change}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
