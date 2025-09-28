import { z } from "zod"

export const EvidenceBulletSchema = z.object({
  evidence_id: z.string(),
  text: z.string(),
  section: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  seniority: z.string().optional(),
  domain: z.string().optional(),
  skills: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
})

export const ResumeExperienceSchema = z.object({
  company: z.string().optional(),
  title: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  location: z.string().optional(),
  bullets: z.array(EvidenceBulletSchema).default([]),
})

export const ResumeSectionSchema = z.object({
  name: z.string(),
  bullets: z.array(EvidenceBulletSchema).default([]),
})

export const ResumeExtractedSchema = z.object({
  resume_id: z.string(),
  source: z.string().optional(),
  summary: z.string().optional(),
  experiences: z.array(ResumeExperienceSchema).default([]),
  sections: z.array(ResumeSectionSchema).default([]),
  skills: z.array(z.string()).default([]),
  metadata: z
    .object({
      used_ocr: z.boolean().optional(),
      extractor_notes: z.array(z.string()).optional(),
    })
    .optional(),
})

export type ResumeExtracted = z.infer<typeof ResumeExtractedSchema>
export type EvidenceBullet = z.infer<typeof EvidenceBulletSchema>