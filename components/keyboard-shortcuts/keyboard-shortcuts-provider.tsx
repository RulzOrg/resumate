"use client"

import { useState } from "react"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { ShortcutsHelpDialog } from "./shortcuts-help-dialog"

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode
}

export function KeyboardShortcutsProvider({
  children,
}: KeyboardShortcutsProviderProps) {
  const [showHelp, setShowHelp] = useState(false)

  useKeyboardShortcuts([
    {
      key: "?",
      modifiers: { shift: true },
      handler: () => setShowHelp(true),
      description: "Show keyboard shortcuts",
    },
  ])

  return (
    <>
      {children}
      <ShortcutsHelpDialog open={showHelp} onOpenChange={setShowHelp} />
    </>
  )
}
