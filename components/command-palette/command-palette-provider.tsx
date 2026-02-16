"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

interface CommandPaletteContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  registerActions: (actions: Record<string, () => void>) => void
  unregisterActions: (keys: string[]) => void
  getAction: (key: string) => (() => void) | undefined
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null
)

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider"
    )
  }
  return ctx
}

interface CommandPaletteProviderProps {
  children: React.ReactNode
}

export function CommandPaletteProvider({
  children,
}: CommandPaletteProviderProps) {
  const [open, setOpen] = useState(false)
  const actionsRef = useRef<Record<string, () => void>>({})

  useKeyboardShortcuts([
    {
      key: "k",
      modifiers: { meta: true },
      handler: () => setOpen((prev) => !prev),
      description: "Open command palette",
      allowInInput: true,
    },
  ])

  const registerActions = useCallback(
    (actions: Record<string, () => void>) => {
      actionsRef.current = { ...actionsRef.current, ...actions }
    },
    []
  )

  const unregisterActions = useCallback((keys: string[]) => {
    for (const key of keys) {
      delete actionsRef.current[key]
    }
  }, [])

  const getAction = useCallback((key: string) => {
    return actionsRef.current[key]
  }, [])

  return (
    <CommandPaletteContext.Provider
      value={{ open, setOpen, registerActions, unregisterActions, getAction }}
    >
      {children}
    </CommandPaletteContext.Provider>
  )
}
