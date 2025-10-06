/**
 * Utility functions for computing text diffs
 * Uses a simple word-based diff algorithm
 */

export interface DiffPart {
  value: string
  type: 'added' | 'removed' | 'unchanged'
}

/**
 * Compute word-level diff between two texts
 */
export function computeDiff(oldText: string, newText: string): DiffPart[] {
  const oldWords = oldText.split(/(\s+)/g).filter(Boolean)
  const newWords = newText.split(/(\s+)/g).filter(Boolean)
  
  const oldSet = new Set(oldWords.map(w => w.toLowerCase()))
  const newSet = new Set(newWords.map(w => w.toLowerCase()))
  
  const result: DiffPart[] = []
  
  // Process new text to find additions and unchanged
  for (const word of newWords) {
    const lower = word.toLowerCase()
    if (!oldSet.has(lower) && word.trim()) {
      result.push({ value: word, type: 'added' })
    } else {
      result.push({ value: word, type: 'unchanged' })
    }
  }
  
  return result
}

/**
 * Compute line-level diff for better structural comparison
 */
export function computeLineDiff(oldText: string, newText: string): { oldLines: DiffPart[], newLines: DiffPart[] } {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  
  const oldSet = new Set(oldLines.map(l => l.trim().toLowerCase()))
  const newSet = new Set(newLines.map(l => l.trim().toLowerCase()))
  
  const oldResult: DiffPart[] = []
  const newResult: DiffPart[] = []
  
  // Mark removed lines
  for (const line of oldLines) {
    const trimmed = line.trim().toLowerCase()
    if (!newSet.has(trimmed) && trimmed) {
      oldResult.push({ value: line + '\n', type: 'removed' })
    } else {
      oldResult.push({ value: line + '\n', type: 'unchanged' })
    }
  }
  
  // Mark added lines
  for (const line of newLines) {
    const trimmed = line.trim().toLowerCase()
    if (!oldSet.has(trimmed) && trimmed) {
      newResult.push({ value: line + '\n', type: 'added' })
    } else {
      newResult.push({ value: line + '\n', type: 'unchanged' })
    }
  }
  
  return { oldLines: oldResult, newLines: newResult }
}

/**
 * Get statistics about the changes
 */
export function getDiffStats(oldText: string, newText: string): {
  additions: number
  deletions: number
  unchanged: number
  totalChanges: number
} {
  const oldWords = oldText.split(/\s+/).filter(Boolean)
  const newWords = newText.split(/\s+/).filter(Boolean)
  
  const oldSet = new Set(oldWords.map(w => w.toLowerCase()))
  const newSet = new Set(newWords.map(w => w.toLowerCase()))
  
  let additions = 0
  let deletions = 0
  let unchanged = 0
  
  // Count additions
  for (const word of newWords) {
    if (!oldSet.has(word.toLowerCase())) {
      additions++
    } else {
      unchanged++
    }
  }
  
  // Count deletions
  for (const word of oldWords) {
    if (!newSet.has(word.toLowerCase())) {
      deletions++
    }
  }
  
  return {
    additions,
    deletions,
    unchanged,
    totalChanges: additions + deletions
  }
}
