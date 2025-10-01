/**
 * Zod schemas for CV generation (PRD-compliant)
 * Based on GENERATE_CV-PRD.md and GENERATE_CV_AUDIT_REPORT.md
 * 
 * These schemas enforce the structure for evidence-grounded CV generation
 * with variant support (Conservative/Balanced/Bold), version management,
 * and comprehensive change tracking.
 */

import { z } from "zod";

/**
 * Immutable fields that should never be changed during generation
 * These fields are extracted from the master resume and must remain unchanged
 */
export const ImmutableFieldsSchema = z.object({
  name: z.string().optional().describe("Full name from master resume"),
  email: z.string().email().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  address: z.string().optional().describe("Physical address or location"),
  education: z.array(z.string()).describe("Education entries, rendered exactly as in master"),
  certifications: z.array(z.string()).describe("Certifications, rendered exactly as in master"),
});

export type ImmutableFields = z.infer<typeof ImmutableFieldsSchema>;

/**
 * Options for CV rewrite controlling tone, keywords, and constraints
 */
export const RewriteOptionsSchema = z.object({
  tone: z.enum(["Neutral", "Impactful", "Executive"]).describe("Writing tone for the CV"),
  must_hit: z.array(z.string()).describe("Keywords that MUST appear verbatim from job description"),
  emphasis: z.array(z.string()).describe("Topics to emphasize (auto-inferred from JD, user can edit)"),
  keep_spelling: z.enum(["US", "UK"]).describe("Spelling variant to use consistently"),
  max_pages: z.literal(2).describe("Maximum page length (always 2)"),
});

export type RewriteOptions = z.infer<typeof RewriteOptionsSchema>;

/**
 * A single rewritten bullet point with evidence grounding
 * Each bullet must be traceable to source evidence or marked as synthesized
 */
export const BulletRewriteSchema = z.object({
  evidence_id: z.string().optional().describe("Link to source evidence if grounded directly"),
  source_text: z.string().optional().describe("Original text for diff view"),
  rewritten: z.string().describe("Rewritten bullet text"),
  grounded: z.enum(["direct", "synthesized"]).describe(
    "direct = uses evidence verbatim with phrasing changes; synthesized = paraphrases without new facts"
  ),
});

export type BulletRewrite = z.infer<typeof BulletRewriteSchema>;

/**
 * A rewritten experience section (job, project, or volunteering)
 * Includes relevance score for ordering by fit to target job
 */
export const ExperienceRewriteSchema = z.object({
  company: z.string().describe("Company/organization name"),
  title: z.string().describe("Job title or role"),
  start_date: z.string().optional().describe("Start date (format: YYYY-MM or Month YYYY)"),
  end_date: z.string().optional().describe("End date (format: YYYY-MM, Month YYYY, or 'Present')"),
  bullets: z.array(BulletRewriteSchema).describe("Achievement bullets with evidence grounding"),
  relevance_score: z.number().min(0).max(100).describe("Relevance to target job for ordering (0-100)"),
});

export type ExperienceRewrite = z.infer<typeof ExperienceRewriteSchema>;

/**
 * Complete CV draft with all sections
 * This is the main structure returned by the AI generation
 */
export const CvDraftSchema = z.object({
  basics: ImmutableFieldsSchema.describe("Immutable contact and education information"),
  summary: z.string().optional().describe("Professional summary, refreshed but grounded in resume + JD"),
  experiences: z.array(ExperienceRewriteSchema).describe("Work experiences ordered by relevance"),
  projects: z.array(ExperienceRewriteSchema).optional().describe("Projects (promote/demote for relevance)"),
  volunteering: z.array(ExperienceRewriteSchema).optional().describe("Volunteer work"),
  skills: z.array(z.string()).describe("Skills reordered for relevance, subset of original unless present elsewhere"),
  spelling: z.enum(["US", "UK"]).describe("Detected spelling variant from master resume"),
  must_hit_coverage: z.array(
    z.object({
      term: z.string().describe("Must-hit keyword"),
      included: z.boolean().describe("Whether term appears in CV"),
      location: z.string().optional().describe("Where term was added (summary, skills, bullet)"),
    })
  ).describe("Coverage tracking for must-hit keywords"),
  skills_changelog: z.object({
    added: z.array(
      z.object({
        skill: z.string().describe("Skill that was added"),
        justification: z.string().describe("Why added (e.g., 'Found in Experience section, bullet 3')"),
      })
    ).describe("Skills added (must exist somewhere in master resume)"),
    removed: z.array(
      z.object({
        skill: z.string().describe("Skill that was removed"),
        reason: z.string().describe("Why removed (e.g., 'Not relevant to target role')"),
      })
    ).describe("Skills removed for relevance"),
  }).describe("Changes made to skills section with justifications"),
  length_estimate: z.object({
    pages: z.number().describe("Estimated page count"),
    lines: z.number().describe("Estimated line count"),
    characters: z.number().describe("Total character count"),
    trimmed_sections: z.array(z.string()).optional().describe("Sections that were trimmed to fit 2 pages"),
  }).describe("Length estimation and trimming information"),
  locks_applied: z.object({
    sections: z.array(z.string()).describe("Locked sections that were preserved unchanged"),
    bullet_ids: z.array(z.string()).describe("Locked bullet IDs that were preserved unchanged"),
  }).describe("Locks that were applied during generation"),
});

export type CvDraft = z.infer<typeof CvDraftSchema>;

