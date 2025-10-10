/**
 * System Prompt v1.1 UI-Aware Schemas
 * Comprehensive Zod schemas for structured resume optimization output
 */

import { z } from "zod"

// ============================================================================
// ANALYSIS SECTION
// ============================================================================

export const JobAnalysisSectionSchema = z.object({
  job_title: z.string().describe("Extracted job title from posting"),
  seniority: z.string().describe("Seniority level (e.g., Entry, Mid, Senior, Lead, Director)"),
  responsibilities: z.array(z.string()).describe("Key responsibilities from job posting"),
  must_have_skills: z.array(z.string()).describe("Required skills that must be on resume"),
  nice_to_have_skills: z.array(z.string()).describe("Preferred/bonus skills"),
  domain_keywords: z.array(z.string()).describe("Industry/domain-specific terms"),
  compliance_or_regulatory: z.array(z.string()).describe("Compliance/regulatory requirements (KYC, GDPR, etc.)"),
  tooling: z.array(z.string()).describe("Tools, frameworks, platforms mentioned"),
  locations: z.array(z.string()).describe("Job locations or remote status"),
  screening_keywords: z.array(z.string()).describe("Critical keywords for ATS screening"),
})

export type JobAnalysisSection = z.infer<typeof JobAnalysisSectionSchema>

// ============================================================================
// REQUIREMENT-EVIDENCE MAPPING
// ============================================================================

export const RequirementEvidenceMapItemSchema = z.object({
  requirement: z.string().describe("A specific job requirement"),
  evidence: z.array(z.string()).describe("Proof points from resume (1-2 bullets)"),
  gaps: z.string().describe("Description of gap if no evidence found"),
  recommended_keywords: z.array(z.string()).describe("Keywords to add if evidence is weak"),
})

export type RequirementEvidenceMapItem = z.infer<typeof RequirementEvidenceMapItemSchema>

// ============================================================================
// UI PAYLOAD SCHEMAS
// ============================================================================

// Contact Information
export const UIContactInformationSchema = z.object({
  include: z.boolean(),
  locks: z.object({
    first_name: z.boolean(),
    last_name: z.boolean(),
    email: z.boolean(),
    phone: z.boolean(),
    linkedin: z.boolean(),
    location: z.boolean(),
  }),
  fields: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    phone: z.string(),
    linkedin: z.string(),
    location: z.string(),
  }),
  warnings: z.array(z.string()),
})

export type UIContactInformation = z.infer<typeof UIContactInformationSchema>

// Target Title
export const UITargetTitleSchema = z.object({
  include: z.boolean(),
  primary: z.string().describe("Main target title mirroring JD"),
  alternates: z.array(z.string()).describe("2-3 alternate title phrasings"),
  warnings: z.array(z.string()),
})

export type UITargetTitle = z.infer<typeof UITargetTitleSchema>

// Professional Summary
export const UIProfessionalSummarySchema = z.object({
  include: z.boolean(),
  primary: z.string().describe("1-2 sentences with JD keywords and outcomes"),
  alternates: z.array(z.string()).describe("2-3 alternate summary versions"),
  char_limit_hint: z.number().describe("Recommended character limit (e.g., 420)"),
  warnings: z.array(z.string()),
})

export type UIProfessionalSummary = z.infer<typeof UIProfessionalSummarySchema>

// Work Experience
export const UIWorkExperienceBulletsSchema = z.object({
  primary: z.array(z.string()).describe("Primary bullets in CAR format"),
  alternates: z.array(z.string()).describe("Alternate bullet phrasings (technical, leadership, outcome focus)"),
})

export const UIWorkExperienceItemSchema = z.object({
  include: z.boolean(),
  company: z.string(),
  location: z.string(),
  title: z.string(),
  start_date: z.string().describe("Format: MMM YYYY"),
  end_date: z.string().describe("Format: MMM YYYY or Present"),
  bullets: UIWorkExperienceBulletsSchema,
})

