/**
 * Utility functions for match score calculations
 * Includes cosine similarity for semantic matching
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`)
  }
  
  if (vecA.length === 0) {
    return 0
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  
  if (denominator === 0) return 0
  
  return dotProduct / denominator
}

/**
 * Batch cosine similarity for multiple vector pairs
 * Useful for comparing one target vector against multiple candidates
 */
export function batchCosineSimilarity(
  vectors: number[][], 
  target: number[]
): number[] {
  return vectors.map(vec => cosineSimilarity(vec, target))
}

/**
 * Simple hash function for string-based caching keys
 */
export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}
