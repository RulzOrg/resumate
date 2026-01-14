/**
 * ATS Essentials Checks
 * Analyzes ATS compatibility: file format, headings, tables, graphics, fonts, dates
 */

import { v4 as uuidv4 } from 'uuid'
import type { SubcategoryResult, ATSIssue } from './types'
import { getStatus } from './scoring'

/**
 * Check file format compatibility
 */
export function analyzeFileFormat(fileType: string): SubcategoryResult {
  const issues: ATSIssue[] = []

  const compatibleFormats = ['pdf', 'docx', 'doc']
  const normalizedType = fileType.toLowerCase().replace('.', '')
  const isCompatible = compatibleFormats.includes(normalizedType)

  let score = isCompatible ? 100 : 0

  // PDF is best, DOCX is good, others are problematic
  if (normalizedType === 'pdf') {
    score = 100
  } else if (normalizedType === 'docx' || normalizedType === 'doc') {
    score = 90
  } else if (normalizedType === 'txt') {
    score = 70
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'file_format',
      severity: 'warning',
      title: 'Plain Text Format',
      description: 'Plain text files preserve content but lose all formatting.',
      recommendation: 'Consider saving as PDF to maintain professional formatting.',
      fixable: false,
    })
  } else {
    score = 0
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'file_format',
      severity: 'critical',
      title: 'Incompatible File Format',
      description: `${fileType.toUpperCase()} files may not be parsed correctly by ATS systems.`,
      recommendation: 'Save your resume as PDF or DOCX for maximum compatibility.',
      fixable: false,
    })
  }

  return {
    name: 'File Format',
    key: 'file_format',
    score,
    status: getStatus(score),
    issues,
    details: `${fileType.toUpperCase()} format`,
  }
}

/**
 * Check for standard section headings
 */
export function analyzeHeadings(rawText: string): SubcategoryResult {
  const issues: ATSIssue[] = []

  // Standard ATS-recognized headings
  const standardHeadings = {
    experience: /\b(work\s*experience|professional\s*experience|employment(\s*history)?|experience)\b/i,
    education: /\b(education|academic(\s*background)?|qualifications)\b/i,
    skills: /\b(skills|technical\s*skills|core\s*competencies|expertise|proficiencies)\b/i,
    summary: /\b(summary|professional\s*summary|profile|objective|about(\s*me)?)\b/i,
    certifications: /\b(certifications?|licenses?|credentials)\b/i,
  }

  // Check which headings are present
  const foundHeadings: string[] = []
  const missingHeadings: string[] = []

  for (const [key, pattern] of Object.entries(standardHeadings)) {
    if (pattern.test(rawText)) {
      foundHeadings.push(key)
    } else if (key !== 'certifications') {
      // Certifications is optional
      missingHeadings.push(key)
    }
  }

  // Check for non-standard headings that might confuse ATS
  const nonStandardPatterns = [
    /\b(my\s*journey|career\s*path|what\s*i\s*do|my\s*story)\b/i,
    /\b(superpowers|magic|ninja|rockstar|guru)\b/i,
  ]

  const hasNonStandard = nonStandardPatterns.some(p => p.test(rawText))

  // Calculate score
  const essentialHeadings = ['experience', 'education', 'skills']
  const essentialFound = essentialHeadings.filter(h => foundHeadings.includes(h)).length
  let score = Math.round((essentialFound / essentialHeadings.length) * 80)

  if (foundHeadings.includes('summary')) score += 10
  if (!hasNonStandard) score += 10

  score = Math.min(100, score)

  // Generate issues
  if (essentialFound < 3) {
    const missing = essentialHeadings.filter(h => !foundHeadings.includes(h))
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'headings',
      severity: 'warning',
      title: 'Missing Standard Section Headers',
      description: `Could not find standard headers for: ${missing.join(', ')}.`,
      recommendation: 'Use clear section headers like "Work Experience", "Education", and "Skills".',
      fixable: true,
    })
  }

  if (hasNonStandard) {
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'headings',
      severity: 'info',
      title: 'Non-Standard Section Headers Detected',
      description: 'Creative section headers may not be recognized by all ATS systems.',
      recommendation: 'Consider using standard headers like "Experience" instead of creative alternatives.',
      fixable: true,
    })
  }

  return {
    name: 'Section Headings',
    key: 'headings',
    score,
    status: getStatus(score),
    issues,
    details: `${foundHeadings.length} standard sections found`,
  }
}

