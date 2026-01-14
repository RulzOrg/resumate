/**
 * Section Analysis Checks
 * Analyzes presence and quality of resume sections
 */

import { v4 as uuidv4 } from 'uuid'
import type { ParsedResume } from '@/lib/resume-parser'
import type { SubcategoryResult, ATSIssue, SectionsSubcategory } from './types'
import { getStatus } from './scoring'

/**
 * Analyze contact information section
 */
export function analyzeContactSection(parsed: ParsedResume): SubcategoryResult & {
  hasName: boolean
  hasEmail: boolean
  hasPhone: boolean
  hasLocation: boolean
} {
  const issues: ATSIssue[] = []

  const hasName = !!parsed.contact.name && parsed.contact.name.length > 1
  const hasEmail = !!parsed.contact.email && parsed.contact.email.includes('@')
  const hasPhone = !!parsed.contact.phone && parsed.contact.phone.length >= 10
  const hasLocation = !!parsed.contact.location && parsed.contact.location.length > 2
  const hasLinkedIn = !!parsed.contact.linkedin

  // Calculate score based on essential fields
  let score = 0
  if (hasName) score += 30
  if (hasEmail) score += 35
  if (hasPhone) score += 25
  if (hasLocation) score += 10

  // Generate issues for missing fields
  if (!hasName) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'contact',
      severity: 'critical',
      title: 'Missing Name',
      description: 'Your name was not detected in the resume.',
      recommendation: 'Add your full name at the top of your resume in a clear, prominent position.',
      fixable: true,
    })
  }

  if (!hasEmail) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'contact',
      severity: 'critical',
      title: 'Missing Email Address',
      description: 'No email address was found in your resume.',
      recommendation: 'Add a professional email address. Avoid using personal emails like "coolguy123@...".',
      fixable: true,
    })
  }

  if (!hasPhone) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'contact',
      severity: 'warning',
      title: 'Missing Phone Number',
      description: 'No phone number was detected.',
      recommendation: 'Add a phone number where recruiters can reach you.',
      fixable: true,
    })
  }

  if (!hasLocation) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'contact',
      severity: 'info',
      title: 'No Location Listed',
      description: 'Your location/city was not found.',
      recommendation: 'Consider adding your city and state/country. This helps with local job matching.',
      fixable: true,
    })
  }

  if (!hasLinkedIn) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'contact',
      severity: 'info',
      title: 'No LinkedIn Profile',
      description: 'LinkedIn profile link was not detected.',
      recommendation: 'Adding a LinkedIn URL can strengthen your professional presence.',
      fixable: true,
    })
  }

  return {
    name: 'Contact Information',
    key: 'contact',
    score,
    status: getStatus(score),
    issues,
    details: `${[hasName, hasEmail, hasPhone, hasLocation].filter(Boolean).length}/4 essential fields present`,
    hasName,
    hasEmail,
    hasPhone,
    hasLocation,
  }
}

/**
 * Analyze work experience section
 */
export function analyzeExperienceSection(parsed: ParsedResume): SubcategoryResult & {
  entryCount: number
  hasBullets: boolean
} {
  const issues: ATSIssue[] = []

  const entryCount = parsed.workExperience.length
  const hasBullets = parsed.workExperience.some(exp => exp.bullets.length > 0)
  const totalBullets = parsed.workExperience.reduce((sum, exp) => sum + exp.bullets.length, 0)

  // Calculate score
  let score = 0

  if (entryCount === 0) {
    score = 0
  } else if (entryCount >= 3) {
    score += 40
  } else if (entryCount >= 2) {
    score += 30
  } else {
    score += 20
  }

  if (hasBullets) {
    score += 30
    if (totalBullets >= entryCount * 3) {
      score += 30 // 3+ bullets per job
    } else if (totalBullets >= entryCount * 2) {
      score += 20
    } else {
      score += 10
    }
  }

  // Generate issues
  if (entryCount === 0) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'experience',
      severity: 'critical',
      title: 'No Work Experience Found',
      description: 'The work experience section was not detected or is empty.',
      recommendation: 'Add a "Work Experience" or "Professional Experience" section with your job history.',
      fixable: true,
    })
  } else if (!hasBullets) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'experience',
      severity: 'warning',
      title: 'No Bullet Points in Experience',
      description: 'Your work experience entries lack bullet points describing your achievements.',
      recommendation: 'Add 3-5 bullet points per role highlighting your key accomplishments and responsibilities.',
      fixable: true,
    })
  } else if (totalBullets < entryCount * 2) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'experience',
      severity: 'info',
      title: 'Add More Bullet Points',
      description: `Average of ${Math.round(totalBullets / entryCount)} bullets per role. Consider adding more.`,
      recommendation: 'Aim for 3-5 bullet points per role to fully showcase your achievements.',
      fixable: true,
    })
  }

  // Check for missing company names or job titles
  const missingInfo = parsed.workExperience.filter(exp => !exp.company || !exp.title)
  if (missingInfo.length > 0) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'experience',
      severity: 'warning',
      title: 'Incomplete Job Entries',
      description: `${missingInfo.length} job entries are missing company name or job title.`,
      recommendation: 'Ensure each position includes both the company name and your job title.',
      fixable: true,
    })
  }

  return {
    name: 'Work Experience',
    key: 'experience',
    score,
    status: getStatus(score),
    issues,
    details: `${entryCount} positions with ${totalBullets} total bullets`,
    entryCount,
    hasBullets,
  }
}

/**
 * Analyze education section
 */
