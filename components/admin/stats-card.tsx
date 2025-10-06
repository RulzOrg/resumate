import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  className?: string
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  className 
}: StatsCardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-white/10 bg-white/5 p-4",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-white/60 font-geist">{title}</p>
          <p className="text-3xl font-bold text-white mt-2 font-geist">{value}</p>
          {description && (
            <p className="text-xs text-white/50 mt-1 font-geist">{description}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={cn(
                "text-xs font-medium",
                trend.positive ? "text-emerald-400" : "text-red-400"
              )}>
                {trend.positive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-xs text-white/50">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Icon className="w-6 h-6 text-emerald-400" />
        </div>
      </div>
    </div>
  )
}
