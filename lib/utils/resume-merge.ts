/**
 * Resume merge utility
 * Merges original resume data with rewritten content from the optimization flow
 */

import {
  type ParsedResume,
  type WorkExperienceItem,
} from '@/lib/resume-parser'
import type {
  RewriteResult,
  EditedContent,
  RewrittenExperience,
} from '@/lib/types/optimize-flow'

export interface MergeResumeInput {
  /** Original resume parsed structure (from LLM extraction) - optional, fallback will be constructed */
  originalResume?: ParsedResume
  /** Rewrite result from the LLM */
  rewriteResult: RewriteResult
  /** User-edited content (takes priority over rewriteResult if provided) */
  editedContent?: EditedContent
}

export interface MergeResult {
  /** The merged ParsedResume */
  mergedResume: ParsedResume
  /** Companies that were matched and had bullets replaced */
  matchedCompanies: string[]
  /** Companies in the original that had no match in rewritten */
  unmatchedOriginal: string[]
  /** Companies in rewritten that had no match in original */
  unmatchedRewritten: string[]
}

/**
 * Normalize company name for matching
 * Handles variations like "Google LLC" vs "Google" vs "Google, Inc."
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\-–—]+/g, ' ') // Normalize punctuation and dashes
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b/gi, '') // Remove common suffixes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Check if two company names are a fuzzy match
 */
function isCompanyMatch(original: string, rewritten: string): boolean {
  const normalizedOriginal = normalizeCompanyName(original)
  const normalizedRewritten = normalizeCompanyName(rewritten)

  // Exact match after normalization
  if (normalizedOriginal === normalizedRewritten) {
    return true
  }

  // One contains the other (handles "Amazon" vs "Amazon Web Services")
  if (
    normalizedOriginal.includes(normalizedRewritten) ||
    normalizedRewritten.includes(normalizedOriginal)
  ) {
    return true
  }

  return false
}

/**
 * Parse duration string to extract start and end dates
 * Handles formats like "Jan 2021 - Present", "2020 - 2022", etc.
 */
function parseDuration(duration: string): { startDate?: string; endDate?: string } {
  const parts = duration.split(/\s*[-–—]\s*/)
  return {
    startDate: parts[0]?.trim() || undefined,
    endDate: parts[1]?.trim() || undefined,
  }
}

/**
 * Merge work experiences from original and rewritten
 * Matches by company name and replaces bullets with rewritten versions
 */
function mergeWorkExperiences(
  original: WorkExperienceItem[],
  rewritten: RewrittenExperience[]
): {
  merged: WorkExperienceItem[]
  matchedCompanies: string[]
  unmatchedOriginal: string[]
  unmatchedRewritten: string[]
} {
  const matchedCompanies: string[] = []
  const unmatchedOriginal: string[] = []
  const matchedRewrittenIndices = new Set<number>()

  const merged = original.map((origExp) => {
    // Find matching rewritten experience
    const matchIndex = rewritten.findIndex((rw) => isCompanyMatch(origExp.company, rw.company))

    if (matchIndex !== -1) {
      const match = rewritten[matchIndex]
      matchedRewrittenIndices.add(matchIndex)
      matchedCompanies.push(origExp.company)

      // Parse duration from rewritten to preserve date info if missing
      const parsedDuration = parseDuration(match.duration)

      return {
        ...origExp, // Preserve location, employmentType, etc.
        // Update title if it differs significantly
        title: match.title || origExp.title,
        // Use rewritten dates if original is missing
        startDate: origExp.startDate || parsedDuration.startDate,
        endDate: origExp.endDate || parsedDuration.endDate,
        // Replace bullets with rewritten bullets
        bullets: match.rewrittenBullets,
      }
    }

    // No match found, keep original unchanged
    unmatchedOriginal.push(origExp.company)
    return origExp
  })

  // Track unmatched rewritten experiences
  const unmatchedRewritten = rewritten
    .filter((_, index) => !matchedRewrittenIndices.has(index))
    .map((rw) => rw.company)

  return {
    merged,
    matchedCompanies,
    unmatchedOriginal,
    unmatchedRewritten,
  }
}

/**
 * Convert RewrittenExperience to WorkExperienceItem
 * Used when we don't have an original parsed resume to merge with
 */
function rewrittenToWorkExperience(exp: RewrittenExperience): WorkExperienceItem {
  const { startDate, endDate } = parseDuration(exp.duration)
  return {
    company: exp.company,
    title: exp.title,
    startDate,
    endDate,
    bullets: exp.rewrittenBullets,
  }
}

/**
 * Create a minimal ParsedResume from rewrite content
 * Used as fallback when originalResume is not available
 */
function createFallbackResume(contentToMerge: EditedContent): ParsedResume {
  return {
    contact: {
      name: '',
      email: '',
    },
    summary: contentToMerge.professionalSummary,
    workExperience: contentToMerge.workExperiences.map(rewrittenToWorkExperience),
    education: [],
    skills: [],
    interests: [],
    certifications: [],
    awards: [],
    projects: [],
    volunteering: [],
    publications: [],
  }
}

/**
 * Merge original resume with rewritten content
 *
 * @param input - The merge input containing original parsed resume and rewrite results
 * @returns The merged ParsedResume with all sections
 */
export function mergeResumeWithRewrites(input: MergeResumeInput): MergeResult {
  const { originalResume, rewriteResult, editedContent } = input

  // Determine which content to merge (user edits take priority)
  const contentToMerge = editedContent || {
    professionalSummary: rewriteResult.professionalSummary,
    workExperiences: rewriteResult.workExperiences,
  }

  // If no original resume, create a fallback from the rewrite content
  if (!originalResume) {
    const fallbackResume = createFallbackResume(contentToMerge)
    return {
      mergedResume: fallbackResume,
      matchedCompanies: contentToMerge.workExperiences.map(exp => exp.company),
      unmatchedOriginal: [],
      unmatchedRewritten: [],
    }
  }

  // Merge work experiences
  const {
    merged: mergedWorkExperience,
    matchedCompanies,
    unmatchedOriginal,
    unmatchedRewritten,
  } = mergeWorkExperiences(originalResume.workExperience, contentToMerge.workExperiences)

  // Build the merged resume
  const mergedResume: ParsedResume = {
    ...originalResume,
    // Replace summary with rewritten/edited summary
    summary: contentToMerge.professionalSummary,
    // Replace work experience with merged version
    workExperience: mergedWorkExperience,
  }

  return {
    mergedResume,
    matchedCompanies,
    unmatchedOriginal,
    unmatchedRewritten,
  }
}

/**
 * Track which sections were modified in the merge
 */
export interface ModifiedSections {
  summary: boolean
  workExperience: Set<string> // Company names with modified bullets
}

/**
 * Determine which sections were modified during the merge
 */
export function getModifiedSections(
  original: ParsedResume,
  merged: ParsedResume
): ModifiedSections {
  const modified: ModifiedSections = {
    summary: original.summary !== merged.summary,
    workExperience: new Set(),
  }

  // Track which work experiences have different bullets
  merged.workExperience.forEach((mergedExp, index) => {
    const originalExp = original.workExperience[index]
    if (!originalExp) {
      modified.workExperience.add(mergedExp.company)
      return
    }

    // Check if bullets are different
    const originalBullets = originalExp.bullets.join('|')
    const mergedBullets = mergedExp.bullets.join('|')
    if (originalBullets !== mergedBullets) {
      modified.workExperience.add(mergedExp.company)
    }
  })

  return modified
}
