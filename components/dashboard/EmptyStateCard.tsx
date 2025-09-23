"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateCardProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  dashed?: boolean
}

export function EmptyStateCard({
  icon,
  title,
  description,
  action,
  className,
  dashed = true,
}: EmptyStateCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl p-12 bg-white/5 min-h-[500px]",
        dashed ? "border border-dashed border-white/20" : "border border-white/10",
        className,
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">{icon}</div>
      <h2 className="text-xl font-medium tracking-tight font-space-grotesk">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-base text-white/60">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}