export function analyzeEducationSection(parsed: ParsedResume): SubcategoryResult & {
  entryCount: number
} {
  const issues: ATSIssue[] = []

  const entryCount = parsed.education.length

  // Calculate score
  let score = 0

  if (entryCount === 0) {
    score = 50 // Not always required depending on experience
  } else if (entryCount >= 1) {
    score = 70

    // Check for complete entries
    const completeEntries = parsed.education.filter(edu =>
      edu.institution && (edu.degree || edu.field)
    ).length

    if (completeEntries === entryCount) {
      score = 100
    } else {
      score = 70 + (completeEntries / entryCount) * 30
    }
  }

  // Generate issues
  if (entryCount === 0) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'education',
      severity: 'warning',
      title: 'No Education Section',
      description: 'Education section was not found.',
      recommendation: 'Add an "Education" section with your degrees, certifications, or relevant training.',
      fixable: true,
    })
  } else {
    const incompleteEntries = parsed.education.filter(edu =>
      !edu.institution || (!edu.degree && !edu.field)
    )

    if (incompleteEntries.length > 0) {
      issues.push({
        id: uuidv4(),
        category: 'sections',
        subcategory: 'education',
        severity: 'info',
        title: 'Incomplete Education Entries',
        description: `${incompleteEntries.length} education entries may be missing institution name or degree.`,
        recommendation: 'Ensure each entry includes the institution name and degree/certificate earned.',
        fixable: true,
      })
    }
  }

  return {
    name: 'Education',
    key: 'education',
    score: Math.round(score),
    status: getStatus(score),
    issues,
    details: `${entryCount} education entries`,
    entryCount,
  }
}

/**
 * Analyze skills section
 */
export function analyzeSkillsSection(parsed: ParsedResume): SubcategoryResult & {
  skillCount: number
} {
  const issues: ATSIssue[] = []

  const skillCount = parsed.skills.length

  // Calculate score
  let score = 0

  if (skillCount === 0) {
    score = 0
  } else if (skillCount >= 10) {
    score = 100
  } else if (skillCount >= 7) {
    score = 85
  } else if (skillCount >= 5) {
    score = 70
  } else if (skillCount >= 3) {
    score = 50
  } else {
    score = 30
  }

  // Generate issues
  if (skillCount === 0) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'skills',
      severity: 'critical',
      title: 'No Skills Section',
      description: 'Skills section was not found or is empty.',
      recommendation: 'Add a "Skills" section listing your technical skills, tools, and competencies.',
      fixable: true,
    })
  } else if (skillCount < 5) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'skills',
      severity: 'warning',
      title: 'Limited Skills Listed',
      description: `Only ${skillCount} skills detected. Most successful resumes list 8-15 relevant skills.`,
      recommendation: 'Add more skills relevant to your target roles, including both technical and soft skills.',
      fixable: true,
    })
  } else if (skillCount < 8) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'skills',
      severity: 'info',
      title: 'Consider Adding More Skills',
      description: `${skillCount} skills listed. Adding a few more could improve keyword matching.`,
      recommendation: 'Consider adding more skills from job descriptions you\'re targeting.',
      fixable: true,
    })
  }

  return {
    name: 'Skills',
    key: 'skills',
    score,
    status: getStatus(score),
    issues,
    details: `${skillCount} skills listed`,
    skillCount,
  }
}

/**
 * Analyze professional summary section
 */
export function analyzeSummarySection(parsed: ParsedResume): SubcategoryResult & {
  length: number
} {
  const issues: ATSIssue[] = []

  const summary = parsed.summary || ''
  const length = summary.length
  const wordCount = summary.split(/\s+/).filter(Boolean).length

  // Calculate score
  let score = 0

  if (!summary || length === 0) {
    score = 50 // Not always required
  } else if (wordCount >= 30 && wordCount <= 80) {
    score = 100 // Ideal length
  } else if (wordCount >= 20 && wordCount <= 100) {
    score = 85
  } else if (wordCount > 100) {
    score = 70 // Too long
  } else {
    score = 60 // Too short
  }

  // Generate issues
  if (!summary || length === 0) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'summary',
      severity: 'info',
      title: 'No Professional Summary',
      description: 'A professional summary was not detected.',
      recommendation: 'Consider adding a 2-4 sentence summary highlighting your key qualifications and career goals.',
      fixable: true,
    })
  } else if (wordCount > 100) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'summary',
      severity: 'info',
      title: 'Summary May Be Too Long',
      description: `Your summary is ${wordCount} words. Ideal length is 30-80 words.`,
      recommendation: 'Consider condensing your summary to focus on your most compelling qualifications.',
      fixable: true,
    })
  } else if (wordCount < 20 && wordCount > 0) {
    issues.push({
      id: uuidv4(),
      category: 'sections',
      subcategory: 'summary',
      severity: 'info',
      title: 'Summary May Be Too Short',
      description: `Your summary is only ${wordCount} words.`,
      recommendation: 'Expand your summary to better highlight your experience and career objectives.',
      fixable: true,
    })
  }

  return {
    name: 'Professional Summary',
    key: 'summary',
    score,
    status: getStatus(score),
    issues,
    details: summary ? `${wordCount} words` : 'Not present',
    length,
  }
}

/**
 * Run all section checks
 */
export function runSectionChecks(parsed: ParsedResume): {
  contact: ReturnType<typeof analyzeContactSection>
  experience: ReturnType<typeof analyzeExperienceSection>
  education: ReturnType<typeof analyzeEducationSection>
  skills: ReturnType<typeof analyzeSkillsSection>
  summary: ReturnType<typeof analyzeSummarySection>
} {
  return {
    contact: analyzeContactSection(parsed),
    experience: analyzeExperienceSection(parsed),
    education: analyzeEducationSection(parsed),
    skills: analyzeSkillsSection(parsed),
    summary: analyzeSummarySection(parsed),
  }
}
