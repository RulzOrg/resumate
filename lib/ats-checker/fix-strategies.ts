/**
 * ATS Fix Strategies
 * Maps each ATSIssue subcategory to a concrete fix approach.
 * Produces natural-language commands that feed into processEditCommand().
 */

import type { ATSIssue, Subcategory, ATSCheckResult, TailoringAnalysis } from './types'
import type { ParsedResume } from '@/lib/resume-parser'

// --- Strategy Types ---

export type FixStrategyType = 'auto_fix' | 'user_input_required' | 'guidance_only'

export interface RequiredInput {
  field: string
  label: string
  placeholder: string
  type: 'text' | 'email' | 'tel' | 'url'
}

export interface FixStrategy {
  type: FixStrategyType
  previewDescription: string
  estimatedDuration: 'fast' | 'medium'
  requiredInputs?: RequiredInput[]
}

export interface FixContext {
  resumeData?: ParsedResume
  resumeText?: string
  jobDescription?: string
  jobTitle?: string
  atsResult?: ATSCheckResult
}

// --- Strategy Definitions ---

interface StrategyDef extends FixStrategy {
  buildCommand: (issue: ATSIssue, context: FixContext) => string
}

function getContactMissingField(issue: ATSIssue): string | null {
  const title = issue.title.toLowerCase()
  if (title.includes('email')) return 'email'
  if (title.includes('phone')) return 'phone'
  if (title.includes('location')) return 'location'
  if (title.includes('linkedin')) return 'linkedin'
  if (title.includes('name')) return 'name'
  return null
}