/**
 * Check for table structures that may confuse ATS
 */
export function analyzeTables(rawText: string): SubcategoryResult {
  const issues: ATSIssue[] = []

  // Patterns that suggest table/column layouts
  const tablePatterns = [
    /\t{2,}/g,                    // Multiple consecutive tabs
    /\s{8,}\S+\s{8,}/g,          // Large spaces suggesting columns
    /\|.*\|.*\|/g,               // Pipe-delimited tables
    /[-]{3,}\s*\|/g,             // Table borders
  ]

  let tableIndicators = 0
  for (const pattern of tablePatterns) {
    const matches = rawText.match(pattern)
    if (matches) tableIndicators += matches.length
  }

  // Calculate score (lower score = more table issues)
  let score = 100
  if (tableIndicators > 10) {
    score = 40
  } else if (tableIndicators > 5) {
    score = 60
  } else if (tableIndicators > 2) {
    score = 80
  }

  // Generate issues
  if (tableIndicators > 5) {
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'tables',
      severity: 'warning',
      title: 'Possible Table Layout Detected',
      description: 'Your resume may contain tables or multi-column layouts that can confuse ATS parsers.',
      recommendation: 'Use a single-column layout. Convert tables to simple bullet lists.',
      fixable: true,
    })
  } else if (tableIndicators > 2) {
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'tables',
      severity: 'info',
      title: 'Minor Formatting Complexity',
      description: 'Some complex formatting detected that may affect parsing.',
      recommendation: 'Review your resume layout and simplify where possible.',
      fixable: true,
    })
  }

  return {
    name: 'Table Detection',
    key: 'tables',
    score,
    status: getStatus(score),
    issues,
    details: tableIndicators > 0 ? `${tableIndicators} potential table indicators` : 'No tables detected',
  }
}

/**
 * Check for graphics/images in resume
 * Note: This is limited since we only have text - we check for common patterns
 */
export function analyzeGraphics(rawText: string): SubcategoryResult {
  const issues: ATSIssue[] = []

  // Patterns that might indicate image placeholders or graphical elements
  const graphicPatterns = [
    /\[image\]/gi,
    /\[logo\]/gi,
    /\[photo\]/gi,
    /\[chart\]/gi,
    /\[graph\]/gi,
    /\[icon\]/gi,
    /\[picture\]/gi,
    /■|●|○|◆|◇|★|☆|►|◄|▲|▼/g,  // Common decorative symbols
  ]

  let graphicIndicators = 0
  for (const pattern of graphicPatterns) {
    const matches = rawText.match(pattern)
    if (matches) graphicIndicators += matches.length
  }

  // Score based on graphic indicators
  let score = 100
  if (graphicIndicators > 20) {
    score = 60
  } else if (graphicIndicators > 10) {
    score = 80
  } else if (graphicIndicators > 5) {
    score = 90
  }

  // Generate issues
  if (graphicIndicators > 10) {
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'graphics',
      severity: 'info',
      title: 'Decorative Elements Detected',
      description: 'Your resume contains decorative symbols or possible image placeholders.',
      recommendation: 'Minimize decorative elements. Use standard bullet points (•) instead of custom symbols.',
      fixable: true,
    })
  }

  return {
    name: 'Graphics & Images',
    key: 'graphics',
    score,
    status: getStatus(score),
    issues,
    details: graphicIndicators > 0 ? `${graphicIndicators} decorative elements` : 'Clean text format',
  }
}

/**
 * Check for font consistency (limited in text-only analysis)
 */
