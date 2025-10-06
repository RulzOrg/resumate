import { Loader2 } from "lucide-react"

interface BusyIndicatorProps {
  text: string
}

export function BusyIndicator({ text }: BusyIndicatorProps) {
  return (
    <div
      className="flex items-center gap-1 text-[11px] text-white/50 font-geist"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="w-3.5 h-3.5 animate-spin"
        aria-hidden="true"
      />
      <span>{text}</span>
    </div>
  )
}
