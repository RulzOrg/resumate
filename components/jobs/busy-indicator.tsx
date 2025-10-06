import { Loader2 } from "lucide-react"

interface BusyIndicatorProps {
  text: string
}

export function BusyIndicator({ text }: BusyIndicatorProps) {
  return (
    <div className="flex items-center gap-1 text-[11px] text-white/50 font-geist">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      <span>{text}</span>
    </div>
  )
}
