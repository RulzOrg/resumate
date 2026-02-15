import { z } from "zod"
import { formatResumeToMarkdown } from "@/lib/resume-formatter"
import {
  parseResumeContent,
  type ParsedResume,
  type ContactInfo,
  type WorkExperienceItem,
  type EducationItem,
  type CertificationItem,
  type ProjectItem,
  type VolunteerItem,
  type PublicationItem,
} from "@/lib/resume-parser"
import { ResumeJSONSchema, type ResumeJSON } from "@/lib/schemas-v2"

export const SECTION_IDS = [
  "contact",
  "target",
  "summary",
  "experience",
  "education",
  "skills",
  "interests",
  "certifications",
  "awards",
  "projects",
  "volunteering",
  "publications",
] as const

export type SectionId = (typeof SECTION_IDS)[number]

export type FieldProvenance =
  | "extracted"
  | "ai_generated"
  | "user_edited"
  | "migrated"

const ContactInfoSchema = z.object({
  name: z.string().default(""),
  location: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
})

const WorkExperienceItemSchema = z.object({
  company: z.string().default(""),
  title: z.string().default(""),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  employmentType: z.string().optional(),
  bullets: z.array(z.string()).default([]),
})

const EducationItemSchema = z.object({
  institution: z.string().default(""),
  degree: z.string().optional(),
  field: z.string().optional(),
  graduationDate: z.string().optional(),
  notes: z.string().optional(),
})

const CertificationItemSchema = z.object({
  name: z.string().default(""),
  issuer: z.string().optional(),
  date: z.string().optional(),
})

const ProjectItemSchema = z.object({
  name: z.string().default(""),
  description: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  bullets: z.array(z.string()).default([]),
})

const VolunteerItemSchema = z.object({
  organization: z.string().default(""),
  role: z.string().optional(),
  dates: z.string().optional(),
  description: z.string().optional(),
})

const PublicationItemSchema = z.object({
  title: z.string().default(""),
  publisher: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
})

export const OptimizedResumeDocumentV1Schema = z.object({
  contact: ContactInfoSchema.default({ name: "" }),
  targetTitle: z.string().optional(),
  summary: z.string().optional(),
  workExperience: z.array(WorkExperienceItemSchema).default([]),
  education: z.array(EducationItemSchema).default([]),
  skills: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  certifications: z.array(CertificationItemSchema).default([]),
  awards: z.array(z.string()).default([]),
  projects: z.array(ProjectItemSchema).default([]),
  volunteering: z.array(VolunteerItemSchema).default([]),
  publications: z.array(PublicationItemSchema).default([]),
}).strict()

export type OptimizedResumeDocumentV1 = z.infer<typeof OptimizedResumeDocumentV1Schema>

export const StructuredResumeMetadataV1Schema = z.object({
  field_provenance: z
    .record(z.enum(SECTION_IDS), z.enum(["extracted", "ai_generated", "user_edited", "migrated"]))
    .optional(),
  extraction_confidence: z.record(z.enum(SECTION_IDS), z.number().min(0).max(1)).optional(),
  last_editor: z.string().optional(),
  last_edited_at: z.string().optional(),
})

export type StructuredResumeMetadataV1 = z.infer<typeof StructuredResumeMetadataV1Schema>

export const StructuredResumeEnvelopeV1Schema = z.object({
  schema_version: z.literal("v1"),
  document: OptimizedResumeDocumentV1Schema,
  metadata: StructuredResumeMetadataV1Schema.default({}),
})

export type StructuredResumeEnvelopeV1 = z.infer<typeof StructuredResumeEnvelopeV1Schema>

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function sanitizeParsedResume(data: Partial<ParsedResume>): ParsedResume {
  return {
    contact: (data.contact || { name: "" }) as ContactInfo,
    targetTitle: data.targetTitle,
    summary: data.summary,
    workExperience: (data.workExperience || []) as WorkExperienceItem[],
    education: (data.education || []) as EducationItem[],
    skills: data.skills || [],
    interests: data.interests || [],
    certifications: (data.certifications || []) as CertificationItem[],
    awards: data.awards || [],
    projects: (data.projects || []) as ProjectItem[],
    volunteering: (data.volunteering || []) as VolunteerItem[],
    publications: (data.publications || []) as PublicationItem[],
  }
}

function toDocument(input: ParsedResume | OptimizedResumeDocumentV1): OptimizedResumeDocumentV1 {
  return OptimizedResumeDocumentV1Schema.parse(sanitizeParsedResume(input))
}

function emptyProvenance(defaultValue: FieldProvenance): Record<SectionId, FieldProvenance> {
  return {
    contact: defaultValue,
    target: defaultValue,
    summary: defaultValue,
    experience: defaultValue,
    education: defaultValue,
    skills: defaultValue,
    interests: defaultValue,
    certifications: defaultValue,
    awards: defaultValue,
    projects: defaultValue,
    volunteering: defaultValue,
    publications: defaultValue,
  }
}

