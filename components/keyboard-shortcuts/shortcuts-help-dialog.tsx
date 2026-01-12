"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePlatform } from "@/hooks/use-platform"
import { Kbd } from "./kbd"

interface ShortcutsHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: ShortcutsHelpDialogProps) {
  const { modifierKey } = usePlatform()

  const shortcuts = [
    { keys: [modifierKey, "D"], description: "Download resume as DOCX" },
    { keys: [modifierKey, "C"], description: "Copy resume content" },
    { keys: [modifierKey, "S"], description: "Save changes" },
    { keys: [modifierKey, "P"], description: "Preview as HTML" },
    { keys: ["Esc"], description: "Close dialog" },
    { keys: ["Shift", "?"], description: "Show this help" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {shortcuts.map(({ keys, description }) => (
            <div
              key={description}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">
                {description}
              </span>
              <div className="flex gap-1">
                {keys.map((key, index) => (
                  <Kbd key={`${key}-${index}`}>{key}</Kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Shortcuts are active on resume viewer pages.
        </p>
      </DialogContent>
    </Dialog>
  )
}
