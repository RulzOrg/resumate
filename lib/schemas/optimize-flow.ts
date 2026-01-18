/**
 * Zod schemas for the Resume Optimization Flow
 *
 * Used for validating API request/response payloads and LLM outputs
 */

import { z } from "zod"

// ============================================
// Step 1: Analysis Schemas
// ============================================

export const AnalysisResultSchema = z.object({
  matchScore: z.number().min(0).max(100).describe("Match score from 0-100"),
  strongFitReasons: z
    .array(z.string())
    .length(5)
    .describe("Exactly 5 reasons why the candidate is a strong fit"),
  holdingBackReasons: z
    .array(z.string())
    .min(0)
    .max(5)
    .describe("Up to 5 reasons holding the candidate back"),
  missingKeywords: z
    .array(z.string())
    .length(5)
    .describe("Top 5 missing keywords to add"),
  rawAnalysis: z.string().optional().describe("Raw LLM response for debugging"),
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

export const AnalyzeRequestSchema = z.object({
  resume_id: z.string().min(1, "Resume ID is required"),
  job_description: z.string().min(50, "Job description must be at least 50 characters"),
  job_title: z.string().min(3, "Job title must be at least 3 characters").optional(),
  company_name: z.string().optional(),
})

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>

export const AnalyzeResponseSchema = z.object({
  success: z.boolean(),
  result: AnalysisResultSchema,
  resume_text: z.string().optional(),
})

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>

// ============================================
// Step 2: Rewrite Schemas
// ============================================

export const RewrittenExperienceSchema = z.object({
  company: z.string().describe("Company name"),
  title: z.string().describe("Job title"),
  duration: z.string().describe("Employment duration"),
  originalBullets: z.array(z.string()).describe("Original bullet points"),
  rewrittenBullets: z.array(z.string()).describe("Rewritten X-Y-Z bullets"),
  keywordsAdded: z.array(z.string()).describe("Keywords added to this experience"),
})

export type RewrittenExperience = z.infer<typeof RewrittenExperienceSchema>

export const RewriteResultSchema = z.object({
  professionalSummary: z.string().describe("Rewritten professional summary"),
  workExperiences: z.array(RewrittenExperienceSchema).describe("Rewritten experiences"),
  keywordsAdded: z.array(z.string()).describe("All keywords successfully added"),
})

export type RewriteResult = z.infer<typeof RewriteResultSchema>

export const EditedContentSchema = z.object({
  professionalSummary: z.string(),
  workExperiences: z.array(RewrittenExperienceSchema),
})

export type EditedContent = z.infer<typeof EditedContentSchema>

export const RewriteRequestSchema = z.object({
  resume_id: z.string().min(1),
  job_description: z.string().min(50),
  job_title: z.string().min(3),
  company_name: z.string().optional(),
  analysis_result: AnalysisResultSchema,
  resume_text: z.string().optional(),
})

export type RewriteRequest = z.infer<typeof RewriteRequestSchema>

export const RewriteResponseSchema = z.object({
  success: z.boolean(),
  result: RewriteResultSchema,
})

export type RewriteResponse = z.infer<typeof RewriteResponseSchema>

// ============================================
// Step 3: ATS Scan Schemas
// ============================================

export const ATSSectionStatusSchema = z.enum(['pass', 'warning', 'fail'])
export type ATSSectionStatus = z.infer<typeof ATSSectionStatusSchema>

export const ATSIssueSeveritySchema = z.enum(['critical', 'warning', 'info'])
export type ATSIssueSeverity = z.infer<typeof ATSIssueSeveritySchema>

export const ATSSectionResultSchema = z.object({
  name: z.string().describe("Section name"),
  status: ATSSectionStatusSchema,
  risk: z.string().describe("Risk description if not passing"),
  fix: z.string().describe("How to fix the issue"),
  details: z.string().describe("Additional details"),
})

export type ATSSectionResult = z.infer<typeof ATSSectionResultSchema>

export const ATSIssueSchema = z.object({
  section: z.string(),
  severity: ATSIssueSeveritySchema,
  issue: z.string(),
  fix: z.string(),
})

export type ATSIssue = z.infer<typeof ATSIssueSchema>

export const ATSScanResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  sections: z.array(ATSSectionResultSchema),
  criticalIssues: z.array(ATSIssueSchema),
  warnings: z.array(ATSIssueSchema),
  recommendations: z.array(z.string()),
})

