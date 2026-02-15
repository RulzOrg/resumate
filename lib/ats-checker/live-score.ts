/**
 * Live ATS Score Engine
 * Lightweight client-side scoring that operates on ParsedResume objects.
 * Reuses existing section/content checks where possible.
 * Designed for debounced real-time scoring in the resume editor.
 */

import type { ParsedResume } from '@/lib/resume-parser'
import type { ATSIssue, SubcategoryResult } from './types'
import { SECTIONS_WEIGHTS } from './types'
import { calculateWeightedScore, getStatus, getScoreGrade } from './scoring'
import { analyzeQuantifyingImpact } from './content-checks'
import {
  analyzeContactSection,
  analyzeExperienceSection,
  analyzeEducationSection,
  analyzeSkillsSection,
  analyzeSummarySection,
} from './section-checks'

// --- Weight configuration for live scoring ---

const LIVE_SCORING_WEIGHTS = {
  content: 45,
  sections: 35,
  tailoring: 20,
} as const

const LIVE_CONTENT_WEIGHTS = {
  quantifying_impact: 50,
  repetition: 50,
} as const

const LIVE_TAILORING_WEIGHTS = {
  keyword_match: 60,
  skills_alignment: 40,
} as const

// Common words to exclude from repetition & keyword analysis
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'was', 'were', 'have', 'has', 'had',
  'that', 'this', 'from', 'they', 'been', 'which', 'their', 'more',
  'will', 'would', 'could', 'should', 'about', 'into', 'over', 'such',
  'team', 'work', 'year', 'years', 'company', 'business', 'management',
  'project', 'projects', 'development', 'experience', 'skills', 'using',
  'also', 'well', 'able', 'each', 'make', 'like', 'than', 'very',
  'when', 'what', 'your', 'just', 'know', 'take', 'people', 'come',
  'made', 'after', 'back', 'only', 'most', 'where', 'them', 'these',
  'some', 'then', 'other', 'being', 'here', 'both', 'between', 'including',
])

// --- Result types ---

export interface LiveCategoryScore {
  score: number
  weight: number
  details: string
  subcategories: SubcategoryResult[]
}

export interface LiveATSResult {
  overallScore: number
  grade: ReturnType<typeof getScoreGrade>
  categories: {
    content: LiveCategoryScore
    sections: LiveCategoryScore
    tailoring: LiveCategoryScore | null
  }
  issues: ATSIssue[]
  issueCount: { critical: number; warning: number; info: number; total: number }
}

export interface ScoreHint {
  type: 'improvement' | 'warning' | 'tip'
  message: string
  delta?: number
}

// --- Helper: extract full text from ParsedResume ---

export function extractResumeText(resume: ParsedResume): string {
  const parts: string[] = []

  if (resume.contact.name) parts.push(resume.contact.name)
  if (resume.summary) parts.push(resume.summary)
  if (resume.targetTitle) parts.push(resume.targetTitle)

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
    if (cert.name) parts.push(cert.name)
  }

  for (const proj of resume.projects) {
    if (proj.name) parts.push(proj.name)
    if (proj.description) parts.push(proj.description)
    if (proj.technologies) parts.push(...proj.technologies)
    parts.push(...proj.bullets)
  }

  parts.push(...resume.awards)

  for (const vol of resume.volunteering) {
    if (vol.organization) parts.push(vol.organization)
    if (vol.role) parts.push(vol.role)
    if (vol.description) parts.push(vol.description)
  }

  for (const pub of resume.publications) {
    if (pub.title) parts.push(pub.title)
    if (pub.description) parts.push(pub.description)
  }

  return parts.join(' ')
}

// --- Client-side repetition analysis (adapted from content-checks.ts) ---

