import React from "react"
import { Lightbulb, Info, LucideIcon } from "lucide-react"

interface TipsSectionProps {
  title: string
  description?: string
  tips?: string[]
  content?: React.ReactNode
  footerHint?: string
  variant?: "cyan" | "amber" | "purple" | "emerald"
  icon?: LucideIcon
}

const variantStyles = {
  cyan: {
    iconBg: "bg-cyan-500/15 ring-cyan-500/30",
    iconColor: "text-cyan-300",
    dotBg: "bg-cyan-400 ring-cyan-400/40"
  },
  amber: {
    iconBg: "bg-amber-500/15 ring-amber-500/30",
    iconColor: "text-amber-300",
    dotBg: "bg-amber-400 ring-amber-400/40"
  },
  purple: {
    iconBg: "bg-purple-500/15 ring-purple-500/30",
    iconColor: "text-purple-300",
    dotBg: "bg-purple-400 ring-purple-400/40"
  },
  emerald: {
    iconBg: "bg-emerald-500/15 ring-emerald-500/30",
    iconColor: "text-emerald-300",
    dotBg: "bg-emerald-400 ring-emerald-400/40"
  }
}

export function TipsSection({ 
  title, 
  description, 
  tips, 
  content,
  footerHint, 
  variant = "cyan",
  icon: Icon = Lightbulb
}: TipsSectionProps) {
  const styles = variantStyles[variant]
  
  return (
    <div className="bg-slate-900/80 ring-slate-700/80 ring-1 rounded-xl mt-5">
      {/* Header */}
      <div className="flex gap-2 md:px-4 border-slate-800/80 border-b pt-2.5 pr-3 pb-2.5 pl-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${styles.iconBg} ring-1 ring-inset`}>
            <Icon className={`h-3.5 w-3.5 ${styles.iconColor}`} />
          </div>
          <div>
            <h2 className="text-xs font-medium tracking-tight text-slate-100">{title}</h2>
            {description && <p className="text-[10px] text-slate-400">{description}</p>}
          </div>
        </div>
      </div>

      {/* Tips List or Custom Content */}
      <div className="px-3 py-3 md:px-4 md:py-3">
        {content ? (
          <div className="text-xs text-slate-200">{content}</div>
        ) : tips ? (
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li key={index} className="flex gap-2">
                <span className={`mt-0.5 inline-flex h-1.5 w-1.5 flex-none rounded-full ${styles.dotBg} ring-1 ring-offset-1 ring-offset-slate-900`}></span>
                <p className="text-xs leading-relaxed text-slate-200">{tip}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Footer hint */}
        {footerHint && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
            <Info className="h-3 w-3 text-slate-500" />
            <span>{footerHint}</span>
          </div>
        )}
      </div>
    </div>
  )
}
