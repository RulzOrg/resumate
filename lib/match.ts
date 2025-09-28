/**
 * Evidence search & scoring helpers (scaffolding)
 *
 * These utilities will power the Step 2 experience described in the
 * AI Resume Optimizer plan. They provide typed entry points for
 * querying Qdrant and blending per-dimension fit scores.
 */

import type { JobAnalysis } from "./db"

/**
 * Placeholder type for a Qdrant evidence point. This will be replaced
 * with the concrete payload shape once the Qdrant collection schema is
 * finalized.
 */
export interface EvidencePoint {
  id: string
  text: string
  metadata?: Record<string, any>
  score?: number
}

export interface ScoreBreakdown {
  overall: number
  dimensions: {
    skills: number
    responsibilities: number
    domain: number
    seniority: number
  }
  missingMustHaves: string[]
}

/**
 * searchEvidence is responsible for querying Qdrant (or another vector
 * store) for resume bullets that best match the supplied queries.
 *
 * @param userId - Current authenticated user id (used for multi-tenancy filters)
 * @param queries - Search strings derived from job requirements
 * @param topK - Maximum number of points to return per query
 */
export async function searchEvidence(
  userId: string,
  queries: string[],
  topK = 5,
): Promise<EvidencePoint[]> {
  void userId
  void queries
  void topK
  // TODO: Implement Qdrant client lookup with payload filter on userId.
  return []
}

/**
 * computeScore will blend evidence coverage against the job profile to
 * produce an overall fit score and per-dimension breakdown.
 *
 * @param jobProfile - Normalized job analysis structure
 * @param evidence - Evidence points returned from searchEvidence
 */
export function computeScore(
  jobProfile: JobAnalysis,
  evidence: EvidencePoint[],
): ScoreBreakdown {
  void jobProfile
  void evidence

  // TODO: Replace placeholder numbers with real coverage metrics.
  return {
    overall: 0,
    dimensions: {
      skills: 0,
      responsibilities: 0,
      domain: 0,
      seniority: 0,
    },
    missingMustHaves: [],
  }
}