export function toStructuredDocument(
  parsed: ParsedResume,
  options?: {
    provenanceDefault?: FieldProvenance
    fieldProvenance?: Partial<Record<SectionId, FieldProvenance>>
    extractionConfidence?: Partial<Record<SectionId, number>>
    lastEditor?: string
    lastEditedAt?: string
  }
): StructuredResumeEnvelopeV1 {
  const provenanceDefault = options?.provenanceDefault || "user_edited"
  return {
    schema_version: "v1",
    document: toDocument(parsed),
    metadata: {
      field_provenance: {
        ...emptyProvenance(provenanceDefault),
        ...(options?.fieldProvenance || {}),
      },
      extraction_confidence: options?.extractionConfidence,
      last_editor: options?.lastEditor,
      last_edited_at: options?.lastEditedAt || new Date().toISOString(),
    },
  }
}

function fromResumeJSON(resumeJSON: ResumeJSON): ParsedResume {
  return sanitizeParsedResume({
    contact: {
      name: resumeJSON.name || "",
      location: resumeJSON.contact.location || undefined,
      email: resumeJSON.contact.email || undefined,
      phone: resumeJSON.contact.phone || undefined,
      linkedin: resumeJSON.contact.linkedin || undefined,
    },
    targetTitle: resumeJSON.headline || undefined,
    summary: resumeJSON.summary || undefined,
    workExperience: (resumeJSON.experience || []).map((entry) => ({
      company: entry.company,
      title: entry.title,
      location: entry.location || undefined,
      startDate: entry.start_date || undefined,
      endDate: entry.end_date || undefined,
      bullets: entry.bullets || [],
    })),
    education: (resumeJSON.education || []).map((entry) => ({
      institution: entry.institution,
      degree: entry.degree || undefined,
      notes: entry.notes || undefined,
    })),
    skills: Object.values(resumeJSON.skills || {}).flat(),
    interests: (resumeJSON.extras || [])
      .filter((entry) => entry.label.toLowerCase().includes("interest"))
      .map((entry) => entry.value),
    certifications: (resumeJSON.certifications || []).map((entry) => ({
      name: entry.name,
      issuer: entry.issuer || undefined,
    })),
    awards: (resumeJSON.extras || [])
      .filter((entry) => entry.label.toLowerCase().includes("award"))
      .map((entry) => entry.value),
  })
}

function fromLegacyStructuredOutput(structuredOutput: Record<string, unknown>): ParsedResume | null {
  if (structuredOutput.resume_json) {
    const resumeJSONResult = ResumeJSONSchema.safeParse(structuredOutput.resume_json)
    if (resumeJSONResult.success) {
      return fromResumeJSON(resumeJSONResult.data)
    }
  }

  if (structuredOutput.ui && asRecord(structuredOutput.ui)) {
    const ui = asRecord(structuredOutput.ui)
    const contactFields = asRecord(asRecord(ui?.contact_information)?.fields) || {}
    const workItems = (asRecord(ui?.work_experience)?.items as unknown[]) || []
    const educationItems = (asRecord(ui?.education)?.items as unknown[]) || []

    const parsed: ParsedResume = sanitizeParsedResume({
      contact: {
        name: [contactFields.first_name, contactFields.last_name].filter(Boolean).join(" "),
        email: typeof contactFields.email === "string" ? contactFields.email : undefined,
        phone: typeof contactFields.phone === "string" ? contactFields.phone : undefined,
        linkedin: typeof contactFields.linkedin === "string" ? contactFields.linkedin : undefined,
        location: typeof contactFields.location === "string" ? contactFields.location : undefined,
      },
      targetTitle:
        typeof asRecord(ui?.target_title)?.primary === "string"
          ? (asRecord(ui?.target_title)?.primary as string)
          : undefined,
      summary:
        typeof asRecord(ui?.professional_summary)?.primary === "string"
          ? (asRecord(ui?.professional_summary)?.primary as string)
          : undefined,
      workExperience: workItems
        .map((item) => {
          const row = asRecord(item)
          if (!row) return null
          const bulletObject = asRecord(row.bullets)
          return {
            company: typeof row.company === "string" ? row.company : "",
            title: typeof row.title === "string" ? row.title : "",
            location: typeof row.location === "string" ? row.location : undefined,
            startDate: typeof row.start_date === "string" ? row.start_date : undefined,
            endDate: typeof row.end_date === "string" ? row.end_date : undefined,
            bullets: Array.isArray(bulletObject?.primary)
              ? (bulletObject?.primary as string[])
              : [],
          } as WorkExperienceItem
        })
        .filter(Boolean) as WorkExperienceItem[],
      education: educationItems
        .map((item) => {
          const row = asRecord(item)
          if (!row) return null
          return {
            institution: typeof row.institution === "string" ? row.institution : "",
            degree: typeof row.degree === "string" ? row.degree : undefined,
            notes: typeof row.notes === "string" ? row.notes : undefined,
          } as EducationItem
        })
        .filter(Boolean) as EducationItem[],
      certifications: ((asRecord(ui?.certifications)?.items as unknown[]) || [])
        .map((item) => {
          const row = asRecord(item)
          if (!row) return null
          return {
            name: typeof row.name === "string" ? row.name : "",
            issuer: typeof row.issuer === "string" ? row.issuer : undefined,
          } as CertificationItem
        })
        .filter(Boolean) as CertificationItem[],
      skills: Object.values(asRecord(asRecord(ui?.skills)?.groups) || {})
        .flat()
        .filter((value): value is string => typeof value === "string"),
      interests: ((asRecord(ui?.interests_or_extras)?.items as unknown[]) || []).filter(
        (value): value is string => typeof value === "string"
      ),
    })

    return parsed
  }

  return null
}

