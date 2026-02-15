import type { LucideIcon } from "lucide-react"

export interface CommandDef {
  id: string
  label: string
  icon: LucideIcon
  shortcut?: string[]
  group: string
  keywords?: string
  available?: boolean
  action: () => void
}
