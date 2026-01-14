/**
 * ATS Resume Checker Types
 * Type definitions for the ATS checker lead magnet feature
 */

// Issue severity levels
export type IssueSeverity = 'critical' | 'warning' | 'info'

// Issue categories matching the 4-category scoring system
export type IssueCategory = 'content' | 'sections' | 'ats_essentials' | 'tailoring'

// Content subcategories
export type ContentSubcategory = 'parse_rate' | 'quantifying_impact' | 'repetition' | 'spelling_grammar'

// Sections subcategories
export type SectionsSubcategory = 'contact' | 'experience' | 'education' | 'skills' | 'summary'

// ATS Essentials subcategories
export type EssentialsSubcategory = 'file_format' | 'headings' | 'tables' | 'graphics' | 'fonts' | 'dates'

// Tailoring subcategories
export type TailoringSubcategory = 'keyword_match' | 'skills_alignment'

export type Subcategory = ContentSubcategory | SectionsSubcategory | EssentialsSubcategory | TailoringSubcategory

// Individual issue found in the resume
export interface ATSIssue {
  id: string
  category: IssueCategory
  subcategory: Subcategory
  severity: IssueSeverity
  title: string
  description: string
  recommendation: string
  fixable: boolean // Can be fixed with the optimizer tool
  location?: string // e.g., "Work Experience > Company A > Bullet 3"
  originalText?: string // The problematic text if applicable
}

// Subcategory check result
export interface SubcategoryResult {
  name: string
  key: Subcategory
  score: number // 0-100
  status: 'pass' | 'warning' | 'fail'
  issues: ATSIssue[]
  details?: string
}

// Category score breakdown
export interface CategoryScore {
  score: number // 0-100
  weight: number // Category weight (e.g., 40 for content)
  subcategories: SubcategoryResult[]
}

// Content analysis result
export interface ContentAnalysis extends CategoryScore {
  parseRate: SubcategoryResult
  quantifyingImpact: SubcategoryResult
  repetition: SubcategoryResult
  spellingGrammar: SubcategoryResult
}

// Sections analysis result
export interface SectionsAnalysis extends CategoryScore {
  contact: SubcategoryResult & { hasName: boolean; hasEmail: boolean; hasPhone: boolean; hasLocation: boolean }
  experience: SubcategoryResult & { entryCount: number; hasBullets: boolean }
  education: SubcategoryResult & { entryCount: number }
  skills: SubcategoryResult & { skillCount: number }
  summary: SubcategoryResult & { length: number }
}

// ATS Essentials analysis result
export interface EssentialsAnalysis extends CategoryScore {
  fileFormat: SubcategoryResult
  headings: SubcategoryResult
  tables: SubcategoryResult
  graphics: SubcategoryResult
  fonts: SubcategoryResult
  dates: SubcategoryResult
}

// Tailoring analysis result (optional - requires job description)
export interface TailoringAnalysis extends CategoryScore {
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
}

// Full ATS check result
export interface ATSCheckResult {
  checkId: string
  fileName: string
  fileType: string
  analyzedAt: string

  // Scores
  overallScore: number
  content: ContentAnalysis
  sections: SectionsAnalysis
  atsEssentials: EssentialsAnalysis
  tailoring: TailoringAnalysis | null // null if no job description provided

  // All issues sorted by severity
  issues: ATSIssue[]
  issueCount: {
    critical: number
    warning: number
    info: number
    total: number
  }

  // Summary for quick wins
  summary: {
    strengths: string[]
    criticalIssues: string[]
    quickWins: string[]
  }
}

// ATS check database record status
export type ATSCheckStatus = 'uploaded' | 'email_captured' | 'analyzing' | 'completed' | 'error'

// Database record for ATS check
export interface ATSCheckRecord {
  id: string
  email: string | null
  originalFileName: string
  originalFileUrl: string
  fileType: string
  fileSize: number
  extractedText: string | null
  overallScore: number | null
  contentScore: number | null
  sectionsScore: number | null
  atsEssentialsScore: number | null
  tailoringScore: number | null
  issues: ATSIssue[] | null
  categoryDetails: {
    content: ContentAnalysis
    sections: SectionsAnalysis
    atsEssentials: EssentialsAnalysis
    tailoring: TailoringAnalysis | null
  } | null
  jobDescription: string | null
  jobTitle: string | null
  status: ATSCheckStatus
  processingError: string | null
  ipAddress: string | null
  userAgent: string | null
  convertedToUser: boolean
  convertedUserId: string | null
  convertedAt: Date | null
  beehiivSubscribed: boolean
  beehiivSubscriberId: string | null
  createdAt: Date
  updatedAt: Date
  analyzedAt: Date | null
  expiresAt: Date | null
}

// API request/response types

// POST /api/public/ats-check - Upload resume
export interface UploadRequest {
  file: File
}

export interface UploadResponse {
  status: 'success'
  data: {
    checkId: string
    fileName: string
    fileSize: number
    fileType: string
    preview: {
      estimatedSections: number
      hasContactInfo: boolean
      hasExperience: boolean
      estimatedWordCount: number
    }
  }
}

// POST /api/public/ats-check/[id]/analyze - Submit email & analyze
export interface AnalyzeRequest {
  email: string
  firstName?: string
  jobDescription?: string
  jobTitle?: string
  marketingConsent: boolean
}

export interface AnalyzeResponse {
  status: 'success'
  data: {
    checkId: string
    overallScore: number
    categoryScores: {
      content: number
      sections: number
      atsEssentials: number
      tailoring: number | null
    }
    issueCount: {
      critical: number
      warning: number
      info: number
      total: number
    }
    resultsUrl: string
  }
}

// GET /api/public/ats-check/[id]/results - Get results
export interface ResultsResponse {
  status: 'success'
  data: ATSCheckResult
}

// Error response
export interface ErrorResponse {
  status: 'error'
  error: string
  code: string
  userMessage: string
  details?: string
}

// Scoring weights configuration
export const SCORING_WEIGHTS = {
  content: 40,
  sections: 20,
  atsEssentials: 25,
  tailoring: 15,
} as const

export const CONTENT_WEIGHTS = {
  parseRate: 30,
  quantifyingImpact: 30,
  repetition: 20,
  spellingGrammar: 20,
} as const

export const SECTIONS_WEIGHTS = {
  contact: 25,
  experience: 30,
  education: 20,
  skills: 15,
  summary: 10,
} as const

export const ESSENTIALS_WEIGHTS = {
  fileFormat: 20,
  headings: 20,
  tables: 15,
  graphics: 15,
  fonts: 15,
  dates: 15,
} as const

export const TAILORING_WEIGHTS = {
  keywordMatch: 60,
  skillsAlignment: 40,
} as const
