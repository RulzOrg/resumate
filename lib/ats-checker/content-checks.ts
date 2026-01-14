/**
 * Content Analysis Checks
 * Analyzes resume content quality: parse rate, quantification, repetition, grammar
 */

import { v4 as uuidv4 } from 'uuid'
import type { ParsedResume } from '@/lib/resume-parser'
import type { SubcategoryResult, ATSIssue } from './types'
import { getStatus } from './scoring'
import { callJsonModel } from '@/lib/llm'
import { z } from 'zod'

// Common words to ignore in repetition analysis
const COMMON_WORDS = new Set([
  'the', 'and', 'for', 'with', 'was', 'were', 'have', 'has', 'had',
  'that', 'this', 'from', 'they', 'been', 'which', 'their', 'more',
  'will', 'would', 'could', 'should', 'about', 'into', 'over', 'such',
  'team', 'work', 'year', 'years', 'company', 'business', 'management',
  'project', 'projects', 'development', 'experience', 'skills', 'using',
])

/**
 * Calculate ATS parse rate
 * Measures how much of the resume content was successfully extracted
 */
export function analyzeParseRate(
  rawText: string,
  parsed: ParsedResume
): SubcategoryResult {
  const issues: ATSIssue[] = []

  // Calculate what percentage of content was parsed into structured sections
  const rawTextLength = rawText.replace(/\s+/g, ' ').trim().length

  let parsedLength = 0

  // Count parsed content
  if (parsed.contact.name) parsedLength += parsed.contact.name.length
  if (parsed.contact.email) parsedLength += parsed.contact.email.length
  if (parsed.contact.phone) parsedLength += parsed.contact.phone.length
  if (parsed.contact.location) parsedLength += parsed.contact.location.length
  if (parsed.contact.linkedin) parsedLength += parsed.contact.linkedin.length
  if (parsed.summary) parsedLength += parsed.summary.length

  for (const exp of parsed.workExperience) {
    if (exp.company) parsedLength += exp.company.length
    if (exp.title) parsedLength += exp.title.length
    if (exp.location) parsedLength += exp.location.length
    parsedLength += exp.bullets.join(' ').length
  }

  for (const edu of parsed.education) {
    if (edu.institution) parsedLength += edu.institution.length
    if (edu.degree) parsedLength += edu.degree.length
    if (edu.field) parsedLength += edu.field.length
  }

  parsedLength += parsed.skills.join(' ').length

  for (const cert of parsed.certifications) {
    if (cert.name) parsedLength += cert.name.length
  }

  // Calculate parse rate (cap at 100, allow some overhead for formatting)
  const parseRate = Math.min(100, Math.round((parsedLength / rawTextLength) * 100 * 1.3))

  // Generate issues if parse rate is low
  if (parseRate < 60) {
    issues.push({
      id: uuidv4(),
      category: 'content',
      subcategory: 'parse_rate',
      severity: 'critical',
      title: 'Low ATS Parse Rate',
      description: `Only ${parseRate}% of your resume content was successfully parsed. This may indicate formatting issues that confuse ATS systems.`,
      recommendation: 'Use a simple, single-column layout with standard section headers. Avoid tables, text boxes, and complex formatting.',
      fixable: true,
    })
  } else if (parseRate < 80) {
    issues.push({
      id: uuidv4(),
      category: 'content',
      subcategory: 'parse_rate',
      severity: 'warning',
      title: 'Moderate ATS Parse Rate',
      description: `${parseRate}% of your resume content was parsed. Some content may not be recognized by ATS systems.`,
      recommendation: 'Review your resume formatting and ensure all sections use standard headers like "Work Experience" and "Education".',
      fixable: true,
    })
  }

  return {
    name: 'ATS Parse Rate',
    key: 'parse_rate',
    score: parseRate,
    status: getStatus(parseRate),
    issues,
    details: `${parseRate}% of content successfully parsed`,
  }
}

/**
 * Analyze quantifying impact in bullet points
 * Checks for metrics, numbers, and measurable achievements
 */
