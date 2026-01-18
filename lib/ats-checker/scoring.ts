/**
 * ATS Checker Scoring Algorithm
 * Calculates overall and category scores based on individual checks
 */

import {
  SCORING_WEIGHTS,
  CONTENT_WEIGHTS,
  SECTIONS_WEIGHTS,
  ESSENTIALS_WEIGHTS,
  TAILORING_WEIGHTS,
  type SubcategoryResult,
  type ContentAnalysis,
  type SectionsAnalysis,
  type EssentialsAnalysis,
  type TailoringAnalysis,
  type ATSIssue,
} from './types'

/**
 * Calculate weighted score from subcategory results
 */
export function calculateWeightedScore(
  results: SubcategoryResult[],
  weights: Record<string, number>
): number {
  let totalWeight = 0
  let weightedSum = 0

  for (const result of results) {
    const weight = weights[result.key] || 0
    totalWeight += weight
    weightedSum += result.score * weight
  }

  if (totalWeight === 0) return 0
  return Math.round(weightedSum / totalWeight)
}

/**
 * Determine status based on score
 */
export function getStatus(score: number): 'pass' | 'warning' | 'fail' {
  if (score >= 80) return 'pass'
  if (score >= 60) return 'warning'
  return 'fail'
}

/**
 * Calculate content category score
 */
export function calculateContentScore(analysis: {
  parseRate: SubcategoryResult
  quantifyingImpact: SubcategoryResult
  repetition: SubcategoryResult
  spellingGrammar: SubcategoryResult
}): ContentAnalysis {
  const subcategories = [
    analysis.parseRate,
    analysis.quantifyingImpact,
    analysis.repetition,
    analysis.spellingGrammar,
  ]

  const score = calculateWeightedScore(subcategories, {
    parse_rate: CONTENT_WEIGHTS.parseRate,
    quantifying_impact: CONTENT_WEIGHTS.quantifyingImpact,
    repetition: CONTENT_WEIGHTS.repetition,
    spelling_grammar: CONTENT_WEIGHTS.spellingGrammar,
  })

  return {
    score,
    weight: SCORING_WEIGHTS.content,
    subcategories,
    parseRate: analysis.parseRate,
    quantifyingImpact: analysis.quantifyingImpact,
    repetition: analysis.repetition,
    spellingGrammar: analysis.spellingGrammar,
  }
}

/**
 * Calculate sections category score
 */
export function calculateSectionsScore(analysis: {
  contact: SubcategoryResult & { hasName: boolean; hasEmail: boolean; hasPhone: boolean; hasLocation: boolean }
  experience: SubcategoryResult & { entryCount: number; hasBullets: boolean }
  education: SubcategoryResult & { entryCount: number }
  skills: SubcategoryResult & { skillCount: number }
  summary: SubcategoryResult & { length: number }
}): SectionsAnalysis {
  const subcategories = [
    analysis.contact,
    analysis.experience,
    analysis.education,
    analysis.skills,
    analysis.summary,
  ]

  const score = calculateWeightedScore(subcategories, {
    contact: SECTIONS_WEIGHTS.contact,
    experience: SECTIONS_WEIGHTS.experience,
    education: SECTIONS_WEIGHTS.education,
    skills: SECTIONS_WEIGHTS.skills,
    summary: SECTIONS_WEIGHTS.summary,
  })

  return {
    score,
    weight: SCORING_WEIGHTS.sections,
    subcategories,
    contact: analysis.contact,
    experience: analysis.experience,
    education: analysis.education,
    skills: analysis.skills,
    summary: analysis.summary,
  }
}

/**
 * Calculate ATS essentials category score
 */