export function fromStructuredDocument(input: unknown): ParsedResume | null {
  const schemaResult = StructuredResumeEnvelopeV1Schema.safeParse(input)
  if (schemaResult.success) {
    return sanitizeParsedResume(schemaResult.data.document)
  }

  const parsedDocResult = OptimizedResumeDocumentV1Schema.safeParse(input)
  if (parsedDocResult.success) {
    return sanitizeParsedResume(parsedDocResult.data)
  }

  const data = asRecord(input)
  if (!data) return null

  if (data.document && data.schema_version === "v1") {
    const docResult = OptimizedResumeDocumentV1Schema.safeParse(data.document)
    if (docResult.success) {
      return sanitizeParsedResume(docResult.data)
    }
  }

  return fromLegacyStructuredOutput(data)
}

export function normalizeStructuredOutput(
  structuredOutput: unknown,
  fallbackMarkdown?: string,
  options?: {
    migrated?: boolean
    lastEditor?: string
  }
): StructuredResumeEnvelopeV1 | null {
  const existing = StructuredResumeEnvelopeV1Schema.safeParse(structuredOutput)
  if (existing.success) {
    return existing.data
  }

  const fromStructured = fromStructuredDocument(structuredOutput)
  if (fromStructured) {
    return toStructuredDocument(fromStructured, {
      provenanceDefault: options?.migrated ? "migrated" : "extracted",
      lastEditor: options?.lastEditor,
    })
  }

  if (fallbackMarkdown) {
    const parsed = parseResumeContent(fallbackMarkdown)
    return toStructuredDocument(parsed, {
      provenanceDefault: options?.migrated ? "migrated" : "user_edited",
      lastEditor: options?.lastEditor,
    })
  }

  return null
}

export function toDerivedMarkdown(input: StructuredResumeEnvelopeV1 | OptimizedResumeDocumentV1 | ParsedResume): string {
  if ("schema_version" in input) {
    return formatResumeToMarkdown(sanitizeParsedResume(input.document))
  }

  if ("contact" in input && "workExperience" in input) {
    return formatResumeToMarkdown(sanitizeParsedResume(input as ParsedResume))
  }

  return ""
}

export function toResumeJSON(input: StructuredResumeEnvelopeV1 | ParsedResume): ResumeJSON {
  const parsed = "schema_version" in input ? sanitizeParsedResume(input.document) : sanitizeParsedResume(input)

  return {
    name: parsed.contact.name || "",
    contact: {
      location: parsed.contact.location || "",
      email: parsed.contact.email || "",
      phone: parsed.contact.phone || "",
      linkedin: parsed.contact.linkedin || parsed.contact.website || "",
    },
    headline: parsed.targetTitle || "",
    summary: parsed.summary || "",
    skills: {
      Domain: parsed.skills,
      ResearchAndValidation: [],
      ProductAndSystems: [],
      Tools: [],
    },
    experience: parsed.workExperience.map((item) => ({
      company: item.company,
      location: item.location || "",
      title: item.title,
      start_date: item.startDate || "",
      end_date: item.endDate || "",
      bullets: item.bullets || [],
    })),
    education: parsed.education.map((item) => ({
      degree: item.degree || "",
      institution: item.institution,
      notes: item.notes || item.field || item.graduationDate || "",
    })),
    certifications: parsed.certifications.map((item) => ({
      name: item.name,
      issuer: item.issuer || "",
    })),
    extras: [
      ...parsed.interests.map((value) => ({ label: "Interest", value })),
      ...parsed.awards.map((value) => ({ label: "Award", value })),
      ...parsed.projects.map((project) => ({
        label: "Project",
        value: project.name,
      })),
      ...parsed.volunteering.map((entry) => ({
        label: "Volunteering",
        value: entry.organization,
      })),
      ...parsed.publications.map((entry) => ({
        label: "Publication",
        value: entry.title,
      })),
    ],
  }
}

export function migrationAuditFromMarkdown(content: string): {
  structured: StructuredResumeEnvelopeV1
  dropped_fields_warning: string[]
} {
  const parsed = parseResumeContent(content)
  const structured = toStructuredDocument(parsed, { provenanceDefault: "migrated" })

  const warnings: string[] = []
  if (!parsed.contact.name) warnings.push("contact.name missing")
  if (parsed.workExperience.length === 0) warnings.push("workExperience empty")
  if (parsed.skills.length === 0) warnings.push("skills empty")

  return {
    structured,
    dropped_fields_warning: warnings,
  }
}
