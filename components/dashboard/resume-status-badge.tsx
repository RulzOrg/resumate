"use client"

import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResumeStatusBadgeProps {
  status: "pending" | "processing" | "completed" | "failed"
  message?: string
  className?: string
}

export function ResumeStatusBadge({ status, message, className }: ResumeStatusBadgeProps) {
  const variants = {
    pending: {
      icon: Clock,
      label: "Queued",
      variant: "secondary" as const,
      className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      animate: false,
    },
    processing: {
      icon: Loader2,
      label: "Processing",
      variant: "secondary" as const,
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      animate: true,
    },
    completed: {
      icon: CheckCircle2,
      label: "Ready",
      variant: "default" as const,
      className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      animate: false,
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      variant: "destructive" as const,
      className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      animate: false,
    },
  }

  const config = variants[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      <Icon
        className={cn("w-3 h-3 mr-1", config.animate && "animate-spin")}
      />
      {message || config.label}
    </Badge>
  )
}