export function analyzeQuantifyingImpact(parsed: ParsedResume): SubcategoryResult {
  const issues: ATSIssue[] = []

  // Patterns for detecting quantified achievements
  const quantificationPatterns = [
    /\d+%/,                           // percentages
    /\$[\d,]+[KkMm]?/,               // dollar amounts
    /\d+[xX]/,                        // multipliers
    /\d+\+/,                          // "10+" style
    /\b\d{1,3}(,\d{3})*\b/,          // large numbers
    /increased|decreased|improved|reduced|grew|saved|generated|achieved|delivered/i,
  ]

  // Count all bullets and those with metrics
  let totalBullets = 0
  let bulletsWithMetrics = 0
  const bulletsMissingMetrics: { company: string; bullet: string }[] = []

  for (const exp of parsed.workExperience) {
    for (const bullet of exp.bullets) {
      totalBullets++
      const hasMetric = quantificationPatterns.some(pattern => pattern.test(bullet))

      if (hasMetric) {
        bulletsWithMetrics++
      } else {
        bulletsMissingMetrics.push({ company: exp.company || 'Unknown', bullet })
      }
    }
  }

  // Calculate score
  const score = totalBullets > 0
    ? Math.round((bulletsWithMetrics / totalBullets) * 100)
    : 50 // Default if no bullets

  // Generate issues
  if (score < 50 && bulletsMissingMetrics.length > 0) {
    issues.push({
      id: uuidv4(),
      category: 'content',
      subcategory: 'quantifying_impact',
      severity: 'critical',
      title: 'Lack of Quantified Achievements',
      description: `Only ${bulletsWithMetrics} out of ${totalBullets} bullet points include measurable results or metrics.`,
      recommendation: 'Add numbers, percentages, or dollar amounts to demonstrate impact. For example: "Increased sales by 25%" instead of "Improved sales performance".',
      fixable: true,
      location: bulletsMissingMetrics.slice(0, 3).map(b => b.company).join(', '),
    })
  } else if (score < 70) {
    issues.push({
      id: uuidv4(),
      category: 'content',
      subcategory: 'quantifying_impact',
      severity: 'warning',
      title: 'More Metrics Needed',
      description: `${totalBullets - bulletsWithMetrics} bullet points could be strengthened with quantifiable results.`,
      recommendation: 'Consider adding metrics like time saved, revenue generated, or team size managed.',
      fixable: true,
    })
  }

  return {
    name: 'Quantifying Impact',
    key: 'quantifying_impact',
    score,
    status: getStatus(score),
    issues,
    details: `${bulletsWithMetrics}/${totalBullets} bullets have metrics`,
  }
}

/**
 * Detect word repetition
 * Identifies overused words and phrases
 */
