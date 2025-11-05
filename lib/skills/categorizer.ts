/**
 * Skill categorization utilities for ATS-compliant skill classification
 * Categorizes skills into Hard Skills, Soft Skills, and Others based on industry standards
 */

export interface CategorizedSkills {
  hard: string[]
  soft: string[]
  other: string[]
}

export interface SkillMatchRatio {
  matched: number
  total: number
}

export interface SkillMatchResult {
  hard: SkillMatchRatio
  soft: SkillMatchRatio
  other: SkillMatchRatio
  categorizedUserSkills: CategorizedSkills
  categorizedJobSkills: CategorizedSkills
}

/**
 * Normalize skill strings for comparison
 * Handles common variations, removes extra spaces, converts to lowercase
 */
export function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\+\#\-\.]/g, '') // Keep alphanumeric, spaces, and common skill characters
}

/**
 * Check if two skills match, considering common variations and synonyms
 */
export function skillsMatch(skill1: string, skill2: string): boolean {
  const normalized1 = normalizeSkill(skill1)
  const normalized2 = normalizeSkill(skill2)

  // Exact match
  if (normalized1 === normalized2) return true

  // Check if one contains the other (e.g., "React" in "React.js")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true
  }

  // Common synonyms and variations
  const synonymGroups = [
    ['javascript', 'js', 'javascript es6', 'es6', 'ecmascript'],
    ['typescript', 'ts'],
    ['react', 'reactjs', 'react.js'],
    ['vue', 'vuejs', 'vue.js'],
    ['angular', 'angularjs'],
    ['node', 'nodejs', 'node.js'],
    ['python', 'python3', 'python 3'],
    ['ci/cd', 'cicd', 'continuous integration', 'continuous delivery', 'continuous deployment'],
    ['aws', 'amazon web services'],
    ['gcp', 'google cloud platform', 'google cloud'],
    ['ui/ux', 'ui ux', 'ux/ui', 'ux ui', 'user experience', 'user interface'],
    ['ml', 'machine learning'],
    ['ai', 'artificial intelligence'],
    ['api', 'apis', 'rest api', 'restful api'],
    ['sql', 'structured query language'],
    ['nosql', 'no-sql'],
    ['k8s', 'kubernetes'],
    ['docker', 'containerization'],
    ['agile', 'agile methodology', 'scrum', 'kanban'],
    ['project management', 'pm', 'project manager'],
    ['communication', 'communication skills', 'verbal communication', 'written communication'],
    ['leadership', 'leadership skills', 'team leadership', 'leading teams'],
    ['teamwork', 'team work', 'collaboration', 'team collaboration'],
    ['problem solving', 'problem-solving', 'analytical thinking', 'critical thinking'],
  ]

  // Check if both skills belong to the same synonym group
  for (const group of synonymGroups) {
    const group1Has = group.some(s => normalized1.includes(s) || s.includes(normalized1))
    const group2Has = group.some(s => normalized2.includes(s) || s.includes(normalized2))
    if (group1Has && group2Has) return true
  }

  return false
}

/**
 * Calculate skill match ratios between user skills and job requirements
 */
export function calculateSkillMatch(
  userSkills: CategorizedSkills,
  jobSkills: CategorizedSkills
): SkillMatchResult {
  const calculateCategoryMatch = (userCategory: string[], jobCategory: string[]): SkillMatchRatio => {
    let matched = 0

    for (const jobSkill of jobCategory) {
      const hasMatch = userCategory.some(userSkill => skillsMatch(userSkill, jobSkill))
      if (hasMatch) matched++
    }

    return {
      matched,
      total: jobCategory.length
    }
  }

  return {
    hard: calculateCategoryMatch(userSkills.hard, jobSkills.hard),
    soft: calculateCategoryMatch(userSkills.soft, jobSkills.soft),
    other: calculateCategoryMatch(userSkills.other, jobSkills.other),
    categorizedUserSkills: userSkills,
    categorizedJobSkills: jobSkills
  }
}

/**
 * Merge multiple skill arrays and categorize them
 * Used for combining keywords, required_skills, preferred_skills from job analysis
 */
export function mergeAndCategorizeSkills(
  categorizedSkills: CategorizedSkills,
  additionalSkills?: string[]
): CategorizedSkills {
  if (!additionalSkills || additionalSkills.length === 0) {
    return categorizedSkills
  }

  // For now, additional skills that aren't already categorized go to "other"
  // In the future, we could use AI to categorize these as well
  const result = {
    hard: [...categorizedSkills.hard],
    soft: [...categorizedSkills.soft],
    other: [...categorizedSkills.other]
  }

  // Add uncategorized skills to "other" if they don't already exist
  for (const skill of additionalSkills) {
    const normalized = normalizeSkill(skill)
    const existsInHard = result.hard.some(s => normalizeSkill(s) === normalized)
    const existsInSoft = result.soft.some(s => normalizeSkill(s) === normalized)
    const existsInOther = result.other.some(s => normalizeSkill(s) === normalized)

    if (!existsInHard && !existsInSoft && !existsInOther) {
      result.other.push(skill)
    }
  }

  return result
}

/**
 * Format skill match ratio for display
 */
export function formatSkillRatio(ratio: SkillMatchRatio): string {
  return `${ratio.matched}/${ratio.total}`
}