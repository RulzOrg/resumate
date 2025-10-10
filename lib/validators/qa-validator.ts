/**
 * QA Validator Service
 * Validates resumes against playbook rules and generates actionable recommendations
 */

import type { SystemPromptV1Output, QASection, JobAnalysisSection } from "../schemas-v2"

export interface CoverageValidation {
  requirement: string
  locations: string[]
  status: "excellent" | "good" | "partial" | "missing"
  recommendation: string
}

export interface DuplicateBullet {
  text: string
  locations: string[]
  similarity: number
}

export interface ReadabilityScore {
  overall: number
  bulletCompliance: number
  averageWordsPerBullet: number
  issues: string[]
}

export interface ValidationResult {
  coverage: CoverageValidation[]
  duplicates: DuplicateBullet[]
  readability: ReadabilityScore
  overallScore: number
  criticalIssues: string[]
  warnings: string[]
  suggestions: string[]
}

/**
 * Validates resume against QA rules from the playbook
 */
export function validateResume(
  structuredOutput: SystemPromptV1Output,
  jobAnalysis: JobAnalysisSection
): ValidationResult {
  const coverage = validateCoverage(structuredOutput, jobAnalysis)
  const duplicates = detectDuplicates(structuredOutput)
  const readability = scoreReadability(structuredOutput)
  
  const criticalIssues: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // Critical: Must-haves with 0 locations
  const missingMustHaves = coverage.filter((c) => c.status === "missing")
  if (missingMustHaves.length > 0) {
    criticalIssues.push(
      `Missing ${missingMustHaves.length} must-have skill(s): ${missingMustHaves.map((c) => c.requirement).join(", ")}`
    )
  }

  // Warning: Must-haves with only 1 location (need ≥2 per playbook)
  const partialMustHaves = coverage.filter((c) => c.status === "partial")
  if (partialMustHaves.length > 0) {
    warnings.push(
      `${partialMustHaves.length} must-have(s) appear only once (need ≥2): ${partialMustHaves.map((c) => c.requirement).join(", ")}`
    )
  }

  // Warning: Duplicate bullets
  if (duplicates.length > 0) {
    warnings.push(`Found ${duplicates.length} duplicate or very similar bullet(s)`)
  }

  // Warning: Poor readability
  if (readability.bulletCompliance < 70) {
    warnings.push(`Only ${readability.bulletCompliance}% of bullets meet 12-20 word guideline`)
  }

  // Suggestions
  if (coverage.length > 0) {
    const topGaps = coverage
      .filter((c) => c.status === "missing" || c.status === "partial")
      .slice(0, 3)
    topGaps.forEach((gap) => {
      suggestions.push(gap.recommendation)
    })
  }

  if (duplicates.length > 0) {
    suggestions.push(`Review duplicate bullets and keep only the strongest version`)
  }

  // Calculate overall score
  const coverageScore = (coverage.filter((c) => c.status === "excellent" || c.status === "good").length / Math.max(coverage.length, 1)) * 100
  const duplicatePenalty = Math.min(duplicates.length * 5, 20)
  const overallScore = Math.max(0, Math.round((coverageScore * 0.6 + readability.overall * 0.4) - duplicatePenalty))

  return {
    coverage,
    duplicates,
    readability,
    overallScore,
    criticalIssues,
    warnings,
    suggestions,
  }
}

/**
 * Validates that each must-have requirement appears ≥2 times (playbook rule)
 */
