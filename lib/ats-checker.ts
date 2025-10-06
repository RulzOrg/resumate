/**
 * ATS (Applicant Tracking System) Compatibility Checker
 *
 * Analyzes resume content for common ATS parsing issues and formatting problems.
 */

interface ATSCheckResult {
  healthy: boolean
  issues: string[]
  score: number
}

interface FormattingCheckResult {
  good: boolean
  issues: string[]
  score: number
}

/**
 * Check if resume content is ATS-compatible
 * Looks for common blockers like tables, images, complex formatting
 */
export function checkATSCompatibility(content: string): ATSCheckResult {
  // Validate input
  if (content === null || content === undefined || typeof content !== 'string' || content.trim() === '') {
    return {
      healthy: false,
      issues: ['Invalid or empty resume content'],
      score: 0
    }
  }

  const issues: string[] = []
  let score = 100

  // Check for Markdown table indicators (common ATS blocker)
  // Strip code blocks, inline code, and URLs to avoid false positives
  const cleanedContent = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`\n]+`/g, '') // Remove inline code
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs

  // Detect Markdown tables: lines with pipes that form table structure
  // Look for lines that have multiple pipes (columns) and consecutive table rows
  const cleanedLines = cleanedContent.split('\n')
  const tableLikeLines = cleanedLines.filter(line => {
    const trimmed = line.trim()
    // Match lines with at least 2 pipes (indicating 3+ columns) or lines starting/ending with pipe
    return trimmed.includes('|') && (
      (trimmed.match(/\|/g) || []).length >= 2 ||
      (trimmed.startsWith('|') && trimmed.endsWith('|'))
    )
  })

  // Check if we have consecutive table rows (indicates actual table)
  let hasMarkdownTable = false
  for (let i = 0; i < cleanedLines.length - 1; i++) {
    const current = cleanedLines[i].trim()
    const next = cleanedLines[i + 1].trim()
    if (current.includes('|') && next.includes('|') && 
        (current.match(/\|/g) || []).length >= 2 &&
        (next.match(/\|/g) || []).length >= 2) {
      hasMarkdownTable = true
      break
    }
  }

  if (hasMarkdownTable || tableLikeLines.length >= 3 || /\t{2,}/.test(content)) {
    issues.push('Possible table formatting detected - use bullet points instead')
    score -= 25
  }

  // Check for image/graphic indicators (placeholders, markdown, HTML)
  if (/\[image\]|\[graphic\]|\[photo\]|!\[.*?\]\(.*?\)|<img\s/i.test(content)) {
    issues.push('Images or graphics detected - ATS cannot parse visual content')
    score -= 30
  }

  // Check for standard section headings
  const standardSections = [
    /experience/i,
    /education/i,
    /skills/i,
  ]

  const hasSections = standardSections.filter(section => section.test(content)).length
  if (hasSections < 2) {
    issues.push('Missing standard section headings (Experience, Education, Skills)')
    score -= 20
  }

  // Check for excessive special characters
  const specialCharCount = (content.match(/[★●○■□◆◇※]/g) || []).length
  if (specialCharCount > 10) {
    issues.push('Excessive special characters may cause parsing issues')
    score -= 15
  }

  // Check for columns (multiple spaces/tabs suggesting multi-column layout)
  const lines = content.split('\n')
  const multiColumnLines = lines.filter(line => /\s{10,}/.test(line)).length
  if (multiColumnLines > lines.length * 0.3) {
    issues.push('Multi-column layout detected - use single column for ATS')
    score -= 25
  }

  return {
    healthy: score >= 70,
    issues,
    score: Math.max(0, score)
  }
}

/**
 * Check resume formatting consistency
 * Analyzes heading structure, bullet points, date formatting
 */
export function checkFormatting(content: string): FormattingCheckResult {
  // Validate input
  if (content === null || content === undefined || typeof content !== 'string' || content.trim() === '') {
    return {
      good: false,
      issues: ['Invalid or empty resume content'],
      score: 0
    }
  }

  const issues: string[] = []
  let score = 100
  const lines = content.split('\n')

  // Check for consistent bullet points
  const bulletStyles = [
    (content.match(/^[•●○]/gm) || []).length,
    (content.match(/^[-–—]/gm) || []).length,
    (content.match(/^\*/gm) || []).length,
  ]
  const mixedBullets = bulletStyles.filter(count => count > 0).length > 1
  if (mixedBullets) {
    issues.push('Mixed bullet point styles - use consistent bullets throughout')
    score -= 20
  }

  // Check for heading consistency (all caps vs title case)
  const headings = content.match(/^[A-Z\s]{3,}$/gm) || []
  const titleCaseHeadings = content.match(/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/gm) || []
  if (headings.length > 0 && titleCaseHeadings.length > 0) {
    issues.push('Inconsistent heading styles - use either ALL CAPS or Title Case')
    score -= 15
  }

  // Check for date formatting consistency
  const dateFormats = [
    (content.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g) || []).length, // MM/DD/YYYY
    (content.match(/\d{4}-\d{2}-\d{2}/g) || []).length, // YYYY-MM-DD
    (content.match(/[A-Z][a-z]{2,8}\s\d{4}/g) || []).length, // Month YYYY
  ]
  const mixedDates = dateFormats.filter(count => count > 0).length > 1
  if (mixedDates) {
    issues.push('Mixed date formats - standardize date formatting')
    score -= 15
  }

  // Check for section spacing consistency
  const emptyLinesBetweenSections = lines.filter((line, i, arr) =>
    line.trim() === '' &&
    i > 0 &&
    arr[i - 1].trim() !== '' &&
    i < arr.length - 1 &&
    arr[i + 1].trim() !== ''
  ).length

  if (emptyLinesBetweenSections === 0 && lines.length > 20) {
    issues.push('No spacing between sections - add blank lines for readability')
    score -= 10
  }

  // Check for consistent indentation
  const indentedLines = lines.filter(line => /^\s{2,}/.test(line))
  const mixedIndents = new Set(
    indentedLines.map(line => line.match(/^\s+/)?.[0].length || 0)
  ).size > 2

  if (mixedIndents) {
    issues.push('Inconsistent indentation - standardize spacing')
    score -= 15
  }

  // Check for excessive line length (readability)
  const longLines = lines.filter(line => line.length > 100).length
  if (longLines > lines.length * 0.3) {
    issues.push('Many lines exceed 100 characters - consider breaking into shorter lines')
    score -= 10
  }

  return {
    good: score >= 70,
    issues,
    score: Math.max(0, score)
  }
}

/**
 * Combined ATS health check - returns overall compatibility status
 */
export function getATSHealthStatus(content: string) {
  const atsResult = checkATSCompatibility(content)
  const formattingResult = checkFormatting(content)

  const overallScore = Math.round((atsResult.score + formattingResult.score) / 2)
  const allIssues = [...atsResult.issues, ...formattingResult.issues]

  return {
    healthy: atsResult.healthy && formattingResult.good,
    atsHealthy: atsResult.healthy,
    formattingGood: formattingResult.good,
    score: overallScore,
    issues: allIssues,
    atsIssues: atsResult.issues,
    formattingIssues: formattingResult.issues
  }
}
