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
  confidence: number
  dimensions: {
    skills: number
    responsibilities: number
    domain: number
    seniority: number
  }
  missingMustHaves: string[]
  explanation?: string
  scoringMethod: 'evidence' | 'resume_text' | 'hybrid'
  evidenceUsed: number
}

// Schema for the AI scoring output
const ScoreBreakdownSchema = z.object({
  overall: z.number().min(0).max(100).describe("Overall fit score from 0-100"),
  confidence: z.number().min(0).max(100).describe("Confidence in the score based on evidence quality and quantity. Higher when more relevant evidence is available."),
  dimensions: z.object({
    skills: z.number().min(0).max(100).describe("Skills match score 0-100. How well do their technical skills match?"),
    responsibilities: z.number().min(0).max(100).describe("Experience/Responsibilities match score 0-100. Have they done similar work?"),
    domain: z.number().min(0).max(100).describe("Industry/Domain knowledge score 0-100. Do they understand the business context?"),
    seniority: z.number().min(0).max(100).describe("Seniority level match score 0-100. Do they show appropriate leadership/autonomy?"),
  }),
  missingMustHaves: z.array(z.string()).describe("List of critical missing skills or requirements from the job posting"),
  explanation: z.string().describe("2-3 sentence explanation of the score highlighting key strengths and gaps"),
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
 * and resume evidence (or full resume text as fallback).
 *
 * @param jobProfile - Normalized job analysis structure
 * @param evidence - Evidence points returned from searchEvidence
 * @param resumeText - Optional: Full resume text for fallback when no evidence is available
 */
export async function computeScoreWithAI(
  jobProfile: JobAnalysis,
  evidence: EvidencePoint[],
  resumeText?: string,
): Promise<ScoreBreakdown> {
  const hasEvidence = evidence && evidence.length > 0
  const hasResumeText = resumeText && resumeText.trim().length > 50

  // Debug logging for fallback path tracing
  console.log(`[computeScoreWithAI] Input state:`, {
    jobTitle: jobProfile.job_title,
    evidenceCount: evidence?.length || 0,
    hasEvidence,
    resumeTextLength: resumeText?.trim().length || 0,
    hasResumeText,
    willUseFallback: !hasEvidence && hasResumeText,
  })

  // If no evidence AND no resume text, return 0 score
  if (!hasEvidence && !hasResumeText) {
    console.warn(`[computeScoreWithAI] No evidence AND no resume text - returning 0 score`)
    return {
      overall: 0,
      confidence: 0,
      dimensions: {
        skills: 0,
        responsibilities: 0,
        domain: 0,
        seniority: 0,
      },
      missingMustHaves: (jobProfile as any).required_skills || [],
      explanation: "No resume content available to match against this job. Please upload a resume first.",
      scoringMethod: 'evidence',
      evidenceUsed: 0,
    }
  }

  // Build job context
  const requiredSkills = ((jobProfile as any).required_skills || [])
  const preferredSkills = ((jobProfile as any).preferred_skills || [])
  const keyRequirements = ((jobProfile as any).analysis_result?.key_requirements || [])
  const keywords = ((jobProfile as any).keywords || [])
  const experienceLevel = (jobProfile as any).experience_level || (jobProfile as any).analysis_result?.experience_level || 'Not specified'

  const jobContext = `
JOB TITLE: ${jobProfile.job_title}
COMPANY: ${jobProfile.company_name || 'Unknown'}
EXPERIENCE LEVEL: ${experienceLevel}

REQUIRED SKILLS (Must-Have): ${requiredSkills.join(", ") || 'None specified'}
PREFERRED SKILLS (Nice-to-Have): ${preferredSkills.join(", ") || 'None specified'}
KEY REQUIREMENTS: ${keyRequirements.join("; ") || 'None specified'}
KEYWORDS: ${keywords.join(", ") || 'None specified'}
  `.trim()

  // Determine scoring method and build candidate content
  let scoringMethod: 'evidence' | 'resume_text' | 'hybrid'
  let candidateContent: string
  let evidenceCount: number

  if (hasEvidence && hasResumeText) {
    // Hybrid: Use both evidence and full resume for context
    scoringMethod = 'hybrid'
    evidenceCount = evidence.length
    const evidenceText = evidence
      .slice(0, 15) // Limit to top 15 evidence points
      .map((e, i) => `  [${i + 1}] ${e.text} (Section: ${e.metadata?.section || 'unknown'}, Relevance: ${((e.score || 0) * 100).toFixed(0)}%)`)
      .join("\n")
    
    // Truncate resume text for context
    const truncatedResume = resumeText.length > 3000 ? resumeText.substring(0, 3000) + '...[truncated]' : resumeText

    candidateContent = `
MATCHED EVIDENCE (Most relevant experience bullets):
${evidenceText}

FULL RESUME CONTEXT (for additional context):
${truncatedResume}
    `.trim()
  } else if (hasEvidence) {
    // Evidence-only scoring
    scoringMethod = 'evidence'
    evidenceCount = evidence.length
    const evidenceText = evidence
      .slice(0, 15)
      .map((e, i) => `  [${i + 1}] ${e.text} (Section: ${e.metadata?.section || 'unknown'}, Relevance: ${((e.score || 0) * 100).toFixed(0)}%)`)
      .join("\n")

    candidateContent = `
MATCHED EVIDENCE (Most relevant experience from resume):
${evidenceText}
    `.trim()
  } else {
    // Resume text fallback (no vector search results)
    scoringMethod = 'resume_text'
    evidenceCount = 0
    const truncatedResume = resumeText!.length > 4000 ? resumeText!.substring(0, 4000) + '...[truncated]' : resumeText!

    candidateContent = `
FULL RESUME TEXT:
${truncatedResume}
    `.trim()
  }

  console.log(`[computeScoreWithAI] Scoring method selected: ${scoringMethod}, evidenceCount: ${evidenceCount}`)

  try {
    console.log(`[computeScoreWithAI] Calling GPT-4o-mini for AI scoring...`)
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: ScoreBreakdownSchema,
      prompt: `You are an expert ATS (Applicant Tracking System) and recruiter. Your job is to evaluate how well a candidate matches a specific job posting.

IMPORTANT SCORING RULES:
- Be DISCRIMINATING. Different jobs should produce DIFFERENT scores for the same candidate.
- Score based on SPECIFIC EVIDENCE, not general impressions.
- A score of 70+ means strong evidence of fit. 50-69 means partial fit. Below 50 means significant gaps.
- Each dimension should vary based on actual evidence - don't give similar scores across dimensions.
- Confidence reflects how much evidence you have to make the assessment.

=== JOB REQUIREMENTS ===
${jobContext}

=== CANDIDATE INFORMATION ===
${candidateContent}

=== SCORING INSTRUCTIONS ===

For each dimension, evaluate SPECIFICALLY:

1. SKILLS (0-100): 
   - Count how many REQUIRED skills the candidate explicitly demonstrates
   - Partial credit for related skills (e.g., "React" counts partially for "Vue.js")
   - Formula: (matched_required / total_required) * 70 + bonus for preferred skills
   
2. RESPONSIBILITIES (0-100):
   - Does the candidate have experience doing the ACTUAL WORK described in the job?
   - Look for similar scope, scale, and type of responsibilities
   - Penalize heavily if core responsibilities have no evidence
   
3. DOMAIN (0-100):
   - Has the candidate worked in the same or similar industry?
   - Do they understand the business context, terminology, regulations?
   - Cross-industry experience should score lower unless explicitly relevant
   
4. SENIORITY (0-100):
   - Does their experience level match what's required?
   - Look for: years of experience, leadership evidence, scope of decisions
   - Overqualified = 60-70, Underqualified = 30-50, Match = 80-95

5. CONFIDENCE (0-100):
   - How certain are you in this assessment?
   - High (80-100): Rich evidence, clear signals
   - Medium (50-79): Some evidence, some inference required
   - Low (0-49): Limited evidence, mostly guessing

6. OVERALL (0-100):
   - Weighted average: Skills (30%) + Responsibilities (30%) + Domain (20%) + Seniority (20%)
   - Adjust down if critical must-haves are missing

Respond with your structured assessment.`,
    })

    console.log(`[computeScoreWithAI] AI scoring successful:`, {
      overall: object.overall,
      confidence: object.confidence,
      dimensions: object.dimensions,
      scoringMethod,
      evidenceUsed: evidenceCount,
    })

    return {
      ...object,
      scoringMethod,
      evidenceUsed: evidenceCount,
    }
  } catch (error: any) {
    console.error("[computeScoreWithAI] AI Scoring failed:", {
      error: error?.message || error,
      scoringMethod,
      evidenceCount,
      hasResumeText: hasEvidence ? false : !!resumeText,
    })
    // Fallback if AI fails
    return {
      overall: 0,
      confidence: 0,
      dimensions: { skills: 0, responsibilities: 0, domain: 0, seniority: 0 },
      missingMustHaves: requiredSkills,
      explanation: "Scoring service temporarily unavailable. Please try again.",
      scoringMethod,
      evidenceUsed: hasEvidence ? evidence.length : 0,
    }
  }
}
