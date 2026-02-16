import type { LucideIcon } from "lucide-react"
import type { ParsedResume, ContactInfo, WorkExperienceItem, EducationItem, ProjectItem, VolunteerItem, PublicationItem } from "@/lib/resume-parser"
import type { StructuredResumeMetadataV1 } from "@/lib/optimized-resume-document"

export type SectionId = "contact" | "target" | "summary" | "experience" | "education" | "skills" | "interests" | "certifications" | "awards" | "projects" | "volunteering" | "publications"

export type SaveStatus = "saved" | "saving" | "unsaved" | "conflict"

export interface SectionConfig {
  id: SectionId
  label: string
  icon: LucideIcon
  hasEdit?: boolean
  hasAdd?: boolean
  hasMore?: boolean
}

export interface ResumeViewerV2Props {
  optimizedId: string
  title: string
  optimizedContent: string
  structuredOutput?: unknown
  revisionToken?: string
  matchScore?: number | null
  optimizationSummary?: unknown
  jobTitle?: string
  companyName?: string | null
  jobDescription?: string | null
}

export interface DialogState {
  type: SectionId | null
  index: number | null
  isNew: boolean
}

export interface SectionContentProps {
  sectionId: SectionId
  parsed: ParsedResume
  onEditItem: (sectionId: SectionId, index: number) => void
  onDeleteItem: (sectionId: SectionId, index: number) => void
}

export interface SectionsListProps {
  parsed: ParsedResume
  metadata?: StructuredResumeMetadataV1
  expandedSections: string[]
  onToggle: (section: string) => void
  onEdit: (sectionId: SectionId) => void
  onAdd: (sectionId: SectionId) => void
  onEditItem: (sectionId: SectionId, index: number) => void
  onDeleteItem: (sectionId: SectionId, index: number) => void
}

export interface ResumePreviewProps {
  parsed: ParsedResume
  rawContent?: string
}

// Re-export parser types for convenience
export type { ParsedResume, ContactInfo, WorkExperienceItem, EducationItem, ProjectItem, VolunteerItem, PublicationItem }
