/**
 * Algorithmic match score engine.
 * Replaces LLM-hallucinated match scores with deterministic keyword-based scoring.
 * Pure computation — no API calls — safe to run client-side for live scoring.
 */

import type { ParsedResume } from "@/lib/resume-parser"
import {
  extractJobKeywords,
  fuzzyMatch,
  normalizeText,
  type ExtractedKeywords,
} from "./match-score-keywords"

export interface MatchScoreResult {
  /** Overall score 0–100 */
  score: number
  breakdown: {
    /** What % of job keywords appear in the resume (0–100) */
    keywordCoverage: number
    /** What % of detected skill terms are present (0–100) */
    skillsAlignment: number
    /** What % of experience bullets contain at least one job keyword (0–100) */
    experienceRelevance: number
    /** Are expected resume sections present? (0–100) */
    sectionCompleteness: number
  }
  matchedKeywords: string[]
  missingKeywords: string[]
  matchedSkills: string[]
  missingSkills: string[]
}

/** Scoring weights */
const WEIGHTS = {
  keywordCoverage: 0.4,
  skillsAlignment: 0.3,
  experienceRelevance: 0.2,
  sectionCompleteness: 0.1,
}

/**
 * Compute a deterministic match score between a resume and a job posting.
 *
 * @param resume   Parsed resume data
 * @param jobDescription  Raw job description text
 * @param _jobTitle  Job title (currently unused, reserved for future weighting)
 * @returns Score breakdown with matched/missing details
 */
export function computeMatchScore(
  resume: ParsedResume,
  jobDescription: string,
  _jobTitle?: string
): MatchScoreResult {
  const keywords = extractJobKeywords(jobDescription)
  const resumeText = buildResumeText(resume)

  const keywordResult = scoreKeywordCoverage(keywords, resumeText)
  const skillsResult = scoreSkillsAlignment(keywords, resume)
  const experienceResult = scoreExperienceRelevance(keywords, resume)
  const sectionResult = scoreSectionCompleteness(resume)

  const score = Math.round(
    keywordResult.score * WEIGHTS.keywordCoverage +
      skillsResult.score * WEIGHTS.skillsAlignment +
      experienceResult.score * WEIGHTS.experienceRelevance +
      sectionResult.score * WEIGHTS.sectionCompleteness
  )

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      keywordCoverage: Math.round(keywordResult.score),
      skillsAlignment: Math.round(skillsResult.score),
      experienceRelevance: Math.round(experienceResult.score),
      sectionCompleteness: Math.round(sectionResult.score),
    },
    matchedKeywords: keywordResult.matched,
    missingKeywords: keywordResult.missing,
    matchedSkills: skillsResult.matched,
    missingSkills: skillsResult.missing,
  }
}

/** Flatten all resume text into a single searchable string */
function buildResumeText(resume: ParsedResume): string {
  const parts: string[] = []

  if (resume.contact.name) parts.push(resume.contact.name)
  if (resume.targetTitle) parts.push(resume.targetTitle)
  if (resume.summary) parts.push(resume.summary)

  for (const exp of resume.workExperience) {
    if (exp.company) parts.push(exp.company)
    if (exp.title) parts.push(exp.title)
    parts.push(...exp.bullets)
  }

  for (const edu of resume.education) {
    if (edu.institution) parts.push(edu.institution)
    if (edu.degree) parts.push(edu.degree)
    if (edu.field) parts.push(edu.field)
  }

  parts.push(...resume.skills)

  for (const cert of resume.certifications) {
    parts.push(cert.name)
    if (cert.issuer) parts.push(cert.issuer)
  }

  for (const project of resume.projects) {
    parts.push(project.name)
    if (project.description) parts.push(project.description)
    parts.push(...project.bullets)
  }

  parts.push(...resume.interests)
  parts.push(...resume.awards)

  for (const vol of resume.volunteering) {
    parts.push(vol.organization)
    if (vol.role) parts.push(vol.role)
  }

  for (const pub of resume.publications) {
    parts.push(pub.title)
    if (pub.publisher) parts.push(pub.publisher)
  }

  return parts.join(" ")
}

