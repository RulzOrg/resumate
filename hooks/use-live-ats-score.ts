"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { ParsedResume } from "@/lib/resume-parser"
import {
  computeLiveScore,
  generateHints,
  type LiveATSResult,
  type ScoreHint,
} from "@/lib/ats-checker/live-score"

const DEBOUNCE_MS = 500
const HINT_TTL_MS = 6000
const MAX_HINTS = 3

export function useLiveATSScore(
  resumeData: ParsedResume,
  jobDescription?: string
) {
  const [score, setScore] = useState<LiveATSResult | null>(null)
  const [previousScore, setPreviousScore] = useState<number | null>(null)
  const [scoreDelta, setScoreDelta] = useState(0)
  const [isCalculating, setIsCalculating] = useState(false)
  const [recentHints, setRecentHints] = useState<ScoreHint[]>([])

  const previousResultRef = useRef<LiveATSResult | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const isFirstRun = useRef(true)

  // Cleanup hint timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of hintTimersRef.current) clearTimeout(timer)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // Debounced scoring
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Run immediately on first mount, debounce subsequent changes
    const delay = isFirstRun.current ? 0 : DEBOUNCE_MS
    isFirstRun.current = false

    setIsCalculating(true)

    debounceTimerRef.current = setTimeout(() => {
      const result = computeLiveScore(resumeData, jobDescription)

      // Generate hints from comparison
      const hints = generateHints(result, previousResultRef.current)

      // Update state
      const prevOverall = previousResultRef.current?.overallScore ?? null
      setPreviousScore(prevOverall)
      setScoreDelta(prevOverall !== null ? result.overallScore - prevOverall : 0)
      setScore(result)
      setIsCalculating(false)

      // Only show hints after the first calculation (not on mount)
      if (previousResultRef.current && hints.length > 0) {
        setRecentHints(prev => [...hints, ...prev].slice(0, MAX_HINTS))

        // Auto-dismiss hints
        const timer = setTimeout(() => {
          setRecentHints(prev => prev.filter(h => !hints.includes(h)))
        }, HINT_TTL_MS)
        hintTimersRef.current.push(timer)
      }

      previousResultRef.current = result
    }, delay)
  }, [resumeData, jobDescription])

  const dismissHint = useCallback((index: number) => {
    setRecentHints(prev => prev.filter((_, i) => i !== index))
  }, [])

  return {
    score,
    previousScore,
    scoreDelta,
    isCalculating,
    recentHints,
    dismissHint,
  }
}
