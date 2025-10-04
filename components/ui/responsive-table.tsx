"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

/**
 * Responsive table wrapper
 * - Shows table on desktop (md and up)
 * - Hides table on mobile
 */
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop table - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        {children}
      </div>
    </div>
  )
}

interface MobileCardListProps {
  children: ReactNode
  className?: string
}

/**
 * Mobile card list wrapper
 * - Shows on mobile (below md breakpoint)
 * - Hidden on desktop
 */
export function MobileCardList({ children, className }: MobileCardListProps) {
  return (
    <div className={cn("md:hidden space-y-3", className)}>
      {children}
    </div>
  )
}

interface MobileCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

/**
 * Individual mobile card
 * Styled to match the table row design
 */
export function MobileCard({ children, className, onClick }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-white/10 bg-neutral-900/40 p-4 space-y-3 transition-colors",
        onClick && "cursor-pointer hover:bg-white/[0.04]",
        className
      )}
    >
      {children}
    </div>
  )
}

interface MobileCardRowProps {
  label: string
  children: ReactNode
  className?: string
}

/**
 * Row within mobile card (label + value)
 */
export function MobileCardRow({ label, children, className }: MobileCardRowProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <span className="text-xs font-medium text-white/60 shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-white/90 text-right flex-1">{children}</div>
    </div>
  )
}