function validateCoverage(
  structuredOutput: SystemPromptV1Output,
  jobAnalysis: JobAnalysisSection
): CoverageValidation[] {
  const mustHaves = jobAnalysis.must_have_skills
  const ui = structuredOutput.ui

  return mustHaves.map((requirement) => {
    const locations: string[] = []
    const reqLower = requirement.toLowerCase()

    // Check summary
    if (ui.professional_summary.include && ui.professional_summary.primary.toLowerCase().includes(reqLower)) {
      locations.push("Summary")
    }

    // Check skills
    if (ui.skills.include) {
      Object.entries(ui.skills.groups).forEach(([category, skills]) => {
        if (skills.some((skill) => skill.toLowerCase().includes(reqLower) || reqLower.includes(skill.toLowerCase()))) {
          locations.push(`Skills: ${category}`)
        }
      })
    }

    // Check work experience bullets
    if (ui.work_experience.include) {
      ui.work_experience.items.forEach((item, itemIdx) => {
        if (!item.include) return
        item.bullets.primary.forEach((bullet, bulletIdx) => {
          if (bullet.toLowerCase().includes(reqLower)) {
            locations.push(`Experience: ${item.company} - bullet ${bulletIdx + 1}`)
          }
        })
      })
    }

    // Check education notes
    if (ui.education.include) {
      ui.education.items.forEach((item) => {
        if (item.notes.toLowerCase().includes(reqLower)) {
          locations.push(`Education: ${item.institution} - notes`)
        }
      })
    }

    // Determine status
    let status: CoverageValidation["status"]
    let recommendation: string

    if (locations.length >= 3) {
      status = "excellent"
      recommendation = `"${requirement}" appears ${locations.length} times - excellent coverage!`
    } else if (locations.length === 2) {
      status = "good"
      recommendation = `"${requirement}" meets the ≥2 appearances rule.`
    } else if (locations.length === 1) {
      status = "partial"
      recommendation = `Add "${requirement}" to one more section (currently only in: ${locations[0]}). Suggestion: Add to a work experience bullet.`
    } else {
      status = "missing"
      recommendation = `Add "${requirement}" to at least 2 sections. Suggestions: 1) Add to Skills section, 2) Include in a work experience bullet describing relevant project.`
    }

    return {
      requirement,
      locations,
      status,
      recommendation,
    }
  })
}

/**
 * Detects duplicate or very similar bullets using fuzzy matching
 */
function detectDuplicates(structuredOutput: SystemPromptV1Output): DuplicateBullet[] {
  const bullets: Array<{ text: string; location: string }> = []

  // Collect all bullets with locations
  structuredOutput.ui.work_experience.items.forEach((item, itemIdx) => {
    if (!item.include) return
    item.bullets.primary.forEach((bullet, bulletIdx) => {
      bullets.push({
        text: bullet,
        location: `${item.company} - bullet ${bulletIdx + 1}`,
      })
    })
  })

  const duplicates: DuplicateBullet[] = []
  const processed = new Set<number>()

  // Compare each bullet with every other bullet
  for (let i = 0; i < bullets.length; i++) {
    if (processed.has(i)) continue

    const group: string[] = [bullets[i].location]
    const text = bullets[i].text

    for (let j = i + 1; j < bullets.length; j++) {
      if (processed.has(j)) continue

      const similarity = calculateSimilarity(bullets[i].text, bullets[j].text)
      
      // Consider duplicate if >80% similar
      if (similarity > 0.8) {
        group.push(bullets[j].location)
        processed.add(j)
      }
    }

    if (group.length > 1) {
      duplicates.push({
        text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        locations: group,
        similarity: 1.0, // Simplified for now
      })
      processed.add(i)
    }
  }

  return duplicates
}

/**
 * Calculate similarity between two strings (Jaccard similarity on words)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/))
  const words2 = new Set(str2.toLowerCase().split(/\s+/))

  const intersection = new Set([...words1].filter((w) => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

/**
 * Scores readability based on bullet length, word count, and clarity
 */
