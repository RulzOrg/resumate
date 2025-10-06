import { useState, useCallback, useRef } from 'react'

interface UseUndoRedoOptions<T> {
  maxHistory?: number
}

/**
 * Undo/Redo hook for managing state history
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions<T> = {}
) {
  const { maxHistory = 50 } = options

  const [state, setState] = useState<T>(initialState)
  const history = useRef<T[]>([initialState])
  const historyIndex = useRef(0)

  const set = useCallback((newState: T | ((prev: T) => T)) => {
    setState((prev) => {
      const nextState = typeof newState === 'function'
        ? (newState as (prev: T) => T)(prev)
        : newState

      // Remove any history after current index
      history.current = history.current.slice(0, historyIndex.current + 1)

      // Add new state to history
      history.current.push(nextState)

      // Limit history size
      if (history.current.length > maxHistory) {
        history.current = history.current.slice(history.current.length - maxHistory)
        historyIndex.current = history.current.length - 1
      } else {
        historyIndex.current++
      }

      return nextState
    })
  }, [maxHistory])

  const undo = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current--
      setState(history.current[historyIndex.current])
    }
  }, [])

  const redo = useCallback(() => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current++
      setState(history.current[historyIndex.current])
    }
  }, [])

  const canUndo = historyIndex.current > 0
  const canRedo = historyIndex.current < history.current.length - 1

  const reset = useCallback((newState?: T) => {
    const resetState = newState || initialState
    history.current = [resetState]
    historyIndex.current = 0
    setState(resetState)
  }, [initialState])

  return {
    state,
    setState: set,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    historySize: history.current.length,
    historyIndex: historyIndex.current
  }
}