export function calculateEssentialsScore(analysis: {
  fileFormat: SubcategoryResult
  headings: SubcategoryResult
  tables: SubcategoryResult
  graphics: SubcategoryResult
  fonts: SubcategoryResult
  dates: SubcategoryResult
}): EssentialsAnalysis {
  const subcategories = [
    analysis.fileFormat,
    analysis.headings,
    analysis.tables,
    analysis.graphics,
    analysis.fonts,
    analysis.dates,
  ]

  const score = calculateWeightedScore(subcategories, {
    file_format: ESSENTIALS_WEIGHTS.fileFormat,
    headings: ESSENTIALS_WEIGHTS.headings,
    tables: ESSENTIALS_WEIGHTS.tables,
    graphics: ESSENTIALS_WEIGHTS.graphics,
    fonts: ESSENTIALS_WEIGHTS.fonts,
    dates: ESSENTIALS_WEIGHTS.dates,
  })

  return {
    score,
    weight: SCORING_WEIGHTS.atsEssentials,
    subcategories,
    fileFormat: analysis.fileFormat,
    headings: analysis.headings,
    tables: analysis.tables,
    graphics: analysis.graphics,
    fonts: analysis.fonts,
    dates: analysis.dates,
  }
}

/**
 * Calculate tailoring category score
 */
export function calculateTailoringScore(analysis: {
  keywordMatch: SubcategoryResult & {
    hardSkillsFound: string[]
    hardSkillsMissing: string[]
    softSkillsFound: string[]
    softSkillsMissing: string[]
  }
  skillsAlignment: SubcategoryResult & {
    requiredSkillsPresent: string[]
    requiredSkillsMissing: string[]
  }
} | null): TailoringAnalysis | null {
  if (!analysis) return null

  const subcategories = [
    analysis.keywordMatch,
    analysis.skillsAlignment,
  ]

  const score = calculateWeightedScore(subcategories, {
    keyword_match: TAILORING_WEIGHTS.keywordMatch,
    skills_alignment: TAILORING_WEIGHTS.skillsAlignment,
  })

  return {
    score,
    weight: SCORING_WEIGHTS.tailoring,
    subcategories,
    keywordMatch: analysis.keywordMatch,
    skillsAlignment: analysis.skillsAlignment,
  }
}

/**
 * Calculate overall ATS score from all categories
 */
export function calculateOverallScore(
  content: ContentAnalysis,
  sections: SectionsAnalysis,
  essentials: EssentialsAnalysis,
  tailoring: TailoringAnalysis | null
): number {
  // If no tailoring, redistribute its weight to other categories
  const hasJobDescription = tailoring !== null

  let weights: { content: number; sections: number; essentials: number; tailoring: number }

  if (hasJobDescription) {
    weights = {
      content: SCORING_WEIGHTS.content,
      sections: SCORING_WEIGHTS.sections,
      essentials: SCORING_WEIGHTS.atsEssentials,
      tailoring: SCORING_WEIGHTS.tailoring,
    }
  } else {
    // Redistribute tailoring weight proportionally
    const redistributedWeight = SCORING_WEIGHTS.tailoring
    const totalOtherWeight = SCORING_WEIGHTS.content + SCORING_WEIGHTS.sections + SCORING_WEIGHTS.atsEssentials

    weights = {
      content: SCORING_WEIGHTS.content + (SCORING_WEIGHTS.content / totalOtherWeight) * redistributedWeight,
      sections: SCORING_WEIGHTS.sections + (SCORING_WEIGHTS.sections / totalOtherWeight) * redistributedWeight,
      essentials: SCORING_WEIGHTS.atsEssentials + (SCORING_WEIGHTS.atsEssentials / totalOtherWeight) * redistributedWeight,
      tailoring: 0,
    }
  }

  const weightedSum =
    content.score * weights.content +
    sections.score * weights.sections +
    essentials.score * weights.essentials +
    (tailoring?.score || 0) * weights.tailoring

  const totalWeight = weights.content + weights.sections + weights.essentials + weights.tailoring

  return Math.round(weightedSum / totalWeight)
}

/**
 * Collect all issues from all categories
 */
