"use client"

import Link from "next/link"
import { FileSearch, ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResourceItem {
  label: string
  href: string
  icon: LucideIcon
  description: string
}

const RESOURCES_ITEMS: ResourceItem[] = [
  {
    label: "Resume Checker",
    href: "/resources/resume-checker",
    icon: FileSearch,
    description: "Free ATS compatibility score and optimization insights",
  },
  // Add more resources here as needed:
  // {
  //   label: "Resume Templates",
  //   href: "/resources/templates",
  //   icon: FileText,
  //   description: "Professional templates designed for ATS systems",
  // },
]

interface ResourcesMegaMenuProps {
  onItemClick?: () => void
}

export function ResourcesMegaMenu({ onItemClick }: ResourcesMegaMenuProps) {
  return (
    // Solid background wrapper - ensures no transparency
    <div
      className="w-full min-w-[320px] sm:min-w-[380px]"
      style={{ backgroundColor: 'inherit' }}
    >
      {/* Inner content with solid background */}
      <div className="bg-[#ffffff] dark:bg-[#0a0a0a] p-4 sm:p-5 rounded-2xl">
        {/* Header - High contrast for accessibility */}
        <div className="mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Resources
          </h3>
        </div>

        {/* Divider - Solid color */}
        <div className="mb-3 h-px bg-neutral-200 dark:bg-neutral-800" />

        {/* Items */}
        <nav role="menu" aria-label="Resources menu">
          {RESOURCES_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              role="menuitem"
              className={cn(
                "group relative flex items-center gap-4 rounded-xl p-3 sm:p-4",
                "transition-colors duration-150",
                // Solid hover backgrounds - no transparency
                "hover:bg-neutral-100 dark:hover:bg-neutral-900",
                // High contrast focus ring for accessibility
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                "focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0a0a0a]"
              )}
            >
              {/* Icon Container - Solid background */}
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                  "bg-sky-100 dark:bg-sky-900/50",
                  "transition-transform duration-150",
                  "group-hover:scale-105"
                )}
              >
                <item.icon
                  className="h-6 w-6 text-sky-600 dark:text-sky-400"
                  aria-hidden="true"
                />
              </div>

              {/* Content - High contrast text */}
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-neutral-900 dark:text-white">
                  {item.label}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Arrow indicator */}
              <ChevronRight
                className={cn(
                  "h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-500",
                  "transition-transform duration-150",
                  "group-hover:translate-x-0.5 group-hover:text-neutral-600 dark:group-hover:text-neutral-300"
                )}
                aria-hidden="true"
              />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

export { RESOURCES_ITEMS }
