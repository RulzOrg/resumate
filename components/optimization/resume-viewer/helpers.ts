import type { ParsedResume } from "@/lib/resume-parser"

export function classifyMatch(score?: number | null) {
  const s = typeof score === "number" ? score : null
  if (s === null) return { label: "N/A", className: "text-foreground/70" }
  if (s === 0) return { label: `${s}%`, className: "text-red-500" }
  if (s < 60) return { label: `${s}%`, className: "text-amber-500" }
  return { label: `${s}%`, className: "text-emerald-500" }
}

export function normalizeRevisionToken(value: unknown): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export function getSectionCount(parsed: ParsedResume, sectionId: string): number {
  switch (sectionId) {
    case "experience": return parsed.workExperience.length
    case "education": return parsed.education.length
    case "skills": return parsed.skills.length
    case "interests": return parsed.interests.length
    case "certifications": return parsed.certifications.length
    case "awards": return parsed.awards.length
    case "projects": return parsed.projects.length
    case "volunteering": return parsed.volunteering.length
    case "publications": return parsed.publications.length
    default: return 0
  }
}

export function hasSectionContent(parsed: ParsedResume, sectionId: string): boolean {
  switch (sectionId) {
    case "contact": return !!parsed.contact.name
    case "target": return !!parsed.targetTitle
    case "summary": return !!parsed.summary
    case "experience": return parsed.workExperience.length > 0
    case "education": return parsed.education.length > 0
    case "skills": return parsed.skills.length > 0
    case "interests": return parsed.interests.length > 0
    case "certifications": return parsed.certifications.length > 0
    case "awards": return parsed.awards.length > 0
    case "projects": return parsed.projects.length > 0
    case "volunteering": return parsed.volunteering.length > 0
    case "publications": return parsed.publications.length > 0
    default: return false
  }
}