export const UIWorkExperienceSchema = z.object({
  include: z.boolean(),
  items: z.array(UIWorkExperienceItemSchema),
  warnings: z.array(z.string()),
})

export type UIWorkExperience = z.infer<typeof UIWorkExperienceSchema>
export type UIWorkExperienceItem = z.infer<typeof UIWorkExperienceItemSchema>

// Education
export const UIEducationItemSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  notes: z.string().describe("GPA, honors, relevant coursework"),
})

export const UIEducationSchema = z.object({
  include: z.boolean(),
  items: z.array(UIEducationItemSchema),
})

export type UIEducation = z.infer<typeof UIEducationSchema>

// Certifications
export const UICertificationItemSchema = z.object({
  name: z.string(),
  issuer: z.string(),
})

export const UICertificationsSchema = z.object({
  include: z.boolean(),
  items: z.array(UICertificationItemSchema),
})

export type UICertifications = z.infer<typeof UICertificationsSchema>

// Skills
export const UISkillsGroupsSchema = z.object({
  Domain: z.array(z.string()),
  ResearchAndValidation: z.array(z.string()),
  ProductAndSystems: z.array(z.string()),
  Tools: z.array(z.string()),
})

export const UISkillsSchema = z.object({
  include: z.boolean(),
  groups: UISkillsGroupsSchema,
  alternates: UISkillsGroupsSchema.describe("Alternate skills to suggest"),
})

export type UISkills = z.infer<typeof UISkillsSchema>

// Interests/Extras
export const UIInterestsSchema = z.object({
  include: z.boolean(),
  items: z.array(z.string()),
})

export type UIInterests = z.infer<typeof UIInterestsSchema>

// Preview
export const UIPreviewSchema = z.object({
  live_preview_text: z.string().describe("Complete resume text for right-panel preview"),
  diff_hints: z.array(z.string()).describe("Markers for new/edited content (e.g., 'line 23: *new*')"),
})

export type UIPreview = z.infer<typeof UIPreviewSchema>

// Complete UI Payload
export const UIPayloadSchema = z.object({
  contact_information: UIContactInformationSchema,
  target_title: UITargetTitleSchema,
  professional_summary: UIProfessionalSummarySchema,
  work_experience: UIWorkExperienceSchema,
  education: UIEducationSchema,
  certifications: UICertificationsSchema,
  skills: UISkillsSchema,
  interests_or_extras: UIInterestsSchema,
  include_parts_summary: z.array(z.string()).describe("List of included section names"),
  preview: UIPreviewSchema,
})

export type UIPayload = z.infer<typeof UIPayloadSchema>

// ============================================================================
// TARGETING SECTION
// ============================================================================

export const TargetingSectionSchema = z.object({
  target_headline: z.string().describe("Job-specific headline"),
  summary: z.string().describe("Tailored summary matching JD"),
})

export type TargetingSection = z.infer<typeof TargetingSectionSchema>

// ============================================================================
// SKILLS BLOCK
// ============================================================================

export const SkillsBlockSchema = UISkillsGroupsSchema

export type SkillsBlock = z.infer<typeof SkillsBlockSchema>

// ============================================================================
// TAILORED RESUME TEXT
// ============================================================================

export const TailoredResumeTextSchema = z.object({
  file_name_suggestion: z.string().describe("Format: Firstname_Lastname_JobTitle_Company.ext"),
  ats_plain_text: z.string().describe("Plain text resume for ATS parsing"),
  notes: z.string().describe("Brief rationale for optimization choices"),
})

export type TailoredResumeText = z.infer<typeof TailoredResumeTextSchema>

// ============================================================================
// RESUME JSON (Structured Export)
// ============================================================================

export const ResumeJSONContactSchema = z.object({
  location: z.string(),
  email: z.string(),
  phone: z.string(),
  linkedin: z.string(),
})