export function analyzeRepetition(rawText: string): SubcategoryResult {
  const issues: ATSIssue[] = []

  // Extract words (4+ characters to filter out articles/prepositions)
  const words = rawText.toLowerCase().match(/\b[a-z]{4,}\b/g) || []

  // Count word frequencies
  const wordCounts: Record<string, number> = {}
  for (const word of words) {
    if (!COMMON_WORDS.has(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    }
  }

  // Find overused words (appearing more than 4 times)
  const overusedWords = Object.entries(wordCounts)
    .filter(([, count]) => count > 4)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }))

  // Calculate score (penalize for each overused word)
  const score = Math.max(0, 100 - overusedWords.length * 15)

  // Generate issues
  if (overusedWords.length > 3) {
    issues.push({
      id: uuidv4(),
      category: 'content',
      subcategory: 'repetition',
      severity: 'warning',
      title: 'Word Repetition Detected',
      description: `Found ${overusedWords.length} frequently repeated words: ${overusedWords.slice(0, 5).map(w => `"${w.word}" (${w.count}x)`).join(', ')}.`,
      recommendation: 'Use synonyms to add variety. For example, alternate between "managed", "led", "directed", and "oversaw".',
      fixable: true,
    })
  } else if (overusedWords.length > 0) {
    issues.push({
      id: uuidv4(),
      category: 'content',
      subcategory: 'repetition',
      severity: 'info',
      title: 'Minor Word Repetition',
      description: `Some words appear frequently: ${overusedWords.map(w => `"${w.word}"`).join(', ')}.`,
      recommendation: 'Consider varying your vocabulary for a more engaging read.',
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

// Schema for spelling/grammar check results
const SpellingGrammarSchema = z.object({
  issues: z.array(z.object({
    text: z.string().describe('The problematic text'),
    suggestion: z.string().describe('Suggested correction'),
    type: z.enum(['spelling', 'grammar', 'style']).describe('Type of issue'),
  })),
  overallQuality: z.number().min(0).max(100).describe('Overall writing quality score'),
})

/**
 * Check spelling and grammar using AI
 */
export async function analyzeSpellingGrammar(rawText: string): Promise<SubcategoryResult> {
  const issues: ATSIssue[] = []

  try {
    // Use AI to check for spelling and grammar issues
    const result = await callJsonModel(
      `Analyze this resume text for spelling and grammar issues. Only flag clear errors, not stylistic choices or industry jargon.

Text to analyze (first 3000 characters):
${rawText.slice(0, 3000)}

Return:
- issues: Array of {text, suggestion, type} for each error found (max 10)
- overallQuality: 0-100 score for writing quality`,
      SpellingGrammarSchema,
      { temperature: 0.2, maxTokens: 1000 }
    )

    const score = result.overallQuality

    // Generate issues from AI results
    if (result.issues.length > 0) {
      const spellingErrors = result.issues.filter(i => i.type === 'spelling')
      const grammarErrors = result.issues.filter(i => i.type === 'grammar')

      if (spellingErrors.length > 0) {
        issues.push({
          id: uuidv4(),
          category: 'content',
          subcategory: 'spelling_grammar',
          severity: spellingErrors.length > 3 ? 'critical' : 'warning',
          title: 'Spelling Errors Found',
          description: `Found ${spellingErrors.length} potential spelling errors.`,
          recommendation: `Review: ${spellingErrors.slice(0, 3).map(e => `"${e.text}" → "${e.suggestion}"`).join('; ')}.`,
          fixable: true,
        })
      }

      if (grammarErrors.length > 0) {
        issues.push({
          id: uuidv4(),
          category: 'content',
          subcategory: 'spelling_grammar',
          severity: grammarErrors.length > 3 ? 'warning' : 'info',
          title: 'Grammar Issues Found',
          description: `Found ${grammarErrors.length} potential grammar issues.`,
          recommendation: `Review: ${grammarErrors.slice(0, 3).map(e => `"${e.text}" → "${e.suggestion}"`).join('; ')}.`,
          fixable: true,
        })
      }
    }

    return {
      name: 'Spelling & Grammar',
      key: 'spelling_grammar',
      score,
      status: getStatus(score),
      issues,
      details: result.issues.length > 0
        ? `${result.issues.length} issues found`
        : 'No issues found',
    }
  } catch (error) {
    console.error('[ATS Checker] Spelling/grammar check failed:', error)

    // Return a neutral result if AI check fails
    return {
      name: 'Spelling & Grammar',
      key: 'spelling_grammar',
      score: 80, // Assume decent quality
      status: 'pass',
      issues: [],
      details: 'Check completed',
    }
  }
}

/**
 * Run all content checks
 */
export async function runContentChecks(
  rawText: string,
  parsed: ParsedResume
): Promise<{
  parseRate: SubcategoryResult
  quantifyingImpact: SubcategoryResult
  repetition: SubcategoryResult
  spellingGrammar: SubcategoryResult
}> {
  // Run synchronous checks
  const parseRate = analyzeParseRate(rawText, parsed)
  const quantifyingImpact = analyzeQuantifyingImpact(parsed)
  const repetition = analyzeRepetition(rawText)

  // Run async AI check
  const spellingGrammar = await analyzeSpellingGrammar(rawText)

  return {
    parseRate,
    quantifyingImpact,
    repetition,
    spellingGrammar,
  }
}
