"use client"

import { Loader2, Check, AlertCircle, Cloud } from "lucide-react"
import { cn } from "@/lib/utils"

interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
  lastSaved?: Date | null
  error?: string | null
  className?: string
}

export function AutoSaveIndicator({ 
  status, 
  lastSaved, 
  error,
  className 
}: AutoSaveIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: Loader2,
          text: 'Saving...',
          color: 'text-blue-400',
          iconClass: 'animate-spin'
        }
      case 'saved':
        return {
          icon: Check,
          text: lastSaved 
            ? `Saved at ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Saved',
          color: 'text-emerald-400',
          iconClass: ''
        }
      case 'error':
        return {
          icon: AlertCircle,
          text: error || 'Failed to save',
          color: 'text-red-400',
          iconClass: ''
        }
      case 'idle':
      default:
        return {
          icon: Cloud,
          text: 'Auto-save enabled',
          color: 'text-white/40',
          iconClass: ''
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className={cn("flex items-center gap-2 text-xs font-geist", config.color, className)}>
      <Icon className={cn("w-3.5 h-3.5", config.iconClass)} />
      <span>{config.text}</span>
    </div>
  )
}
