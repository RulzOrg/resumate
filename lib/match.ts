/**
 * Evidence search & scoring helpers (scaffolding)
 *
 * These utilities will power the Step 2 experience described in the
 * AI Resume Optimizer plan. They provide typed entry points for
 * querying Qdrant and blending per-dimension fit scores.
 */

import type { ScoredPoint } from "@qdrant/js-client-rest"
import type { JobAnalysis } from "./db"
import { getEmbeddings } from "./embeddings"
import { buildEvidenceId, parseEvidenceId, searchVectors } from "./qdrant"

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
  const cleanQueries = queries
    .map((query) => query.trim())
    .filter((query) => query.length > 0)

  if (!cleanQueries.length) {
    return []
  }

  const embeddings = await getEmbeddings(cleanQueries)
  const evidenceMap = new Map<string, EvidencePoint & { score: number }>()

  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i]
    const results = await searchVectors({
      vector: embedding,
      limit: topK,
      userId,
    })

    results.forEach((point: ScoredPoint) => {
      const rawId = typeof point.id === "string" ? point.id : String(point.id)
      const { evidenceId } = parseEvidenceId(rawId)
      const payload = (point.payload ?? {}) as Record<string, any>
      const key = buildEvidenceId(userId, evidenceId)

      const entry = evidenceMap.get(key)
      const text = typeof payload.text === "string" ? payload.text : payload.content ?? ""
      const metadata = { ...payload, evidenceId }

      if (!entry || (point.score ?? 0) > entry.score) {
        evidenceMap.set(key, {
          id: evidenceId,
          text,
          metadata,
          score: point.score ?? 0,
        })
      }
    })
  }

  return Array.from(evidenceMap.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map(({ score, ...entry }) => ({ ...entry, score }))
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
  const evidenceTexts = evidence.map((item) => item.text.toLowerCase())

  const requiredSkills = (jobProfile.required_skills || []).filter(Boolean)
  const keyRequirements = (jobProfile.analysis_result?.key_requirements || []).filter(Boolean)
  const keywords = (jobProfile.keywords || []).filter(Boolean)
  const seniorityTerms = deriveSeniorityTerms(jobProfile)

  const skillsCoverage = evaluateCoverage(requiredSkills, evidenceTexts)
  const responsibilitiesCoverage = evaluateCoverage(keyRequirements, evidenceTexts)
  const domainCoverage = evaluateCoverage(keywords, evidenceTexts)
  const seniorityCoverage = evaluateCoverage(seniorityTerms, evidenceTexts)

  const dimensions = {
    skills: Math.round(skillsCoverage.coverage * 100),
    responsibilities: Math.round(responsibilitiesCoverage.coverage * 100),
    domain: Math.round(domainCoverage.coverage * 100),
    seniority: Math.round(seniorityCoverage.coverage * 100),
  }

  const overall = Math.round(
    (dimensions.skills + dimensions.responsibilities + dimensions.domain + dimensions.seniority) / 4,
  )

  return {
    overall,
    dimensions,
    missingMustHaves: skillsCoverage.missing,
  }
}

function evaluateCoverage(items: string[], evidenceTexts: string[]) {
  const normalizedItems = items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (!normalizedItems.length) {
    return { coverage: 1, missing: [] as string[] }
  }

  let hits = 0
  const missing: string[] = []

  normalizedItems.forEach((item) => {
    const normalized = item.toLowerCase()
    const matched = evidenceTexts.some((text) => text.includes(normalized))
    if (matched) {
      hits += 1
    } else {
      missing.push(item)
    }
  })

  return {
    coverage: hits / normalizedItems.length,
    missing,
  }
}

function deriveSeniorityTerms(jobProfile: JobAnalysis) {
  const terms = new Set<string>()

  if (jobProfile.experience_level) {
    terms.add(jobProfile.experience_level)
  }

  const analysisLevel = jobProfile.analysis_result?.experience_level
  if (analysisLevel) {
    terms.add(analysisLevel)
  }

  const title = jobProfile.job_title
  if (title) {
    const seniorityHints = ["intern", "junior", "mid", "senior", "lead", "manager", "principal", "director"]
    seniorityHints.forEach((hint) => {
      if (title.toLowerCase().includes(hint)) {
        terms.add(hint)
      }
    })
  }

  return Array.from(terms)
}