export function collectAllIssues(
  content: ContentAnalysis,
  sections: SectionsAnalysis,
  essentials: EssentialsAnalysis,
  tailoring: TailoringAnalysis | null
): ATSIssue[] {
  const allIssues: ATSIssue[] = []

  // Collect from content
  for (const sub of content.subcategories) {
    allIssues.push(...sub.issues)
  }

  // Collect from sections
  for (const sub of sections.subcategories) {
    allIssues.push(...sub.issues)
  }

  // Collect from essentials
  for (const sub of essentials.subcategories) {
    allIssues.push(...sub.issues)
  }

  // Collect from tailoring if present
  if (tailoring) {
    for (const sub of tailoring.subcategories) {
      allIssues.push(...sub.issues)
    }
  }

  // Sort by severity: critical first, then warning, then info
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return allIssues
}

/**
 * Count issues by severity
 */
export function countIssuesBySeverity(issues: ATSIssue[]): {
  critical: number
  warning: number
  info: number
  total: number
} {
  const counts = { critical: 0, warning: 0, info: 0, total: issues.length }

  for (const issue of issues) {
    if (issue.severity === 'critical') counts.critical++
    else if (issue.severity === 'warning') counts.warning++
    else counts.info++
  }

  return counts
}

/**
 * Generate summary from analysis results
 */
export function generateSummary(
  content: ContentAnalysis,
  sections: SectionsAnalysis,
  essentials: EssentialsAnalysis,
  tailoring: TailoringAnalysis | null,
  issues: ATSIssue[]
): {
  strengths: string[]
  criticalIssues: string[]
  quickWins: string[]
} {
  const strengths: string[] = []
  const criticalIssues: string[] = []
  const quickWins: string[] = []

  // Identify strengths (high scores)
  if (content.parseRate.score >= 90) {
    strengths.push('Excellent ATS parse rate - your resume content is easily readable by ATS systems')
  }
  if (sections.experience.score >= 90) {
    strengths.push('Strong work experience section with proper formatting')
  }
  if (sections.skills.skillCount >= 10) {
    strengths.push(`Good skills coverage with ${sections.skills.skillCount} skills listed`)
  }
  if (essentials.fileFormat.score >= 100) {
    strengths.push('ATS-compatible file format')
  }
  if (content.quantifyingImpact.score >= 80) {
    strengths.push('Good use of metrics and quantified achievements')
  }

  // Identify critical issues
  const criticalList = issues.filter(i => i.severity === 'critical')
  for (const issue of criticalList.slice(0, 3)) {
    criticalIssues.push(issue.title)
  }

  // Identify quick wins (info or warning issues that are easy to fix)
  const quickFixCategories = ['repetition', 'spelling_grammar', 'dates', 'headings']
  for (const issue of issues) {
    if (issue.severity !== 'critical' && quickFixCategories.includes(issue.subcategory)) {
      quickWins.push(issue.recommendation)
      if (quickWins.length >= 3) break
    }
  }

  // Add default messages if empty
  if (strengths.length === 0) {
    strengths.push('Your resume was successfully uploaded and parsed')
  }
  if (criticalIssues.length === 0 && issues.some(i => i.severity === 'warning')) {
    criticalIssues.push('No critical issues, but there are areas for improvement')
  }
  if (quickWins.length === 0 && issues.length > 0) {
    quickWins.push('Review the detailed analysis below for specific improvements')
  }

  return { strengths, criticalIssues, quickWins }
}

/**
 * Get score color/grade for display
 */
export function getScoreGrade(score: number): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  color: 'green' | 'yellow' | 'orange' | 'red'
  label: string
} {
  if (score >= 90) return { grade: 'A', color: 'green', label: 'Excellent' }
  if (score >= 80) return { grade: 'B', color: 'green', label: 'Good' }
  if (score >= 70) return { grade: 'C', color: 'yellow', label: 'Fair' }
  if (score >= 60) return { grade: 'D', color: 'orange', label: 'Needs Work' }
  return { grade: 'F', color: 'red', label: 'Poor' }
}
