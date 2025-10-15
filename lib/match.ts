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
  matchCount?: number  // Number of queries that matched this evidence
  maxScore?: number    // Highest score across all matching queries
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
 * @param resumeId - Optional: Filter evidence to specific resume only
 */
export async function searchEvidence(
  userId: string,
  queries: string[],
  topK = 5,
  resumeId?: string,
): Promise<EvidencePoint[]> {
  if (!userId) return []
  const cleanQueries = (queries || []).map((q) => String(q || "").trim()).filter(Boolean)
  if (cleanQueries.length === 0) return []

  try {
    await ensureCollection()
    const vectors = await embedTexts(cleanQueries)

  console.log(`[searchEvidence] Searching for user: ${userId}, queries: ${cleanQueries.length}, resumeId: ${resumeId || 'all'}`)

  // Build Qdrant filter
  const filterConditions: any[] = [
    { key: "userId", match: { value: userId } }
  ]

  // If resumeId provided, filter to that specific resume only
  if (resumeId) {
    filterConditions.push({ key: "resume_id", match: { value: resumeId } })
  }

  const searches = await Promise.all(
    vectors.map((vector) =>
      qdrant.search(QDRANT_COLLECTION, {
        vector,
        limit: Math.max(1, Math.min(20, topK)),
        with_payload: true,
        with_vector: false,
        filter: {
          must: filterConditions,
        } as any,
      }),
    ),
  )

  const totalResults = searches.reduce((sum, results) => sum + results.length, 0)
  console.log(`[searchEvidence] Got ${totalResults} results across ${searches.length} queries`)

  // Deduplicate by evidence_id (text identifier) not point ID
  // This prevents the same bullet from appearing multiple times
  const merged: Record<string, EvidencePoint & { matchCount: number, maxScore: number }> = {}

  for (const result of searches) {
    for (const point of result) {
      const pointId = String(point.id)
      const payload: any = (point as any).payload || {}
      const text: string = payload.text || payload.content || payload.body || ""
      const evidenceId = payload.evidence_id || pointId

      const prev = merged[evidenceId]
      const currentScore = point.score ?? 0

      if (!prev) {
        merged[evidenceId] = {
          id: pointId,
          text,
          metadata: {
            resume_id: payload.resume_id,
            evidence_id: evidenceId,
            section: payload.section,
            ...payload,
          },
          score: currentScore,
          matchCount: 1,
          maxScore: currentScore
        }
      } else {
        // Same evidence matched by another query - increment count and update max score
        prev.matchCount++
        if (currentScore > prev.maxScore) {
          prev.maxScore = currentScore
          prev.score = currentScore
        }
      }
    }
  }

    // Quality scoring: boost high-quality evidence, penalize noise
    const actionVerbs = /\b(led|managed|designed|developed|created|implemented|built|launched|drove|established|improved|increased|reduced|achieved|delivered|spearheaded|coordinated|executed|analyzed|optimized|architected|engineered|mentored|scaled|initiated|transformed)\b/i

    const scoredResults = Object.values(merged)
      .filter((e) => (e.text || "").trim().length > 0)
      .map(e => {
        let qualityScore = e.score ?? 0
        const text = e.text || ""
        const wordCount = text.split(/\s+/).length

        // Quality adjustments
        // 1. Penalize overly long chunks (likely education/cert blobs)
        if (text.length > 200) {
          qualityScore *= 0.5 // 50% penalty for long chunks
        } else if (text.length > 150) {
          qualityScore *= 0.8 // 20% penalty
        }

        // 2. Boost chunks with action verbs (experience bullets)
        const actionVerbMatches = (text.match(actionVerbs) || []).length
        if (actionVerbMatches > 0) {
          qualityScore *= (1 + actionVerbMatches * 0.15) // 15% boost per action verb
        }

        // 3. Penalize education/certification indicators
        if (/\b(university|college|bachelor|master|degree|certified|certification)\b/i.test(text)) {
          qualityScore *= 0.6 // 40% penalty
        }

        // 4. Boost experience section
        const section = e.metadata?.section || ''
        if (section === 'experience' || section === 'projects') {
          qualityScore *= 1.3 // 30% boost
        }

        // 5. Penalize very short chunks (likely fragments)
        if (wordCount < 5) {
          qualityScore *= 0.3
        }

        return {
          ...e,
          qualityScore,
          wordCount
        }
      })
      .filter(e => {
        // Filter out low-quality evidence
        const text = e.text || ""

        // Remove if quality score too low
        if (e.qualityScore < 0.15) return false

        // Remove standalone URLs, emails, phone numbers
        if (/^(https?:\/\/|www\.|[\w.-]+@[\w.-]+|\+?\d{10,})/.test(text)) return false

        // Remove very short fragments
        if (e.wordCount < 4) return false

        return true
      })
      .sort((a, b) => {
        // Sort by quality-adjusted semantic similarity FIRST
        const scoreDiff = (b.qualityScore ?? 0) - (a.qualityScore ?? 0)
        if (Math.abs(scoreDiff) > 0.05) return scoreDiff // Significant difference in quality

        // If quality scores are similar, then use match count as tiebreaker
        const countDiff = (b.matchCount ?? 1) - (a.matchCount ?? 1)
        if (countDiff !== 0) return countDiff

        // Final tiebreaker: raw score
        return (b.score ?? 0) - (a.score ?? 0)
      })

    console.log(`[searchEvidence] After deduplication: ${scoredResults.length} unique bullets`)
    console.log(`[searchEvidence] Top 3 by quality score:`, scoredResults.slice(0, 3).map(e => ({
      text: e.text.substring(0, 50) + '...',
      qualityScore: e.qualityScore?.toFixed(3),
      matchCount: e.matchCount,
      rawScore: e.score?.toFixed(3),
      section: e.metadata?.section
    })))

    return scoredResults
  } catch (error: any) {
    console.error('Evidence search failed:', error.message)
    // Graceful degradation: return empty array if Qdrant is unavailable
    if (error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('fetch failed') ||
        error.code === 'ECONNREFUSED') {
      console.warn('Qdrant unavailable - returning empty evidence array')
      return []
    }
    throw error
  }
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

  // Skill synonym/acronym mapping for better matching
  const skillSynonyms: Record<string, string[]> = {
    'ux': ['user experience', 'ux design', 'user experience design'],
    'ui': ['user interface', 'ui design', 'user interface design'],
    'uiux': ['ui/ux', 'ux/ui', 'user interface user experience'],
    'figma': ['figma design', 'design tool', 'prototyping tool'],
    'sketch': ['sketch app', 'design tool'],
    'wireframe': ['wireframing', 'low fidelity', 'lo fi'],
    'prototype': ['prototyping', 'interactive prototype', 'clickable prototype'],
    'usability': ['usability testing', 'user testing', 'ux research'],
    'accessibility': ['a11y', 'wcag', 'ada compliance', 'inclusive design']
  }

  // Improved matching with fuzzy logic, synonym support, and acronym expansion
  const includesSkill = (needle: string, hay: string) => {
    const n = tok(needle)
    if (!n) return false
    const h = tok(hay)
    if (!h) return false

    // Check direct synonyms first
    for (const [acronym, expansions] of Object.entries(skillSynonyms)) {
      if (n.includes(acronym)) {
        // If needle has acronym, also check if hay has expansions
        for (const expansion of expansions) {
          if (h.includes(expansion)) return true
        }
      }
      // If needle has expansion, also check if hay has acronym
      for (const expansion of expansions) {
        if (n.includes(expansion) && h.includes(acronym)) return true
      }
    }

    // Extract key terms from needle (remove parentheses, split by common separators)
    const needleTerms = n
      .replace(/[()]/g, ' ')
      .split(/[\/,&]/)
      .map(t => t.trim())
      .filter(Boolean)

    // Check if ANY significant term from needle appears in hay
    // This allows "User Experience (UX) Design" to match "UX Designer", "User Experience", etc.
    for (const term of needleTerms) {
      if (term.length < 2) continue // Skip single letters

      // Exact word boundary match
      const re = new RegExp(
        `(?<![a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`,
        "i"
      )
      if (re.test(h)) return true

      // Partial match for compound terms (e.g., "usability" matches "usability testing")
      if (term.length >= 4 && h.includes(term)) return true
    }

    return false
  }

  const covered = (items: string[]) => {
    const arr = Array.from(new Set((items || []).filter(Boolean)))
    if (arr.length === 0) return { pct: 0, missing: [] as string[] }
    const miss: string[] = []
    let hits = 0
    for (const item of arr) {
      const ok = texts.some((t) => includesSkill(item, t))
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

  // Responsibilities: try multiple fields with fallbacks
  let keyReqs = Array.isArray((jobProfile as any).analysis_result?.key_requirements)
    ? (jobProfile as any).analysis_result.key_requirements
    : []

  // Fallback: if no key_requirements, use responsibilities or required_skills
  if (keyReqs.length === 0) {
    keyReqs = Array.isArray((jobProfile as any).responsibilities)
      ? (jobProfile as any).responsibilities
      : Array.isArray((jobProfile as any).required_skills)
        ? (jobProfile as any).required_skills
        : []
  }

  const keywords = Array.isArray((jobProfile as any).keywords)
    ? (jobProfile as any).keywords
    : Array.isArray((jobProfile as any).analysis_result?.keywords)
      ? (jobProfile as any).analysis_result.keywords
      : []

  const skillsCov = covered(reqSkills)
  const respCov = covered(keyReqs)

  // Debug logging
  console.log('[computeScore] Scoring metrics:', {
    evidenceCount: evidence.length,
    reqSkillsCount: reqSkills.length,
    keyReqsCount: keyReqs.length,
    keywordsCount: keywords.length,
    skillsCoverage: skillsCov.pct,
    respCoverage: respCov.pct,
    skillsMissing: skillsCov.missing.slice(0, 3),
    respMissing: respCov.missing.slice(0, 3)
  })

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

  // Job-specific weighting based on seniority and role type
  let skillsWeight = 0.4
  let respWeight = 0.4
  let domainWeight = 0.1
  let seniorWeight = 0.1

  // Adjust weights based on seniority level
  if (level.includes('senior') || level.includes('lead') || level.includes('principal')) {
    // Senior roles: emphasize responsibilities and leadership
    respWeight = 0.45
    skillsWeight = 0.35
    seniorWeight = 0.15
    domainWeight = 0.05
  } else if (level.includes('entry') || level.includes('junior') || level.includes('associate')) {
    // Entry roles: emphasize skills and domain knowledge
    skillsWeight = 0.5
    domainWeight = 0.2
    respWeight = 0.25
    seniorWeight = 0.05
  } else if (level.includes('director') || level.includes('vp') || level.includes('executive')) {
    // Executive roles: heavily emphasize responsibilities and seniority
    respWeight = 0.5
    seniorWeight = 0.25
    skillsWeight = 0.15
    domainWeight = 0.1
  }

  // Boost domain weight for specialized roles (fintech, healthcare, etc.)
  const domainIntensiveTerms = ['fintech', 'healthcare', 'biotech', 'legal', 'regulatory', 'compliance', 'security']
  if (domainIntensiveTerms.some(term =>
    domainSeeds.some(seed => seed.toLowerCase().includes(term))
  )) {
    domainWeight += 0.1
    skillsWeight -= 0.05
    respWeight -= 0.05
  }

  let overall = Math.round(
    skillsWeight * skillsCov.pct +
    respWeight * respCov.pct +
    domainWeight * domainCov.pct +
    seniorWeight * seniorScore
  )

  // Boost score for strong evidence scenarios
  // If responsibilities data is missing (0 items) but skills/domain are strong, don't penalize
  if (keyReqs.length === 0 && skillsCov.pct >= 80) {
    // Recalculate without responsibilities weight
    const adjustedOverall = Math.round(
      (skillsWeight / (skillsWeight + domainWeight + seniorWeight)) * skillsCov.pct +
      (domainWeight / (skillsWeight + domainWeight + seniorWeight)) * domainCov.pct +
      (seniorWeight / (skillsWeight + domainWeight + seniorWeight)) * seniorScore
    )
    overall = Math.max(overall, adjustedOverall)
    console.log('[computeScore] Responsibilities data missing, using adjusted score:', {
      original: overall,
      adjusted: adjustedOverall,
      final: overall
    })
  }

  // Confidence boost: if we have strong skills match (90%+) and good evidence count
  if (skillsCov.pct >= 90 && evidence.length >= 5) {
    overall = Math.min(100, overall + 10)
    console.log('[computeScore] Strong evidence boost applied: +10 points')
  }

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