export function analyzeFonts(rawText: string): SubcategoryResult {
  const issues: ATSIssue[] = []

  // Check for encoding issues that might indicate font problems
  const encodingIssues = [
    /[\uFFFD]/g,                  // Replacement character (encoding issue)
    /[^\x00-\x7F\u00A0-\u00FF\u2018-\u201F\u2013-\u2014]/g,  // Non-standard chars
  ]

  let fontIndicators = 0
  for (const pattern of encodingIssues) {
    const matches = rawText.match(pattern)
    if (matches) fontIndicators += matches.length
  }

  // Score
  let score = 100
  if (fontIndicators > 10) {
    score = 60
  } else if (fontIndicators > 5) {
    score = 80
  } else if (fontIndicators > 0) {
    score = 90
  }

  // Generate issues
  if (fontIndicators > 5) {
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'fonts',
      severity: 'warning',
      title: 'Character Encoding Issues',
      description: 'Some characters in your resume may not display correctly in ATS systems.',
      recommendation: 'Use standard fonts like Arial, Calibri, or Times New Roman. Avoid special characters.',
      fixable: true,
    })
  }

  return {
    name: 'Font Compatibility',
    key: 'fonts',
    score,
    status: getStatus(score),
    issues,
    details: fontIndicators > 0 ? `${fontIndicators} encoding issues` : 'Standard characters used',
  }
}

/**
 * Check date format consistency
 */
export function analyzeDates(rawText: string): SubcategoryResult {
  const issues: ATSIssue[] = []

  // Different date format patterns
  const datePatterns = {
    monthYear: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/gi,
    mmYYYY: /\b(0?[1-9]|1[0-2])\/\d{4}\b/g,
    yyyyMM: /\b\d{4}[-/](0?[1-9]|1[0-2])\b/g,
    mmDDYYYY: /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}\b/g,
    yearOnly: /\b(19|20)\d{2}\b/g,
    present: /\b(present|current|now|ongoing)\b/gi,
  }

  // Count occurrences of each format
  const formatCounts: Record<string, number> = {}
  for (const [format, pattern] of Object.entries(datePatterns)) {
    const matches = rawText.match(pattern)
    if (matches && matches.length > 0) {
      formatCounts[format] = matches.length
    }
  }

  const formatsUsed = Object.keys(formatCounts).filter(f => f !== 'present' && f !== 'yearOnly')
  const totalDates = Object.values(formatCounts).reduce((a, b) => a + b, 0)

  // Calculate score based on consistency
  let score = 100
  if (formatsUsed.length > 2) {
    score = 60 // Multiple formats = inconsistent
  } else if (formatsUsed.length === 2) {
    score = 80
  }

  // Generate issues
  if (formatsUsed.length > 2) {
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'dates',
      severity: 'warning',
      title: 'Inconsistent Date Formats',
      description: `Found ${formatsUsed.length} different date formats in your resume.`,
      recommendation: 'Use a consistent date format throughout. Recommended: "January 2024" or "01/2024".',
      fixable: true,
    })
  } else if (formatsUsed.length === 2) {
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'dates',
      severity: 'info',
      title: 'Minor Date Inconsistency',
      description: 'Two different date formats detected.',
      recommendation: 'Consider standardizing to a single date format for consistency.',
      fixable: true,
    })
  }

  if (totalDates < 4) {
    issues.push({
      id: uuidv4(),
      category: 'ats_essentials',
      subcategory: 'dates',
      severity: 'info',
      title: 'Limited Date Information',
      description: 'Few dates detected. Ensure all jobs and education have date ranges.',
      recommendation: 'Add date ranges for each position (e.g., "January 2020 - Present").',
      fixable: true,
    })
  }

  return {
    name: 'Date Formatting',
    key: 'dates',
    score,
    status: getStatus(score),
    issues,
    details: formatsUsed.length > 0 ? `${formatsUsed.length} format(s) used` : 'No dates detected',
  }
}

/**
 * Run all ATS essentials checks
 */
export function runEssentialsChecks(
  rawText: string,
  fileType: string
): {
  fileFormat: SubcategoryResult
  headings: SubcategoryResult
  tables: SubcategoryResult
  graphics: SubcategoryResult
  fonts: SubcategoryResult
  dates: SubcategoryResult
} {
  return {
    fileFormat: analyzeFileFormat(fileType),
    headings: analyzeHeadings(rawText),
    tables: analyzeTables(rawText),
    graphics: analyzeGraphics(rawText),
    fonts: analyzeFonts(rawText),
    dates: analyzeDates(rawText),
  }
}