function analyzeLiveRepetition(resumeText: string): SubcategoryResult {
  const issues: ATSIssue[] = []

  const words = resumeText.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
  const wordCounts: Record<string, number> = {}

  for (const word of words) {
    if (!STOP_WORDS.has(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    }
  }

  const overusedWords = Object.entries(wordCounts)
    .filter(([, count]) => count > 4)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }))

  const score = Math.max(0, 100 - overusedWords.length * 15)

  if (overusedWords.length > 3) {
    issues.push({
      id: `live-rep-${overusedWords.length}`,
      category: 'content',
      subcategory: 'repetition',
      severity: 'warning',
      title: 'Word Repetition Detected',
      description: `Found ${overusedWords.length} frequently repeated words: ${overusedWords.slice(0, 5).map(w => `"${w.word}" (${w.count}x)`).join(', ')}.`,
      recommendation: 'Use synonyms to add variety.',
      fixable: true,
    })
  } else if (overusedWords.length > 0) {
    issues.push({
      id: `live-rep-${overusedWords.length}`,
      category: 'content',
      subcategory: 'repetition',
      severity: 'info',
      title: 'Minor Word Repetition',
      description: `Some words appear frequently: ${overusedWords.map(w => `"${w.word}"`).join(', ')}.`,
      recommendation: 'Consider varying your vocabulary.',
      fixable: true,
    })
  }

  return {
    name: 'Repetition',
    key: 'repetition',
    score,
    status: getStatus(score),
    issues,
    details: `${overusedWords.length} overused words found`,
  }
}

