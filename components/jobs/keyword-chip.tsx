import { cn } from "@/lib/utils"

type ChipVariant = 'neutral' | 'good' | 'warn' | 'info'

interface KeywordChipProps {
  text: string
  variant?: ChipVariant
  className?: string
}

const variantStyles: Record<ChipVariant, string> = {
  neutral: 'border-white/10 bg-white/5',
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-200'
}

export function KeywordChip({ text, variant = 'neutral', className }: KeywordChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]',
        variantStyles[variant],
        className
      )}
    >
      {text}
    </span>
  )
}
