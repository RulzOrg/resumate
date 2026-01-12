"use client"

import { useState, useEffect } from "react"

export function usePlatform() {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        navigator.platform.toUpperCase().indexOf("MAC") >= 0
    )
  }, [])

  return {
    isMac,
    modifierKey: isMac ? "⌘" : "Ctrl",
    modifierKeyCode: isMac ? "metaKey" : "ctrlKey",
  }
}
