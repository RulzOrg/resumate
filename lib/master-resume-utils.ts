/**
 * Master Resume Utilities
 * Helper functions for master resume page
 */

/**
 * Calculate word count from text
 */
export function getWordCount(text: string | null | undefined): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Estimate page count based on word count
 * Average: 500-600 words per page
 */
export function getPageCount(wordCount: number): number {
  if (wordCount === 0) return 0
  return Math.ceil(wordCount / 550)
}

/**
 * Extract skills from parsed sections or text
 */
export function extractSkills(
  text: string | null | undefined,
  parsedSections?: Record<string, any> | null
): string[] {
  const skills: string[] = []

  // Try to get skills from parsed sections first
  if (parsedSections?.skills) {
    if (Array.isArray(parsedSections.skills)) {
      return parsedSections.skills
        .map(skill => {
          // Handle object format {id, value, include}
          if (typeof skill === 'object' && skill?.value) {
            return skill.value
          }
          // Handle string format
          return typeof skill === 'string' ? skill : null
        })
        .filter((s): s is string => s !== null && s.length > 0)
        .slice(0, 10) // Limit to 10
    }
    if (typeof parsedSections.skills === 'string') {
      return parsedSections.skills
        .split(/[,;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 10)
    }
  }

  // Fallback: Extract common tech skills from text
  if (text) {
    const commonSkills = [
      'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java',
      'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'GraphQL',
      'Next.js', 'Vue', 'Angular', 'Go', 'Rust', 'C++', 'SQL',
      'Redux', 'Git', 'CI/CD', 'Agile', 'TDD', 'REST', 'API',
      'Machine Learning', 'AI', 'Data Science', 'DevOps'
    ]

    for (const skill of commonSkills) {
      // Escape special regex characters in skill name
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i')
      if (regex.test(text) && !skills.includes(skill)) {
        skills.push(skill)
      }
    }
  }

  return skills.slice(0, 10) // Limit to 10
}

/**
 * Calculate basic ATS score
 * Simple algorithm based on:
 * - Keywords density
 * - Length appropriateness
 * - Action verbs
 * - Formatting indicators
 */
export function calculateATSScore(
  content: string | null | undefined,
  skills: string[]
): number {
  if (!content) return 0

  let score = 0
  const wordCount = getWordCount(content)

  // 1. Length score (30 points)
  if (wordCount >= 400 && wordCount <= 800) {
    score += 30 // Optimal length
  } else if (wordCount >= 300 && wordCount <= 1000) {
    score += 20 // Acceptable
  } else if (wordCount > 0) {
    score += 10 // Too short or too long
  }

  // 2. Skills/Keywords density (30 points)
  const skillScore = Math.min(skills.length * 3, 30)
  score += skillScore

  // 3. Action verbs (20 points)
  const actionVerbs = [
    'led', 'managed', 'developed', 'created', 'implemented', 'designed',
    'built', 'launched', 'improved', 'increased', 'reduced', 'achieved',
    'delivered', 'established', 'optimized', 'streamlined', 'collaborated'
  ]
  let actionVerbCount = 0
  for (const verb of actionVerbs) {
    const regex = new RegExp(`\\b${verb}\\b`, 'gi')
    const matches = content.match(regex)
    if (matches) {
      actionVerbCount += matches.length
    }
  }
  score += Math.min(actionVerbCount * 2, 20)

  // 4. Structure indicators (20 points)
  // Check for common resume sections
  const sections = [
    /experience/i,
    /education/i,
    /skills/i,
    /summary/i,
    /projects/i
  ]
  let sectionCount = 0
  for (const section of sections) {
    if (section.test(content)) {
      sectionCount++
    }
  }
  score += Math.min(sectionCount * 4, 20)

  return Math.min(Math.round(score), 100)
}

/**
 * Get color for ATS score
 */
export function getATSScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-300'
  if (score >= 80) return 'text-emerald-300'
  if (score >= 70) return 'text-yellow-300'
  return 'text-amber-300'
}

/**
 * Get background color for ATS score bar
 */
export function getATSScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 70) return 'bg-yellow-500'
  return 'bg-amber-500'
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffWeeks = Math.floor(diffMs / 604800000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffWeeks === 1) return '1w ago'
  if (diffWeeks < 4) return `${diffWeeks}w ago`

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Get activity action text
 */
export function getActivityAction(kind: string, isNew: boolean): string {
  if (isNew) {
    if (kind === 'uploaded') return 'Uploaded'
    if (kind === 'master') return 'Created master'
    if (kind === 'duplicate') return 'Duplicated'
    return 'Added'
  }
  return 'Edited'
}

/**
 * Format last export time
 */
export function formatLastExport(date: string | Date | null): string {
  if (!date) return 'Never'
  
  const now = new Date()
  const then = new Date(date)
  const diffDays = Math.floor((now.getTime() - then.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  
  return `${Math.floor(diffDays / 30)} months ago`
}

/**
 * Get resume summary from content
 * Extracts first 200 characters or summary section
 */
export function getResumeSummary(
  content: string | null | undefined,
  parsedSections?: Record<string, any> | null
): string {
  // Try to get summary from parsed sections
  if (parsedSections?.summary && typeof parsedSections.summary === 'string') {
    return parsedSections.summary.slice(0, 250)
  }

  if (parsedSections?.objective && typeof parsedSections.objective === 'string') {
    return parsedSections.objective.slice(0, 250)
  }

  // Fallback: Get first paragraph from content
  if (!content) return 'No summary available'

  // Try to find a summary-like section (using [\s\S] instead of dotall flag for compatibility)
  const summaryMatch = content.match(/(?:summary|objective|profile)[:\s]*([\s\S]+?)(?:\n\n|\n[A-Z])/i)
  if (summaryMatch && summaryMatch[1]) {
    return summaryMatch[1].trim().slice(0, 250)
  }

  // Otherwise return first 200 chars
  return content.trim().slice(0, 200).trim() + '...'
}