export type ATSScanResult = z.infer<typeof ATSScanResultSchema>

export const ATSScanRequestSchema = z.object({
  resume_id: z.string().min(1),
  edited_content: EditedContentSchema,
  job_description: z.string().optional(),
})

export type ATSScanRequest = z.infer<typeof ATSScanRequestSchema>

export const ATSScanResponseSchema = z.object({
  success: z.boolean(),
  result: ATSScanResultSchema,
})

export type ATSScanResponse = z.infer<typeof ATSScanResponseSchema>

// ============================================
// Step 4: Interview Prep Schemas
// ============================================

export const QuestionDifficultySchema = z.enum(['hard', 'very_hard', 'expert'])
export type QuestionDifficulty = z.infer<typeof QuestionDifficultySchema>

export const QuestionCategorySchema = z.enum([
  'Technical',
  'Behavioral',
  'Situational',
  'System Design',
  'Leadership',
])
export type QuestionCategory = z.infer<typeof QuestionCategorySchema>

export const InterviewQuestionSchema = z.object({
  question: z.string().describe("The interview question"),
  difficulty: QuestionDifficultySchema,
  category: QuestionCategorySchema,
  perfectAnswer: z.string().describe("Perfect answer tailored to candidate"),
  keyPoints: z.array(z.string()).min(2).max(5).describe("Key points to hit"),
  relatedExperience: z.string().describe("Related experience from resume"),
})

export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>

export const InterviewPrepResultSchema = z.object({
  questions: z.array(InterviewQuestionSchema).length(3).describe("3 hard questions"),
})

export type InterviewPrepResult = z.infer<typeof InterviewPrepResultSchema>

export const InterviewPrepRequestSchema = z.object({
  resume_id: z.string().min(1),
  job_description: z.string().min(50),
  job_title: z.string().min(3),
  company_name: z.string().optional(),
  resume_text: z.string().optional(),
})

export type InterviewPrepRequest = z.infer<typeof InterviewPrepRequestSchema>

export const InterviewPrepResponseSchema = z.object({
  success: z.boolean(),
  result: InterviewPrepResultSchema,
})

export type InterviewPrepResponse = z.infer<typeof InterviewPrepResponseSchema>

// ============================================
// Flow State Schema
// ============================================

export const FlowStepSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
])

export type FlowStep = z.infer<typeof FlowStepSchema>

export const OptimizeFlowStateSchema = z.object({
  currentStep: FlowStepSchema,
  resumeId: z.string().nullable(),
  resumeText: z.string().optional(),
  jobTitle: z.string(),
  jobDescription: z.string(),
  companyName: z.string(),
  analysisResult: AnalysisResultSchema.nullable(),
  rewriteResult: RewriteResultSchema.nullable(),
  editedContent: EditedContentSchema.nullable(),
  atsScanResult: ATSScanResultSchema.nullable(),
  interviewPrepResult: InterviewPrepResultSchema.nullable(),
  isLoading: z.boolean(),
  error: z.string().nullable(),
})

export type OptimizeFlowState = z.infer<typeof OptimizeFlowStateSchema>

// ============================================
// LLM Response Schemas (for structured output)
// ============================================

/**
 * Schema for the LLM analysis response
 * Used with Anthropic's structured output feature
 */
export const LLMAnalysisResponseSchema = z.object({
  matchScore: z.number().min(0).max(100),
  strongFitReasons: z.array(z.string()).length(5),
  holdingBackReasons: z.array(z.string()).min(1).max(5),
  missingKeywords: z.array(z.string()).length(5),
})

/**
 * Schema for the LLM rewrite response
 */
export const LLMRewriteResponseSchema = z.object({
  professionalSummary: z.string(),
  workExperiences: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      duration: z.string(),
      originalBullets: z.array(z.string()),
      rewrittenBullets: z.array(z.string()),
      keywordsAdded: z.array(z.string()),
    })
  ),
  keywordsAdded: z.array(z.string()),
})

/**
 * Schema for the LLM interview prep response
 */
export const LLMInterviewPrepResponseSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      difficulty: z.enum(['hard', 'very_hard', 'expert']),
      category: z.enum(['Technical', 'Behavioral', 'Situational', 'System Design', 'Leadership']),
      perfectAnswer: z.string(),
      keyPoints: z.array(z.string()),
      relatedExperience: z.string(),
    })
  ).length(3),
})
