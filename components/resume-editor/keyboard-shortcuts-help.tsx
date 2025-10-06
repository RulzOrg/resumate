"use client"

import { useState } from "react"
import { Keyboard, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Shortcut {
  keys: string
  description: string
  category: string
}

const shortcuts: Shortcut[] = [
  { keys: "⌘/Ctrl + S", description: "Save resume", category: "General" },
  { keys: "⌘/Ctrl + Z", description: "Undo", category: "Editing" },
  { keys: "⌘/Ctrl + ⇧ + Z", description: "Redo", category: "Editing" },
  { keys: "⌘/Ctrl + K", description: "Show keyboard shortcuts", category: "General" },
  { keys: "⌘/Ctrl + B", description: "Bold text (in editors)", category: "Formatting" },
  { keys: "⌘/Ctrl + I", description: "Italic text (in editors)", category: "Formatting" },
  { keys: "Esc", description: "Close dialogs", category: "General" },
]

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  const categories = Array.from(new Set(shortcuts.map(s => s.category)))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition"
        >
          <Keyboard className="w-4 h-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-geist">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-white/80 mb-3 font-geist">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
                    >
                      <span className="text-sm text-white/80 font-geist">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white/10 border border-white/20 rounded font-geist">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-white/40 text-center font-geist mt-4">
          Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono">⌘/Ctrl + K</kbd> anytime to toggle this dialog
        </div>
      </DialogContent>
    </Dialog>
  )
}
