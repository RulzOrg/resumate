import { cn } from "@/lib/utils"

interface KbdProps {
  children: React.ReactNode
  className?: string
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium",
        "bg-muted border border-border rounded text-muted-foreground",
        "min-w-[20px]",
        className
      )}
    >
      {children}
    </kbd>
  )
}