export const ResumeJSONExperienceItemSchema = z.object({
  company: z.string(),
  location: z.string(),
  title: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  bullets: z.array(z.string()),
})

export const ResumeJSONEducationItemSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  notes: z.string(),
})

export const ResumeJSONCertificationItemSchema = z.object({
  name: z.string(),
  issuer: z.string(),
})

export const ResumeJSONExtraItemSchema = z.object({
  label: z.string(),
  value: z.string(),
})

export const ResumeJSONSchema = z.object({
  name: z.string(),
  contact: ResumeJSONContactSchema,
  headline: z.string(),
  summary: z.string(),
  skills: UISkillsGroupsSchema,
  experience: z.array(ResumeJSONExperienceItemSchema),
  education: z.array(ResumeJSONEducationItemSchema),
  certifications: z.array(ResumeJSONCertificationItemSchema),
  extras: z.array(ResumeJSONExtraItemSchema),
})

export type ResumeJSON = z.infer<typeof ResumeJSONSchema>

// ============================================================================
// COVER NOTE
// ============================================================================

export const CoverNoteSchema = z.object({
  subject: z.string().describe("Email subject line"),
  body: z.string().describe("90-120 words, mirrors 3-5 JD keywords and 1-2 outcomes"),
})

export type CoverNote = z.infer<typeof CoverNoteSchema>

// ============================================================================
// QA SECTION
// ============================================================================

export const QAMustHaveCoverageItemSchema = z.object({
  requirement: z.string(),
  covered_in: z.array(z.string()).describe("Sections/locations where requirement appears"),
})

export const QAFormatChecksSchema = z.object({
  single_column: z.boolean(),
  no_tables_or_textboxes: z.boolean(),
  date_format_consistent: z.boolean(),
  tense_consistent: z.boolean(),
})

export const QAScoresSchema = z.object({
  keyword_coverage_0_to_100: z.number().min(0).max(100),
  readability_hint: z.string().describe("Summary of readability checks (e.g., '12-20 words per bullet met')"),
})

export const QASectionSchema = z.object({
  must_have_coverage: z.array(QAMustHaveCoverageItemSchema),
  format_checks: QAFormatChecksSchema,
  scores: QAScoresSchema,
  warnings: z.array(z.string()),
})

export type QASection = z.infer<typeof QASectionSchema>

// ============================================================================
// COMPLETE SYSTEM PROMPT V1.1 OUTPUT
// ============================================================================

export const SystemPromptV1OutputSchema = z.object({
  analysis: JobAnalysisSectionSchema,
  requirement_evidence_map: z.array(RequirementEvidenceMapItemSchema),
  ui: UIPayloadSchema,
  targeting: TargetingSectionSchema,
  skills_block: SkillsBlockSchema,
  tailored_resume_text: TailoredResumeTextSchema,
  resume_json: ResumeJSONSchema,
  cover_note: CoverNoteSchema,
  qa: QASectionSchema,
})

export type SystemPromptV1Output = z.infer<typeof SystemPromptV1OutputSchema>

// ============================================================================
// PREFERENCES SCHEMA
// ============================================================================

export const PreferencesSchema = z.object({
  target_title: z.string().optional(),
  location: z.string().optional(),
  locale: z.enum(['en-US', 'en-GB']).optional().default('en-US'),
  highlights_to_keep: z.array(z.string()).optional(),
  skills_to_exclude: z.array(z.string()).optional(),
  word_count_limits: z.object({
    summary_max: z.number().optional(),
    bullets_max: z.number().optional(),
  }).optional(),
  locked_fields: z.array(z.string()).optional(),
  // User preferences from Step 3 of optimization workflow
  tone: z.enum(['neutral', 'impactful', 'executive']).optional(),
  length_mode: z.enum(['full', 'short']).optional(),
  ats_optimization: z.boolean().optional().default(true),
  emphasize_keywords: z.array(z.string()).optional().default([]),
})

export type Preferences = z.infer<typeof PreferencesSchema>
