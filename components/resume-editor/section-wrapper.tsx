"use client"

import { useState, ReactNode } from 'react'
import { ChevronDown, Wand2 } from 'lucide-react'

interface SectionWrapperProps {
  title: string
  children: ReactNode
  onEnhance?: () => void
  defaultExpanded?: boolean
}

export function SectionWrapper({ 
  title, 
  children, 
  onEnhance,
  defaultExpanded = true 
}: SectionWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
          className="group inline-flex items-center gap-2"
        >
          <span className="h-7 w-7 rounded-md bg-neutral-800 flex items-center justify-center">
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} 
            />
          </span>
          <h2 className="text-lg sm:text-xl tracking-tight font-semibold">{title}</h2>
        </button>
        
        {onEnhance && (
          <button
            type="button"
            onClick={onEnhance}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm font-medium transition"
          >
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Enhance</span>
          </button>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 sm:px-6 py-5">
          {children}
        </div>
      )}
    </div>
  )
}
