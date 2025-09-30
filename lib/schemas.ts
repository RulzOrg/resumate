/**
 * Zod schemas for resume data validation
 * Used for validating LLM responses and API payloads
 */

import { z } from "zod"

/**
 * Schema for a single evidence item extracted from a resume
 */
export const EvidenceItemSchema = z.object({
  evidence_id: z.string().describe("Unique ID prefixed with userId and timestamp"),
  section: z.string().describe("Section name (e.g., 'Experience', 'Education', 'Skills')"),
  text: z.string().min(10).describe("The actual evidence text (min 10 chars)"),
  keywords: z.array(z.string()).describe("Relevant keywords extracted from this evidence"),
  category: z.enum(["work_experience", "education", "skills", "achievements", "certifications", "other"]),
})

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>

/**
 * Schema for parsed resume data returned by the extractor
 */
export const ParsedResumeSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  summary: z.string().optional(),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  })).optional(),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string().optional(),
    field: z.string().optional(),
    graduationDate: z.string().optional(),
  })).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
})

export type ParsedResume = z.infer<typeof ParsedResumeSchema>

/**
 * Schema for evidence extraction response from LLM
 */
export const EvidenceExtractionResponseSchema = z.object({
  evidences: z.array(EvidenceItemSchema).min(1).describe("List of extracted evidence items (at least 1)"),
  totalCount: z.number().int().positive().describe("Total number of evidence items extracted"),
})

export type EvidenceExtractionResponse = z.infer<typeof EvidenceExtractionResponseSchema>

/**
 * Schema for minimal resume data when extraction fails
 */
export const MinimalResumeSchema = z.object({
  rawText: z.string().describe("Raw text content of the resume"),
  wordCount: z.number().int().describe("Word count of the resume"),
  hasStructure: z.boolean().describe("Whether basic structure was detected"),
})

export type MinimalResume = z.infer<typeof MinimalResumeSchema>

/**
 * Schema for resume upload status in database
 */
export const ResumeStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "fallback", // When we fall back to raw indexing
])

export type ResumeStatus = z.infer<typeof ResumeStatusSchema>

/**
 * Schema for paragraph to bullet point conversion
 */
export const ParagraphToBulletResponseSchema = z.object({
  bullets: z.array(z.string()).min(1).describe("Converted bullet points"),
  improved: z.boolean().describe("Whether the conversion improved the content"),
  suggestions: z.array(z.string()).optional().describe("Additional improvement suggestions"),
})

export type ParagraphToBulletResponse = z.infer<typeof ParagraphToBulletResponseSchema>

/**
 * Schema for raw paragraph indexing
 */
export const RawParagraphSchema = z.object({
  paragraph_id: z.string().describe("Unique ID prefixed with userId and timestamp"),
  text: z.string().min(20).describe("The paragraph text (min 20 chars)"),
  section_hint: z.string().optional().describe("Hint about which section this might belong to"),
})

export type RawParagraph = z.infer<typeof RawParagraphSchema>

/**
 * Schema for ingest response - success case
 */
export const IngestSuccessResponseSchema = z.object({
  status: z.literal("success"),
  resumeId: z.string(),
  parsed: ParsedResumeSchema,
  evidenceCount: z.number(),
  fileHash: z.string(),
})

export type IngestSuccessResponse = z.infer<typeof IngestSuccessResponseSchema>

/**
 * Schema for ingest response - fallback case
 */
export const IngestFallbackResponseSchema = z.object({
  status: z.literal("fallback"),
  resumeId: z.string(),
  reason: z.string(),
  rawParagraphs: z.array(z.string()),
  fileHash: z.string(),
})

export type IngestFallbackResponse = z.infer<typeof IngestFallbackResponseSchema>

/**
 * Schema for ingest response - error case
 */
export const IngestErrorResponseSchema = z.object({
  status: z.literal("error"),
  error: z.string(),
  code: z.string().optional(),
})

export type IngestErrorResponse = z.infer<typeof IngestErrorResponseSchema>

/**
 * Union type for ingest response
 */
export const IngestResponseSchema = z.discriminatedUnion("status", [
  IngestSuccessResponseSchema,
  IngestFallbackResponseSchema,
  IngestErrorResponseSchema,
])

export type IngestResponse = z.infer<typeof IngestResponseSchema>