/**
 * A variant of the CV with a specific style
 * Conservative = minimal changes, Balanced = moderate, Bold = aggressive
 */
export const CvVariantSchema = z.object({
  variant_id: z.string().describe("Unique variant ID (UUID)"),
  label: z.enum(["Conservative", "Balanced", "Bold"]).describe("Variant style label"),
  draft: CvDraftSchema.describe("Complete CV draft for this variant"),
  is_selected: z.boolean().default(false).describe("Whether user selected this variant as their choice"),
  created_at: z.string().describe("ISO 8601 timestamp of creation"),
});

export type CvVariant = z.infer<typeof CvVariantSchema>;

/**
 * A versioned CV with multiple variants
 * Represents one generation attempt for a specific job
 */
export const VersionedCvSchema = z.object({
  version_id: z.string().describe("Unique version ID (UUID)"),
  user_id: z.string().describe("User ID who owns this version"),
  job_id: z.string().describe("Job analysis ID this CV targets"),
  original_resume_id: z.string().describe("Source resume ID used for generation"),
  variants: z.array(CvVariantSchema).length(3).describe("Exactly 3 variants: Conservative, Balanced, Bold"),
  status: z.enum(["current", "archived"]).describe("Version status (current or archived)"),
  created_at: z.string().describe("ISO 8601 timestamp of creation"),
  updated_at: z.string().describe("ISO 8601 timestamp of last update"),
});

export type VersionedCv = z.infer<typeof VersionedCvSchema>;

/**
 * Request to generate CV with options and locks
 */
export const GenerateCvRequestSchema = z.object({
  userId: z.string().describe("User ID making the request"),
  jobId: z.string().describe("Job analysis ID to optimize for"),
  resumeId: z.string().describe("Resume ID to use as source"),
  options: RewriteOptionsSchema.describe("Generation options"),
  locks: z.object({
    sections: z.array(z.string()).default([]).describe("Section names to lock (e.g., ['Education', 'Certifications'])"),
    bullet_ids: z.array(z.string()).default([]).describe("Specific bullet IDs to preserve unchanged"),
  }).default({ sections: [], bullet_ids: [] }).describe("Sections and bullets to lock"),
});

export type GenerateCvRequest = z.infer<typeof GenerateCvRequestSchema>;

/**
 * Eligibility check result
 * Used to determine if user is qualified to generate CV for a job
 */
export const EligibilityResultSchema = z.object({
  allowed: z.boolean().describe("Whether generation is allowed"),
  score: z.number().optional().describe("Match score (0-100)"),
  min_score_needed: z.number().optional().describe("Points needed to reach minimum threshold"),
  must_have_coverage: z.number().optional().describe("Percentage of must-have skills covered (0-100)"),
  reasons: z.array(z.string()).optional().describe("Reasons why generation is blocked"),
  guidance: z.array(z.string()).optional().describe("Actionable guidance to improve qualification"),
  missing_must_haves: z.array(z.string()).optional().describe("Required skills missing from resume"),
  message: z.string().optional().describe("Success message if allowed"),
});

export type EligibilityResult = z.infer<typeof EligibilityResultSchema>;

/**
 * Changelog entry for tracking changes
 */
export const ChangelogEntrySchema = z.object({
  changelog_id: z.string().describe("Unique changelog entry ID"),
  version_id: z.string().describe("Version this change belongs to"),
  change_type: z.enum([
    "skill_added",
    "skill_removed",
    "section_moved",
    "bullet_locked",
    "experience_reordered",
    "section_trimmed",
    "keyword_added",
  ]).describe("Type of change"),
  details: z.record(z.any()).describe("Change details as JSON object"),
  created_at: z.string().describe("ISO 8601 timestamp"),
});

export type ChangelogEntry = z.infer<typeof ChangelogEntrySchema>;

/**
 * Generation context for prompt building
 * Internal type used by prompt builder
 */
export const GenerationContextSchema = z.object({
  masterResume: z.object({
    basics: ImmutableFieldsSchema,
    content: z.string(),
    structured: z.any(),
  }),
  jobProfile: z.object({
    job_title: z.string(),
    company_name: z.string().optional(),
    required_skills: z.array(z.string()),
    preferred_skills: z.array(z.string()),
    keywords: z.array(z.string()),
    key_requirements: z.array(z.string()),
  }),
  evidence: z.array(z.any()),
  options: RewriteOptionsSchema,
  locks: z.object({
    sections: z.array(z.string()),
    bullet_ids: z.array(z.string()),
  }),
  variant: z.enum(["Conservative", "Balanced", "Bold"]),
});

export type GenerationContext = z.infer<typeof GenerationContextSchema>;

/**
 * Diff result for comparing variants
 */
export const DiffResultSchema = z.object({
  section: z.string().describe("Section name"),
  before: z.string().describe("Original text"),
  after: z.string().describe("Modified text"),
  evidence_id: z.string().optional().describe("Link to evidence if applicable"),
  change_type: z.enum(["added", "removed", "modified", "unchanged"]).describe("Type of change"),
});

export type DiffResult = z.infer<typeof DiffResultSchema>;

/**
 * Export options for download
 */
export const ExportOptionsSchema = z.object({
  variant_id: z.string().describe("Variant ID to export"),
  format: z.enum(["docx", "pdf", "txt"]).describe("Export format"),
  include_metadata: z.boolean().default(true).describe("Include match score and metadata"),
});

export type ExportOptions = z.infer<typeof ExportOptionsSchema>;