function scoreReadability(structuredOutput: SystemPromptV1Output): ReadabilityScore {
  const bullets: string[] = []

  // Collect all bullets
  structuredOutput.ui.work_experience.items.forEach((item) => {
    if (item.include) {
      bullets.push(...item.bullets.primary)
    }
  })

  if (bullets.length === 0) {
    return {
      overall: 50,
      bulletCompliance: 0,
      averageWordsPerBullet: 0,
      issues: ["No bullets found to analyze"],
    }
  }

  const wordCounts = bullets.map((b) => b.trim().split(/\s+/).length)
  const averageWordsPerBullet = Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)

  // Count bullets in 12-20 word range (CAR format)
  const compliantBullets = wordCounts.filter((wc) => wc >= 12 && wc <= 20).length
  const bulletCompliance = Math.round((compliantBullets / bullets.length) * 100)

  const issues: string[] = []

  // Too short bullets
  const tooShort = wordCounts.filter((wc) => wc < 8).length
  if (tooShort > 0) {
    issues.push(`${tooShort} bullet(s) are very short (<8 words) - add context and results`)
  }

  // Too long bullets
  const tooLong = wordCounts.filter((wc) => wc > 25).length
  if (tooLong > 0) {
    issues.push(`${tooLong} bullet(s) are too long (>25 words) - simplify and focus on key outcome`)
  }

  // Check for weak action verbs
  const weakVerbs = ["was", "were", "is", "are", "responsible for", "worked on", "helped with", "did"]
  const bulletsWithWeakVerbs = bullets.filter((b) => {
    const firstFiveWords = b.toLowerCase().split(/\s+/).slice(0, 5).join(" ")
    return weakVerbs.some((weak) => firstFiveWords.includes(weak))
  }).length

  if (bulletsWithWeakVerbs > 0) {
    issues.push(`${bulletsWithWeakVerbs} bullet(s) start with weak verbs - use strong action verbs (Led, Optimized, Delivered, etc.)`)
  }

  // Overall score
  const lengthScore = bulletCompliance
  const verbScore = Math.max(0, 100 - (bulletsWithWeakVerbs / bullets.length) * 100)
  const overall = Math.round(lengthScore * 0.7 + verbScore * 0.3)

  return {
    overall,
    bulletCompliance,
    averageWordsPerBullet,
    issues,
  }
}

/**
 * Generates actionable suggestions based on validation results
 */
export function generateSuggestions(validation: ValidationResult): string[] {
  const suggestions: string[] = []

  // Coverage suggestions
  validation.coverage
    .filter((c) => c.status === "missing" || c.status === "partial")
    .slice(0, 3)
    .forEach((c) => {
      suggestions.push(c.recommendation)
    })

  // Duplicate suggestions
  if (validation.duplicates.length > 0) {
    suggestions.push(
      `Found ${validation.duplicates.length} duplicate bullet(s). Review and keep only the strongest version.`
    )
  }

  // Readability suggestions
  validation.readability.issues.forEach((issue) => {
    suggestions.push(issue)
  })

  return suggestions
}

/**
 * Validates format compliance (playbook step 9)
 */
export function validateFormatCompliance(structuredOutput: SystemPromptV1Output): {
  singleColumn: boolean
  noTablesOrTextboxes: boolean
  dateFormatConsistent: boolean
  tenseConsistent: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check date format consistency
  const dates: string[] = []
  structuredOutput.ui.work_experience.items.forEach((item) => {
    if (item.include) {
      dates.push(item.start_date, item.end_date)
    }
  })

  const dateFormats = new Set(
    dates.map((d) => {
      if (/^[A-Z][a-z]{2}\s+\d{4}$/.test(d)) return "MMM YYYY"
      if (/^\d{4}$/.test(d)) return "YYYY"
      if (/^Present$/i.test(d)) return "Present"
      return "Other"
    })
  )

  const dateFormatConsistent = dateFormats.size <= 2 // Allow "MMM YYYY" and "Present"
  if (!dateFormatConsistent) {
    issues.push("Inconsistent date formats detected. Use 'MMM YYYY' format (e.g., 'Jan 2021')")
  }

  // Check tense consistency (simplified - would need NLP for full check)
  const bullets: string[] = []
  structuredOutput.ui.work_experience.items.forEach((item, idx) => {
    if (item.include) {
      const isCurrent = item.end_date.toLowerCase() === "present"
      item.bullets.primary.forEach((bullet) => {
        bullets.push(bullet)
        // Simple heuristic: current jobs should have present tense verbs
        if (isCurrent && /ed\s/.test(bullet.split(/\s+/).slice(0, 3).join(" "))) {
          issues.push(`Current role at ${item.company} may have past-tense bullets (should be present tense)`)
        }
      })
    }
  })

  const tenseConsistent = issues.length === 0

  return {
    singleColumn: true, // Always true for our markdown format
    noTablesOrTextboxes: true, // Always true for our markdown format
    dateFormatConsistent,
    tenseConsistent,
    issues,
  }
}
