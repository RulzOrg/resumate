"use client"

import { useState, useCallback } from "react"
import type { ParsedResume } from "@/lib/resume-parser"

const MAX_HISTORY = 50

export function useResumeEditor(initialData: ParsedResume) {
  const [resumeData, setResumeData] = useState<ParsedResume>(initialData)
  const [hasChanges, setHasChanges] = useState(false)
  const [past, setPast] = useState<ParsedResume[]>([])
  const [future, setFuture] = useState<ParsedResume[]>([])

  const updateResumeData = useCallback(
    (updates: Partial<ParsedResume>) => {
      setResumeData((prev) => {
        setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), structuredClone(prev)])
        setFuture([])
        return { ...prev, ...updates }
      })
      setHasChanges(true)
    },
    []
  )

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p
      const previous = p[p.length - 1]
      setResumeData((current) => {
        setFuture((f) => [structuredClone(current), ...f].slice(0, MAX_HISTORY))
        return previous
      })
      setHasChanges(true)
      return p.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f
      const next = f[0]
      setResumeData((current) => {
        setPast((p) => [...p, structuredClone(current)].slice(-MAX_HISTORY))
        return next
      })
      setHasChanges(true)
      return f.slice(1)
    })
  }, [])

  const resetHistory = useCallback(() => {
    setPast([])
    setFuture([])
  }, [])

  return {
    resumeData,
    setResumeData,
    hasChanges,
    setHasChanges,
    updateResumeData,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    resetHistory,
  }
}