function getContactInputs(issue: ATSIssue): RequiredInput[] {
  const field = getContactMissingField(issue)
  const inputMap: Record<string, RequiredInput> = {
    email: { field: 'email', label: 'Email Address', placeholder: 'you@example.com', type: 'email' },
    phone: { field: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567', type: 'tel' },
    location: { field: 'location', label: 'Location', placeholder: 'City, State', type: 'text' },
    linkedin: { field: 'linkedin', label: 'LinkedIn URL', placeholder: 'linkedin.com/in/yourname', type: 'url' },
    name: { field: 'name', label: 'Full Name', placeholder: 'John Doe', type: 'text' },
  }
  if (field && inputMap[field]) return [inputMap[field]]
  return [{ field: 'value', label: 'Missing Information', placeholder: 'Enter the missing information', type: 'text' }]
}

const STRATEGY_MAP: Partial<Record<Subcategory, StrategyDef>> = {
  // --- Content ---
  quantifying_impact: {
    type: 'auto_fix',
    previewDescription: 'Add quantified metrics and measurable results to bullet points',
    estimatedDuration: 'medium',
    buildCommand: (issue) => {
      const location = issue.location ? ` Focus on: ${issue.location}.` : ''
      return `Add quantified metrics and measurable results to bullet points that currently lack them. Include specific numbers, percentages, dollar amounts, or concrete outcomes wherever possible.${location}`
    },
  },
  repetition: {
    type: 'auto_fix',
    previewDescription: 'Replace repeated words with varied synonyms',
    estimatedDuration: 'fast',
    buildCommand: (issue) => {
      const words = issue.originalText || issue.description
      return `Replace frequently repeated words in my resume with varied synonyms while preserving meaning. ${words}`
    },
  },
  spelling_grammar: {
    type: 'auto_fix',
    previewDescription: 'Fix spelling and grammar issues',
    estimatedDuration: 'fast',
    buildCommand: (issue) => {
      return `Fix the following spelling and grammar issues in my resume: ${issue.recommendation}${issue.originalText ? ` Problem text: "${issue.originalText}"` : ''}`
    },
  },
  parse_rate: {
    type: 'guidance_only',
    previewDescription: 'Formatting issues that require manual adjustment',
    estimatedDuration: 'medium',
    buildCommand: () => '',
  },

  // --- Sections ---
  contact: {
    type: 'user_input_required',
    previewDescription: 'Add missing contact information',
    estimatedDuration: 'fast',
    get requiredInputs() {
      return undefined // dynamically resolved in getFixStrategy
    },
    buildCommand: (issue, context) => {
      const field = getContactMissingField(issue)
      const inputs = (context as FixContext & { userInputs?: Record<string, string> }).userInputs
      if (field && inputs?.[field]) {
        return `Update my ${field} to "${inputs[field]}".`
      }
      const value = inputs?.value || inputs?.[Object.keys(inputs || {})[0]]
      return value ? `Update my contact information: ${issue.title} — set it to "${value}".` : issue.recommendation
    },
  },
  experience: {
    type: 'auto_fix',
    previewDescription: 'Strengthen work experience bullet points',
    estimatedDuration: 'medium',
    buildCommand: (issue) => {
      if (issue.title.toLowerCase().includes('no bullet') || issue.title.toLowerCase().includes('missing bullet')) {
        return 'Add 3-5 achievement-focused bullet points to work experience entries that are missing them. Focus on measurable accomplishments.'
      }
      if (issue.title.toLowerCase().includes('few bullet') || issue.title.toLowerCase().includes('limited bullet')) {
        return 'Add more bullet points to strengthen work experience entries that have fewer than 3 bullets. Each bullet should highlight a specific achievement.'
      }
      return `Improve work experience section: ${issue.recommendation}`
    },
  },
  education: {
    type: 'guidance_only',
    previewDescription: 'Education section requires manual input',
    estimatedDuration: 'medium',
    buildCommand: () => '',
  },
  skills: {
    type: 'auto_fix',
    previewDescription: 'Extract and add relevant skills from experience',
    estimatedDuration: 'fast',
    buildCommand: (_issue, context) => {
      if (context.jobDescription) {
        return 'Extract relevant skills from my work experience and the job description, then add them to my skills section. Aim for 8-15 diverse skills that align with the role.'
      }
      return 'Extract relevant skills from my work experience and add them to my skills section. Aim for 8-15 skills covering technical and professional competencies.'
    },
  },
  summary: {
    type: 'auto_fix',
    previewDescription: 'Generate or improve professional summary',
    estimatedDuration: 'fast',
    buildCommand: (issue) => {
      const title = issue.title.toLowerCase()
      if (title.includes('missing') || title.includes('no summary')) {
        return 'Write a professional summary (2-4 sentences, 30-80 words) highlighting my key qualifications based on my work experience. Place it at the top of my resume.'
      }
      if (title.includes('too long') || title.includes('lengthy')) {
        return 'Condense my professional summary to 30-80 words while preserving the most important qualifications and career highlights.'
      }
      if (title.includes('too short') || title.includes('brief')) {
        return 'Expand my professional summary to 30-80 words to better highlight my experience, key skills, and career objectives.'
      }
      return `Improve my professional summary: ${issue.recommendation}`
    },
  },

  // --- ATS Essentials ---
  file_format: {
    type: 'guidance_only',
    previewDescription: 'File format issues require re-exporting the document',
    estimatedDuration: 'fast',
    buildCommand: () => '',
  },
  headings: {
    type: 'guidance_only',
    previewDescription: 'Heading structure requires document-level changes',
    estimatedDuration: 'medium',
    buildCommand: () => '',
  },
  tables: {
    type: 'guidance_only',
    previewDescription: 'Table formatting requires document-level changes',
    estimatedDuration: 'medium',
    buildCommand: () => '',
  },
  graphics: {
    type: 'guidance_only',
    previewDescription: 'Graphics/decorative elements require document-level changes',
    estimatedDuration: 'medium',
    buildCommand: () => '',
  },
  fonts: {
    type: 'guidance_only',
    previewDescription: 'Font issues require document-level changes',
    estimatedDuration: 'fast',
    buildCommand: () => '',
  },
  dates: {
    type: 'auto_fix',
    previewDescription: 'Standardize date formats throughout resume',
    estimatedDuration: 'fast',
    buildCommand: () => {
      return 'Standardize all dates in my resume to use the format "Month YYYY" (e.g., "January 2024"). Fix any inconsistent date formatting.'
    },
  },

  // --- Tailoring ---
  keyword_match: {
    type: 'auto_fix',
    previewDescription: 'Incorporate missing keywords from the job description',
    estimatedDuration: 'medium',
    buildCommand: (issue, context) => {
      const missingKeywords = extractMissingKeywords(issue, context)
      if (missingKeywords.length > 0) {
        return `Naturally incorporate these missing keywords from the job description into my resume: ${missingKeywords.join(', ')}. Weave them into existing bullet points and summary where they fit contextually — do not just list them.`
      }
      return `Improve keyword coverage for the job description. ${issue.recommendation}`
    },
  },
  skills_alignment: {
    type: 'auto_fix',
    previewDescription: 'Add missing required skills to the skills section',
    estimatedDuration: 'fast',
    buildCommand: (issue, context) => {
      const missingSkills = extractMissingSkills(issue, context)
      if (missingSkills.length > 0) {
        return `Add these skills to my skills section: ${missingSkills.join(', ')}`
      }
      return `Improve skills alignment with the job requirements. ${issue.recommendation}`
    },
  },
}

// --- Helpers to extract missing keywords/skills ---

function extractMissingKeywords(issue: ATSIssue, context: FixContext): string[] {
  // Try from ATS result's tailoring data
  if (context.atsResult?.tailoring) {
    const t = context.atsResult.tailoring as TailoringAnalysis
    return [
      ...t.keywordMatch.hardSkillsMissing.slice(0, 8),
      ...t.keywordMatch.softSkillsMissing.slice(0, 4),
    ]
  }
  // Fall back to parsing from issue description
  return parseListFromDescription(issue.description)
}

function extractMissingSkills(issue: ATSIssue, context: FixContext): string[] {
  if (context.atsResult?.tailoring) {
    const t = context.atsResult.tailoring as TailoringAnalysis
    return t.skillsAlignment.requiredSkillsMissing.slice(0, 10)
  }
  return parseListFromDescription(issue.description)
}

function parseListFromDescription(description: string): string[] {
  // Try to extract comma-separated items from "mentions: X, Y, Z" or "Consider adding: X, Y"
  const match = description.match(/(?:mentions|adding|missing|include)[:\s]+(.+?)(?:\.|$)/i)
  if (match) {
    return match[1].split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

// --- Public API ---

export function getFixStrategy(issue: ATSIssue): (FixStrategy & { buildCommand: (issue: ATSIssue, context: FixContext) => string }) | null {
  if (!issue.fixable) return null

  const strategy = STRATEGY_MAP[issue.subcategory]
  if (!strategy) return null

  // Dynamically resolve requiredInputs for contact issues
  if (issue.subcategory === 'contact' && strategy.type === 'user_input_required') {
    return {
      ...strategy,
      requiredInputs: getContactInputs(issue),
    }
  }

  return strategy
}

export function buildFixCommand(
  strategy: ReturnType<typeof getFixStrategy>,
  issue: ATSIssue,
  context: FixContext & { userInputs?: Record<string, string> }
): string | null {
  if (!strategy || strategy.type === 'guidance_only') return null
  return strategy.buildCommand(issue, context)
}
