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
  iconColor = "text-emerald-300",
}: KpiCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/60 font-geist">{title}</p>
          <p className="mt-1 text-2xl tracking-tight font-space-grotesk font-semibold">
            {value}
          </p>
        </div>
        <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
      </div>
      <p className="mt-3 text-xs text-emerald-200/80 font-geist">{subtitle}</p>
    </div>
  )
}
