import { ShieldCheck, AlertTriangle, Info } from "lucide-react"
import { KeywordChip } from "./keyword-chip"
import type { ATSCheck } from "@/lib/client-analysis"

interface ATSCheckItemProps {
  check: ATSCheck
}

export function ATSCheckItem({ check }: ATSCheckItemProps) {
  const { level, text } = check
  
  let palette = 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5'
  let IconComponent = ShieldCheck
  let iconColor = 'text-emerald-700 dark:text-emerald-400'
  let badgeVariant: 'good' | 'warn' | 'info' = 'good'
  let badgeText = 'OK'
  
  if (level === 'warn') {
    palette = 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5'
    IconComponent = AlertTriangle
    iconColor = 'text-amber-700 dark:text-amber-400'
    badgeVariant = 'warn'
    badgeText = 'Review'
  } else if (level === 'info') {
    palette = 'border-sky-500/30 bg-sky-500/10 dark:bg-sky-500/5'
    IconComponent = Info
    iconColor = 'text-sky-700 dark:text-sky-400'
    badgeVariant = 'info'
    badgeText = 'Info'
  }
  
  return (
    <div className={`rounded-lg border ${palette} px-3 py-2 flex items-center justify-between`}>
      <div className="flex items-center gap-2 text-sm">
        <IconComponent className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
        <span className="font-geist text-foreground">{text}</span>
      </div>
      <KeywordChip text={badgeText} variant={badgeVariant} />
    </div>
  )
}