// --- Client-side keyword extraction ---

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().match(/\b[a-z][a-z0-9.+#-]{1,}\b/g) || []
  const counts: Record<string, number> = {}

  for (const word of words) {
    if (!STOP_WORDS.has(word) && word.length >= 3) {
      counts[word] = (counts[word] || 0) + 1
    }
  }

  // Also extract multi-word phrases (bigrams)
  const tokens = text.toLowerCase().split(/[^a-z0-9.+#-]+/).filter(t => t.length >= 2)
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`
    if (!STOP_WORDS.has(tokens[i]) && !STOP_WORDS.has(tokens[i + 1])) {
      counts[bigram] = (counts[bigram] || 0) + 1
    }
  }

  return Object.entries(counts)
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
}

// --- Client-side tailoring analysis ---

function analyzeLiveTailoring(
  resume: ParsedResume,
  jobDescription: string
): { keywordMatch: SubcategoryResult; skillsAlignment: SubcategoryResult } {
  const resumeText = extractResumeText(resume).toLowerCase()
  const jobKeywords = extractKeywords(jobDescription)

  // Split keywords into likely hard skills vs soft skills
  const technicalPatterns = /^(python|java|javascript|typescript|react|node|sql|aws|docker|kubernetes|git|html|css|c\+\+|c#|ruby|go|rust|swift|kotlin|php|scala|r|matlab|tableau|excel|powerbi|figma|sketch|jira|confluence|salesforce|sap|mongodb|postgresql|mysql|redis|graphql|rest|api|ci\/cd|terraform|ansible|linux|agile|scrum|machine learning|deep learning|data science|cloud|devops|microservices)/

  const hardSkillsFromJob: string[] = []
  const softSkillsFromJob: string[] = []

  for (const keyword of jobKeywords.slice(0, 50)) {
    if (technicalPatterns.test(keyword) || resume.skills.some(s => s.toLowerCase().includes(keyword))) {
      hardSkillsFromJob.push(keyword)
    } else {
      softSkillsFromJob.push(keyword)
    }
  }

  // Check which keywords are present in resume
  const hardSkillsFound = hardSkillsFromJob.filter(k => resumeText.includes(k))
  const hardSkillsMissing = hardSkillsFromJob.filter(k => !resumeText.includes(k))
  const softSkillsFound = softSkillsFromJob.filter(k => resumeText.includes(k)).slice(0, 10)
  const softSkillsMissing = softSkillsFromJob.filter(k => !resumeText.includes(k)).slice(0, 10)

  // Keyword match score
  const totalKeywords = hardSkillsFromJob.length + softSkillsFromJob.length
  const foundKeywords = hardSkillsFound.length + softSkillsFound.length
  const keywordScore = totalKeywords > 0 ? Math.round((foundKeywords / totalKeywords) * 100) : 50

  const keywordIssues: ATSIssue[] = []
  if (hardSkillsMissing.length > 0) {
    keywordIssues.push({
      id: `live-kw-hard-${hardSkillsMissing.length}`,
      category: 'tailoring',
      subcategory: 'keyword_match',
      severity: hardSkillsMissing.length > 3 ? 'critical' : 'warning',
      title: `Missing ${hardSkillsMissing.length} Key Skills`,
      description: `Job mentions: ${hardSkillsMissing.slice(0, 5).join(', ')}${hardSkillsMissing.length > 5 ? '...' : ''} — not found in your resume.`,
      recommendation: `Consider adding these skills if you have experience with them.`,
      fixable: true,
    })
  }

  const keywordMatch: SubcategoryResult = {
    name: 'Keyword Match',
    key: 'keyword_match',
    score: keywordScore,
    status: getStatus(keywordScore),
    issues: keywordIssues,
    details: `${foundKeywords}/${totalKeywords} keywords matched`,
  }

  // Skills alignment score
  const resumeSkillsLower = resume.skills.map(s => s.toLowerCase())
  const requiredFromJob = hardSkillsFromJob.slice(0, 15)
  const requiredPresent = requiredFromJob.filter(skill =>
    resumeSkillsLower.some(rs => rs.includes(skill) || skill.includes(rs))
  )
  const requiredMissing = requiredFromJob.filter(skill =>
    !resumeSkillsLower.some(rs => rs.includes(skill) || skill.includes(rs))
  )

  const alignmentScore = requiredFromJob.length > 0
    ? Math.round((requiredPresent.length / requiredFromJob.length) * 100)
    : 50

  const alignmentIssues: ATSIssue[] = []
  if (requiredMissing.length > 0) {
    alignmentIssues.push({
      id: `live-align-${requiredMissing.length}`,
      category: 'tailoring',
      subcategory: 'skills_alignment',
      severity: requiredMissing.length > 3 ? 'warning' : 'info',
      title: `${requiredMissing.length} Required Skills Not in Skills Section`,
      description: `Consider adding: ${requiredMissing.slice(0, 5).join(', ')}.`,
      recommendation: 'Add these to your Skills section if you have proficiency.',
      fixable: true,
    })
  }

  const skillsAlignment: SubcategoryResult = {
    name: 'Skills Alignment',
    key: 'skills_alignment',
    score: alignmentScore,
    status: getStatus(alignmentScore),
    issues: alignmentIssues,
    details: `${requiredPresent.length}/${requiredFromJob.length} required skills present`,
  }

  return { keywordMatch, skillsAlignment }
}

// --- Main scoring function ---

export function computeLiveScore(
  resume: ParsedResume,
  jobDescription?: string
): LiveATSResult {
  const resumeText = extractResumeText(resume)

  // --- Content category ---
  const quantifyingImpact = analyzeQuantifyingImpact(resume)
  const repetition = analyzeLiveRepetition(resumeText)

  const contentSubcategories = [quantifyingImpact, repetition]
  const contentScore = calculateWeightedScore(contentSubcategories, LIVE_CONTENT_WEIGHTS)

  const content: LiveCategoryScore = {
    score: contentScore,
    weight: LIVE_SCORING_WEIGHTS.content,
    details: `Impact: ${quantifyingImpact.score}% | Repetition: ${repetition.score}%`,
    subcategories: contentSubcategories,
  }

  // --- Sections category ---
  const contact = analyzeContactSection(resume)
  const experience = analyzeExperienceSection(resume)
  const education = analyzeEducationSection(resume)
  const skills = analyzeSkillsSection(resume)
  const summary = analyzeSummarySection(resume)

  const sectionSubcategories = [contact, experience, education, skills, summary]
  const sectionsScore = calculateWeightedScore(sectionSubcategories, {
    contact: SECTIONS_WEIGHTS.contact,
    experience: SECTIONS_WEIGHTS.experience,
    education: SECTIONS_WEIGHTS.education,
    skills: SECTIONS_WEIGHTS.skills,
    summary: SECTIONS_WEIGHTS.summary,
  })

  const sections: LiveCategoryScore = {
    score: sectionsScore,
    weight: LIVE_SCORING_WEIGHTS.sections,
    details: `${sectionSubcategories.filter(s => s.score >= 80).length}/${sectionSubcategories.length} sections strong`,
    subcategories: sectionSubcategories,
  }

  // --- Tailoring category (optional) ---
  let tailoring: LiveCategoryScore | null = null

  if (jobDescription && jobDescription.trim().length > 20) {
    const tailoringResults = analyzeLiveTailoring(resume, jobDescription)
    const tailoringSubcategories = [tailoringResults.keywordMatch, tailoringResults.skillsAlignment]
    const tailoringScore = calculateWeightedScore(tailoringSubcategories, LIVE_TAILORING_WEIGHTS)

    tailoring = {
      score: tailoringScore,
      weight: LIVE_SCORING_WEIGHTS.tailoring,
      details: `Keywords: ${tailoringResults.keywordMatch.score}% | Alignment: ${tailoringResults.skillsAlignment.score}%`,
      subcategories: tailoringSubcategories,
    }
  }

  // --- Overall score ---
  let overallScore: number

  if (tailoring) {
    const totalWeight = LIVE_SCORING_WEIGHTS.content + LIVE_SCORING_WEIGHTS.sections + LIVE_SCORING_WEIGHTS.tailoring
    overallScore = Math.round(
      (content.score * LIVE_SCORING_WEIGHTS.content +
        sections.score * LIVE_SCORING_WEIGHTS.sections +
        tailoring.score * LIVE_SCORING_WEIGHTS.tailoring) /
      totalWeight
    )
  } else {
    // Redistribute tailoring weight proportionally
    const totalOther = LIVE_SCORING_WEIGHTS.content + LIVE_SCORING_WEIGHTS.sections
    overallScore = Math.round(
      (content.score * LIVE_SCORING_WEIGHTS.content +
        sections.score * LIVE_SCORING_WEIGHTS.sections) /
      totalOther
    )
  }

  // --- Collect all issues ---
  const allIssues: ATSIssue[] = []
  for (const sub of contentSubcategories) allIssues.push(...sub.issues)
  for (const sub of sectionSubcategories) allIssues.push(...sub.issues)
  if (tailoring) {
    for (const sub of tailoring.subcategories) allIssues.push(...sub.issues)
  }

  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const issueCount = {
    critical: allIssues.filter(i => i.severity === 'critical').length,
    warning: allIssues.filter(i => i.severity === 'warning').length,
    info: allIssues.filter(i => i.severity === 'info').length,
    total: allIssues.length,
  }

  return {
    overallScore,
    grade: getScoreGrade(overallScore),
    categories: { content, sections, tailoring },
    issues: allIssues,
    issueCount,
  }
}

// --- Hint generation (compares two results) ---

export function generateHints(
  current: LiveATSResult,
  previous: LiveATSResult | null
): ScoreHint[] {
  if (!previous) return []

  const hints: ScoreHint[] = []
  const delta = current.overallScore - previous.overallScore

  // Overall score change
  if (Math.abs(delta) >= 3) {
    hints.push({
      type: delta > 0 ? 'improvement' : 'warning',
      message: delta > 0
        ? `ATS score improved by ${delta} points!`
        : `ATS score dropped by ${Math.abs(delta)} points.`,
      delta,
    })
  }

  // Category-level changes
  const categoryNames = ['content', 'sections', 'tailoring'] as const
  const categoryLabels: Record<string, string> = {
    content: 'Content',
    sections: 'Sections',
    tailoring: 'Tailoring',
  }

  for (const cat of categoryNames) {
    const curr = current.categories[cat]
    const prev = previous.categories[cat]
    if (!curr || !prev) continue

    const catDelta = curr.score - prev.score
    if (Math.abs(catDelta) >= 5) {
      hints.push({
        type: catDelta > 0 ? 'improvement' : 'warning',
        message: catDelta > 0
          ? `${categoryLabels[cat]} score improved by ${catDelta} points`
          : `${categoryLabels[cat]} score decreased by ${Math.abs(catDelta)} points`,
        delta: catDelta,
      })
    }
  }

  // New critical issues
  const prevIssueIds = new Set(previous.issues.map(i => i.id))
  const newCritical = current.issues.filter(
    i => i.severity === 'critical' && !prevIssueIds.has(i.id)
  )
  for (const issue of newCritical.slice(0, 1)) {
    hints.push({
      type: 'warning',
      message: issue.title,
    })
  }

  // Resolved critical issues
  const currIssueIds = new Set(current.issues.map(i => i.id))
  const resolvedCritical = previous.issues.filter(
    i => i.severity === 'critical' && !currIssueIds.has(i.id)
  )
  for (const issue of resolvedCritical.slice(0, 1)) {
    hints.push({
      type: 'improvement',
      message: `Fixed: ${issue.title}`,
    })
  }

  return hints.slice(0, 3) // Max 3 hints at a time
}
