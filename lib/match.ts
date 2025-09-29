/**
 * Evidence search & scoring helpers (scaffolding)
 *
 * These utilities will power the Step 2 experience described in the
 * AI Resume Optimizer plan. They provide typed entry points for
 * querying Qdrant and blending per-dimension fit scores.
 */

import type { JobAnalysis } from "./db"
import { qdrant, ensureCollection, QDRANT_COLLECTION } from "./qdrant"
import { embedTexts } from "./embeddings"

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
  if (!userId) return []
  const cleanQueries = (queries || []).map((q) => String(q || "").trim()).filter(Boolean)
  if (cleanQueries.length === 0) return []

  await ensureCollection()
  const vectors = await embedTexts(cleanQueries)

  const searches = await Promise.all(
    vectors.map((vector) =>
      qdrant.search(QDRANT_COLLECTION, {
        vector,
        limit: Math.max(1, Math.min(20, topK)),
        with_payload: true,
        with_vector: false,
        filter: {
          must: [{ key: "userId", match: { value: userId } }],
        } as any,
      }),
    ),
  )

  const merged: Record<string, EvidencePoint> = {}
  for (const result of searches) {
    for (const point of result) {
      const id = String(point.id)
      const payload: any = (point as any).payload || {}
      const text: string = payload.text || payload.content || payload.body || ""
      const prev = merged[id]
      const ep: EvidencePoint = {
        id,
        text,
        metadata: {
          resume_id: payload.resume_id,
          evidence_id: payload.evidence_id,
          section: payload.section,
          ...payload,
        },
        score: point.score,
      }
      if (!prev || (typeof ep.score === "number" && (prev.score ?? -Infinity) < ep.score)) {
        merged[id] = ep
      }
    }
  }

  return Object.values(merged)
    .filter((e) => (e.text || "").trim().length > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
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
  const texts = (evidence || []).map((e) => (e.text || "").toLowerCase())

  const tok = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9+.#/ ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  const includesWhole = (needle: string, hay: string) => {
    const n = tok(needle)
    if (!n) return false
    const h = tok(hay)
    if (!h) return false
    const re = new RegExp(
      `(?<![a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`,
      "i",
    )
    return re.test(h)
  }
  const covered = (items: string[]) => {
    const arr = Array.from(new Set((items || []).filter(Boolean)))
    if (arr.length === 0) return { pct: 0, missing: [] as string[] }
    const miss: string[] = []
    let hits = 0
    for (const item of arr) {
      const ok = texts.some((t) => includesWhole(item, t))
      if (ok) hits++
      else miss.push(item)
    }
    return { pct: Math.round((hits / arr.length) * 100), missing: miss }
  }

  const reqSkills = Array.isArray((jobProfile as any).required_skills)
    ? (jobProfile as any).required_skills
    : Array.isArray((jobProfile as any).analysis_result?.required_skills)
      ? (jobProfile as any).analysis_result.required_skills
      : []
  const keyReqs = Array.isArray((jobProfile as any).analysis_result?.key_requirements)
    ? (jobProfile as any).analysis_result.key_requirements
    : []
  const keywords = Array.isArray((jobProfile as any).keywords)
    ? (jobProfile as any).keywords
    : Array.isArray((jobProfile as any).analysis_result?.keywords)
      ? (jobProfile as any).analysis_result.keywords
      : []

  const skillsCov = covered(reqSkills)
  const respCov = covered(keyReqs)

  // Simple domain heuristic from job title/company/keywords
  const domainSeeds = [
    (jobProfile as any).job_title,
    (jobProfile as any).company_name,
    ...keywords,
  ].filter(Boolean) as string[]
  const domainCov = covered(domainSeeds.slice(0, 10))

  // Seniority heuristic from experience_level and evidence verbs/years
  const level = String((jobProfile as any).experience_level || (jobProfile as any).analysis_result?.experience_level || "").toLowerCase()
  const seniorTerms = ["senior", "lead", "principal", "staff", "manager", "director"]
  const hasYears = texts.some((t) => /\b(\d{1,2})+\s*(\+\s*)?(years?|yrs)\b/i.test(t))
  const hasLeadVerbs = texts.some((t) => /(led|managed|owned|architected|mentored|drove)\b/i.test(t))
  let seniorScore = 30
  if (seniorTerms.some((k) => level.includes(k))) seniorScore += 35
  if (hasYears) seniorScore += 20
  if (hasLeadVerbs) seniorScore += 15
  seniorScore = Math.max(0, Math.min(100, seniorScore))

  const overall = Math.round(
    0.4 * skillsCov.pct + 0.4 * respCov.pct + 0.1 * domainCov.pct + 0.1 * seniorScore,
  )

  return {
    overall,
    dimensions: {
      skills: skillsCov.pct,
      responsibilities: respCov.pct,
      domain: domainCov.pct,
      seniority: seniorScore,
    },
    missingMustHaves: skillsCov.missing,
  }
}