/** Score keyword coverage: what % of important job keywords appear in the resume */
function scoreKeywordCoverage(
  keywords: ExtractedKeywords,
  resumeText: string
): { score: number; matched: string[]; missing: string[] } {
  // Combine required + phrases for matching, prioritize required
  const toCheck = deduplicateKeywords([...keywords.required, ...keywords.phrases])

  // If very few keywords extracted, fall back to all keywords
  const targets = toCheck.length >= 5 ? toCheck : deduplicateKeywords(keywords.all).slice(0, 30)

  if (targets.length === 0) return { score: 50, matched: [], missing: [] }

  const matched: string[] = []
  const missing: string[] = []

  for (const keyword of targets) {
    if (fuzzyMatch(keyword, resumeText)) {
      matched.push(keyword)
    } else {
      missing.push(keyword)
    }
  }

  const score = (matched.length / targets.length) * 100
  return { score, matched, missing }
}

/** Score skills alignment: what % of detected skill terms are present */
function scoreSkillsAlignment(
  keywords: ExtractedKeywords,
  resume: ParsedResume
): { score: number; matched: string[]; missing: string[] } {
  const jobSkills = keywords.skills
  if (jobSkills.length === 0) return { score: 80, matched: [], missing: [] }

  // Build resume skills text from skills array + all resume content
  const resumeSkillsText = [
    ...resume.skills,
    resume.summary || "",
    ...resume.workExperience.flatMap((e) => [e.title || "", ...e.bullets]),
    ...resume.projects.flatMap((p) => [p.name, p.description || "", ...p.bullets]),
    ...resume.certifications.map((c) => c.name),
  ].join(" ")

  const matched: string[] = []
  const missing: string[] = []

  for (const skill of jobSkills) {
    if (fuzzyMatch(skill, resumeSkillsText)) {
      matched.push(skill)
    } else {
      missing.push(skill)
    }
  }

  const score = (matched.length / jobSkills.length) * 100
  return { score, matched, missing }
}

/** Score experience relevance: what % of experience bullets contain job keywords */
function scoreExperienceRelevance(
  keywords: ExtractedKeywords,
  resume: ParsedResume
): { score: number } {
  const allBullets = resume.workExperience.flatMap((e) => e.bullets)
  if (allBullets.length === 0) return { score: 0 }

  // Use top keywords for checking
  const topKeywords = deduplicateKeywords([
    ...keywords.required.slice(0, 15),
    ...keywords.skills.slice(0, 10),
    ...keywords.phrases.slice(0, 10),
  ])

  if (topKeywords.length === 0) return { score: 50 }

  let relevantBullets = 0
  for (const bullet of allBullets) {
    const normalizedBullet = normalizeText(bullet)
    if (topKeywords.some((kw) => fuzzyMatch(kw, normalizedBullet))) {
      relevantBullets++
    }
  }

  const score = (relevantBullets / allBullets.length) * 100
  return { score }
}

/** Score section completeness: are essential resume sections present? */
function scoreSectionCompleteness(resume: ParsedResume): { score: number } {
  let present = 0
  const total = 5

  if (resume.contact.name) present++
  if (resume.summary) present++
  if (resume.workExperience.length > 0) present++
  if (resume.education.length > 0) present++
  if (resume.skills.length > 0) present++

  return { score: (present / total) * 100 }
}

/** Remove duplicate or near-duplicate keywords */
function deduplicateKeywords(keywords: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const kw of keywords) {
    const normalized = normalizeText(kw)
    if (normalized.length > 1 && !seen.has(normalized)) {
      seen.add(normalized)
      result.push(kw)
    }
  }

  return result
}
