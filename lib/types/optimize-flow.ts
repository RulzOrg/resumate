/**
 * Type definitions for the Resume Optimization Flow
 *
 * This flow guides users through a 4-step process:
 * 1. Resume Analysis - Match score, strengths, weaknesses, keywords
 * 2. Experience Rewrite - X-Y-Z formula rewriting
 * 3. ATS Scanner - Section compatibility check
 * 4. Interview Prep - Technical questions + answers
 */

// ============================================
// Step 1: Analysis Types
// ============================================

export interface AnalysisResult {
  /** Match score from 0-100 */
  matchScore: number
  /** 5 reasons why the candidate is a strong fit */
  strongFitReasons: string[]
  /** Up to 5 reasons holding the candidate back (relative to JD) */
  holdingBackReasons: string[]
  /** Top 5 missing keywords to add */
  missingKeywords: string[]
  /** Raw LLM response for debugging (optional) */
  rawAnalysis?: string
}

// ============================================
// Step 2: Rewrite Types
// ============================================

export interface RewrittenExperience {
  /** Company name */
  company: string
  /** Job title */
  title: string
  /** Employment duration (e.g., "Jan 2021 - Present") */
  duration: string
  /** Original bullet points from resume */
  originalBullets: string[]
  /** Rewritten bullets using X-Y-Z formula */
  rewrittenBullets: string[]
  /** Keywords successfully added to this experience */
  keywordsAdded: string[]
}

export interface RewriteResult {
  /** Rewritten professional summary */
  professionalSummary: string
  /** Rewritten work experiences */
  workExperiences: RewrittenExperience[]
  /** All keywords successfully added across all sections */
  keywordsAdded: string[]
}

export interface EditedContent {
  /** User-edited professional summary */
  professionalSummary: string
  /** User-edited work experiences */
  workExperiences: RewrittenExperience[]
}

// ============================================
// Step 3: ATS Scan Types
// ============================================

export type ATSSectionStatus = 'pass' | 'warning' | 'fail'
export type ATSIssueSeverity = 'critical' | 'warning' | 'info'

export interface ATSSectionResult {
  /** Section name (e.g., "Contact Information", "Work Experience") */
  name: string
  /** Pass/warning/fail status */
  status: ATSSectionStatus
  /** Risk description if not passing */
  risk: string
  /** How to fix the issue */
  fix: string
  /** Additional details about the check */
  details: string
}

export interface ATSIssue {
  /** Section where the issue was found */
  section: string
  /** Severity level */
  severity: ATSIssueSeverity
  /** Issue description */
  issue: string
  /** How to fix the issue */
  fix: string
}

export interface ATSScanResult {
  /** Overall ATS compatibility score (0-100) */
  overallScore: number
  /** Section-by-section breakdown */
  sections: ATSSectionResult[]
  /** Critical issues that need immediate attention */
  criticalIssues: ATSIssue[]
  /** Warnings that could impact parsing */
  warnings: ATSIssue[]
  /** General recommendations */
  recommendations: string[]
}

// ============================================
// Step 4: Interview Prep Types
// ============================================

export type QuestionDifficulty = 'hard' | 'very_hard' | 'expert'
export type QuestionCategory = 'Technical' | 'Behavioral' | 'Situational' | 'System Design' | 'Leadership'

export interface InterviewQuestion {
  /** The interview question */
  question: string
  /** Difficulty level */
  difficulty: QuestionDifficulty
  /** Question category */
  category: QuestionCategory
  /** Perfect answer tailored to candidate's experience */
  perfectAnswer: string
  /** Key points to hit in the answer */
  keyPoints: string[]
  /** Related experience from the resume */
  relatedExperience: string
}

export interface InterviewPrepResult {
  /** 3 hardest technical questions with answers */
  questions: InterviewQuestion[]
}

// ============================================
// Flow State Types
// ============================================

export type FlowStep = 1 | 2 | 3 | 4

export interface OptimizeFlowState {
  /** Current step in the flow (1-4) */
  currentStep: FlowStep

  /** Selected resume ID */
  resumeId: string | null
  /** Resume text content (for passing between steps) */
  resumeText?: string
  /** Job title */
  jobTitle: string
  /** Job description (pasted by user) */
  jobDescription: string
  /** Company name (optional) */
  companyName: string

  /** Step 1 analysis results */
  analysisResult: AnalysisResult | null

  /** Step 2 rewrite results from LLM */
  rewriteResult: RewriteResult | null
  /** User-edited content after rewrite */
  editedContent: EditedContent | null

  /** Step 3 ATS scan results */
  atsScanResult: ATSScanResult | null

  /** Step 4 interview prep results */
  interviewPrepResult: InterviewPrepResult | null

  /** Flow metadata */
  isLoading: boolean
  error: string | null
}

// ============================================
// API Request/Response Types
// ============================================

export interface AnalyzeRequest {
  resume_id: string
  job_description: string
  job_title?: string
  company_name?: string
}

export interface AnalyzeResponse {
  success: boolean
  result: AnalysisResult
  resume_text?: string
}

export interface RewriteRequest {
  resume_id: string
  job_description: string
  job_title: string
  company_name?: string
  analysis_result: AnalysisResult
  resume_text?: string
}

export interface RewriteResponse {
  success: boolean
  result: RewriteResult
}

export interface ATSScanRequest {
  resume_id: string
  edited_content: EditedContent
  job_description?: string
}

export interface ATSScanResponse {
  success: boolean
  result: ATSScanResult
}

export interface InterviewPrepRequest {
  resume_id: string
  job_description: string
  job_title: string
  company_name?: string
  resume_text?: string
}

export interface InterviewPrepResponse {
  success: boolean
  result: InterviewPrepResult
}

// ============================================
// UI Component Props Types
// ============================================

export interface StepIndicatorProps {
  currentStep: FlowStep
  completedSteps: FlowStep[]
  onStepClick?: (step: FlowStep) => void
}

export interface AnalysisStepProps {
  resumes: Array<{
    id: string
    title: string
    file_name: string
    processing_status: string
    kind: string
  }>
  onAnalysisComplete: (result: AnalysisResult, resumeText: string) => void
  initialResumeId?: string
}

export interface RewriteStepProps {
  analysisResult: AnalysisResult
  resumeId: string
  resumeText: string
  jobDescription: string
  jobTitle: string
  companyName: string
  onRewriteComplete: (result: RewriteResult, editedContent: EditedContent) => void
  onBack: () => void
}

export interface ATSScanStepProps {
  editedContent: EditedContent
  resumeId: string
  jobDescription: string
  onScanComplete: (result: ATSScanResult) => void
  onBack: () => void
}

export interface InterviewPrepStepProps {
  resumeId: string
  resumeText: string
  jobDescription: string
  jobTitle: string
  companyName: string
  onComplete: (result: InterviewPrepResult) => void
  onBack: () => void
  onSkip: () => void
}

// ============================================
// Step Configuration
// ============================================

export interface StepConfig {
  number: FlowStep
  title: string
  description: string
  icon: string
}

export const FLOW_STEPS: StepConfig[] = [
  {
    number: 1,
    title: 'Analyze',
    description: 'Match score & gaps',
    icon: 'search',
  },
  {
    number: 2,
    title: 'Rewrite',
    description: 'X-Y-Z optimization',
    icon: 'edit',
  },
  {
    number: 3,
    title: 'ATS Scan',
    description: 'Compatibility check',
    icon: 'scan',
  },
  {
    number: 4,
    title: 'Interview',
    description: 'Prepare answers',
    icon: 'mic',
  },
]
