import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

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
  explanation?: string
}

// Schema for the AI scoring output
const ScoreBreakdownSchema = z.object({
  overall: z.number().min(0).max(100).describe("Overall fit score from 0-100"),
  dimensions: z.object({
    skills: z.number().min(0).max(100).describe("Skills match score 0-100"),
    responsibilities: z.number().min(0).max(100).describe("Experience/Responsibilities match score 0-100"),
    domain: z.number().min(0).max(100).describe("Industry/Domain knowledge score 0-100"),
    seniority: z.number().min(0).max(100).describe("Seniority level match score 0-100"),
  }),
  missingMustHaves: z.array(z.string()).describe("List of critical missing skills or requirements"),
  explanation: z.string().describe("Brief explanation of the score and key gaps"),
})

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
      // Use explicit evidence_id if present, otherwise create guaranteed-unique fallback
      const evidenceId = payload.evidence_id ? String(payload.evidence_id) : `point:${pointId}`

      const prev = merged[evidenceId]
      const currentScore = point.score ?? 0

      if (!prev) {
        merged[evidenceId] = {
          id: pointId,
          text,
          metadata: {
            resume_id: payload.resume_id,
            evidence_id: payload.evidence_id, // Preserve original evidence_id (or undefined)
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
 * computeScoreWithAI uses GPT-4o-mini to analyze the fit between job requirements
 * and resume evidence.
 *
 * @param jobProfile - Normalized job analysis structure
 * @param evidence - Evidence points returned from searchEvidence
 */
export async function computeScoreWithAI(
  jobProfile: JobAnalysis,
  evidence: EvidencePoint[],
): Promise<ScoreBreakdown> {
  // If no evidence, return 0 score immediately to save AI tokens
  if (!evidence || evidence.length === 0) {
    return {
      overall: 0,
      dimensions: {
        skills: 0,
        responsibilities: 0,
        domain: 0,
        seniority: 0,
      },
      missingMustHaves: (jobProfile as any).required_skills || [],
      explanation: "No relevant evidence found in resume to match against this job."
    }
  }

  const evidenceText = evidence
    .map((e, i) => `[${i + 1}] ${e.text} (Source: ${e.metadata?.section || 'unknown'})`)
    .join("\n")

  const jobContext = `
    Job Title: ${jobProfile.job_title}
    Company: ${jobProfile.company_name || 'Unknown'}
    Experience Level: ${(jobProfile as any).experience_level || 'Not specified'}
    
    Required Skills: ${((jobProfile as any).required_skills || []).join(", ")}
    Key Requirements: ${((jobProfile as any).analysis_result?.key_requirements || []).join("; ")}
    Keywords: ${((jobProfile as any).keywords || []).join(", ")}
  `

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: ScoreBreakdownSchema,
      prompt: `
        You are an expert ATS (Applicant Tracking System) scorer. 
        Evaluate the candidate's fit for the job based ONLY on the provided evidence snippets.
        
        JOB CONTEXT:
        ${jobContext}

        CANDIDATE EVIDENCE (Ranked by relevance):
        ${evidenceText}

        INSTRUCTIONS:
        1. Analyze how well the evidence supports the job requirements.
        2. Score each dimension from 0-100 based on strength of evidence.
        3. Be strict but fair. 100 requires perfect, explicit proof. 0 means no evidence.
        4. Identify critical missing skills/requirements.
        5. Provide a brief explanation.

        SCORING GUIDE:
        - Skills: Do they have the specific tech stack/tools required?
        - Responsibilities: Have they done similar work/tasks?
        - Domain: Do they know the industry/subject matter?
        - Seniority: Do they show the right level of leadership/autonomy?
      `,
    })

    return object
  } catch (error) {
    console.error("AI Scoring failed:", error)
    // Fallback to 0 if AI fails
    return {
      overall: 0,
      dimensions: { skills: 0, responsibilities: 0, domain: 0, seniority: 0 },
      missingMustHaves: [],
      explanation: "Scoring service temporarily unavailable."
    }
  }
}
