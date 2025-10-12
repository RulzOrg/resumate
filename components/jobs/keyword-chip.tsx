import { cn } from "@/lib/utils"

type ChipVariant = 'neutral' | 'good' | 'warn' | 'info'

interface KeywordChipProps {
  text: string
  variant?: ChipVariant
  className?: string
}

const variantStyles: Record<ChipVariant, string> = {
  neutral: 'border-border bg-secondary text-secondary-foreground',
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
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
