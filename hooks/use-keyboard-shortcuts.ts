"use client"

import { useEffect, useCallback } from "react"

export interface ShortcutConfig {
  key: string
  modifiers?: {
    meta?: boolean
    shift?: boolean
    alt?: boolean
  }
  handler: () => void
  description: string
  enabled?: boolean
  preventDefault?: boolean
  allowInInput?: boolean
}

function isInputElement(element: Element | null): boolean {
  if (!element) return false
  const tagName = element.tagName.toLowerCase()
  if (tagName === "input" || tagName === "textarea") return true
  if ((element as HTMLElement).isContentEditable) return true
  return false
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac =
        typeof navigator !== "undefined" &&
        navigator.platform.toUpperCase().indexOf("MAC") >= 0

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue

        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase()
        if (!keyMatches) continue

        const modifiers = shortcut.modifiers || {}

        const metaRequired = modifiers.meta ?? false
        const shiftRequired = modifiers.shift ?? false
        const altRequired = modifiers.alt ?? false

        const metaPressed = isMac ? event.metaKey : event.ctrlKey
        const metaMatches = metaRequired === metaPressed
        const shiftMatches = shiftRequired === event.shiftKey
        const altMatches = altRequired === event.altKey

        if (!metaMatches || !shiftMatches || !altMatches) continue

        if (!shortcut.allowInInput && isInputElement(document.activeElement)) {
          continue
        }

        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }

        shortcut.handler()
        return
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
