import { LucideIcon } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  iconColor?: string
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-emerald-600 dark:text-emerald-300",
}: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-geist">{title}</p>
          <p className="mt-1 text-2xl tracking-tight font-space-grotesk font-semibold text-foreground">
            {value}
          </p>
        </div>
        <div className="h-9 w-9 rounded-full bg-muted border border-border flex items-center justify-center">
          <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
      </div>
      <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300 font-geist">{subtitle}</p>
    </div>
  )
}
