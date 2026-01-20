"use client"

import { toast } from "sonner"
import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Copy,
  Download,
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  ChevronRight,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  Heart,
  Award,
  FolderOpen,
  Users,
  BookOpen,
  Target,
  FileEdit,
  Trash2,
  Check,
  Sparkles,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  formatContactString,
  type ParsedResume,
  type ContactInfo,
  type WorkExperienceItem,
  type EducationItem,
  type CertificationItem,
  type ProjectItem,
  type VolunteerItem,
  type PublicationItem,
} from "@/lib/resume-parser"
import {
  ContactEditDialog,
  ExperienceEditDialog,
  EducationEditDialog,
  SkillsEditDialog,
  SimpleListEditDialog,
  TextEditDialog,
  CertificationsEditDialog,
  ProjectEditDialog,
  VolunteeringEditDialog,
  PublicationEditDialog,
} from "@/components/optimization/dialogs"
import { cn } from "@/lib/utils"
import type { ModifiedSections } from "@/lib/utils/resume-merge"

// Types
type SectionId =
  | "contact"
  | "target"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "interests"
  | "certifications"
  | "awards"
  | "projects"
  | "volunteering"
  | "publications"

interface FlowResumeViewerProps {
  resumeData: ParsedResume
  matchScore?: number
  onChange: (updated: ParsedResume) => void
  highlightChanges?: boolean
  modifiedSections?: ModifiedSections
}

// Strip markdown formatting
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .trim()
}

// Section configuration
const SECTIONS = [
  { id: "contact", label: "Contact Information", icon: User, hasEdit: true },
  { id: "target", label: "Target Title", icon: Target, hasAdd: true },
  { id: "summary", label: "Professional Summary", icon: FileEdit, hasAdd: true },
  { id: "experience", label: "Work Experience", icon: Briefcase, hasAdd: true, hasMore: true },
  { id: "education", label: "Education", icon: GraduationCap, hasAdd: true, hasMore: true },
  { id: "skills", label: "Skills", icon: Wrench, hasAdd: true, hasMore: true },
  { id: "interests", label: "Interests", icon: Heart, hasAdd: true, hasMore: true },
  { id: "certifications", label: "Certifications", icon: Award, hasAdd: true, hasMore: true },
  { id: "awards", label: "Awards & Scholarships", icon: Award, hasAdd: true, hasMore: true },
  { id: "projects", label: "Projects", icon: FolderOpen, hasAdd: true, hasMore: true },
  { id: "volunteering", label: "Volunteering & Leadership", icon: Users, hasAdd: true, hasMore: true },
  { id: "publications", label: "Publications", icon: BookOpen, hasAdd: true, hasMore: true },
] as const

// Helper to get section count
function getSectionCount(parsed: ParsedResume, sectionId: string): number {
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

function hasSectionContent(parsed: ParsedResume, sectionId: string): boolean {
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

// Check if section is modified
function isSectionModified(sectionId: string, modifiedSections?: ModifiedSections): boolean {
  if (!modifiedSections) return false
  if (sectionId === "summary") return modifiedSections.summary
  if (sectionId === "experience") return modifiedSections.workExperience.size > 0
  return false
}

function isExperienceModified(company: string, modifiedSections?: ModifiedSections): boolean {
  if (!modifiedSections) return false
  return modifiedSections.workExperience.has(company)
}

// Section Content Component
function SectionContent({
  sectionId,
  parsed,
  onEditItem,
  onDeleteItem,
  highlightChanges,
  modifiedSections,
}: {
  sectionId: SectionId
  parsed: ParsedResume
  onEditItem: (sectionId: SectionId, index: number) => void
  onDeleteItem: (sectionId: SectionId, index: number) => void
  highlightChanges?: boolean
  modifiedSections?: ModifiedSections
}) {
  const isModified = highlightChanges && isSectionModified(sectionId, modifiedSections)

  switch (sectionId) {
    case "contact":
      return (
        <div className="pl-7 pr-2 pb-2 text-sm space-y-1">
          {parsed.contact.name && <p className="font-medium truncate">{parsed.contact.name}</p>}
          {parsed.contact.email && <p className="text-muted-foreground truncate">{parsed.contact.email}</p>}
          {parsed.contact.phone && <p className="text-muted-foreground truncate">{parsed.contact.phone}</p>}
          {parsed.contact.location && <p className="text-muted-foreground truncate">{parsed.contact.location}</p>}
        </div>
      )

    case "target":
      return (
        <div className="pl-7 pr-2 pb-2 text-sm">
          <p className="truncate">{parsed.targetTitle || "No target title set"}</p>
        </div>
      )

    case "summary":
      return (
        <div className={cn(
          "pl-7 pr-2 pb-2 text-sm min-w-0 relative",
          isModified && "bg-emerald-500/5 border-l-2 border-emerald-500 -ml-2 pl-9"
        )}>
          {isModified && (
            <Sparkles className="absolute left-2 top-0 w-3 h-3 text-emerald-500" />
          )}
          <p className="text-muted-foreground line-clamp-3 break-words">
            {parsed.summary || "No summary added"}
          </p>
        </div>
      )

    case "experience":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.workExperience.map((exp, idx) => {
            const expModified = highlightChanges && isExperienceModified(exp.company, modifiedSections)
            return (
              <div
                key={idx}
                className={cn(
                  "group flex items-start justify-between text-sm p-2 rounded hover:bg-muted/50 cursor-pointer min-w-0",
                  expModified && "bg-emerald-500/5 border-l-2 border-emerald-500"
                )}
                onClick={() => onEditItem("experience", idx)}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    {expModified && <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />}
                    <p className="font-medium break-words">{exp.company}</p>
                  </div>
                  <p className="text-muted-foreground text-xs break-words">{exp.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteItem("experience", idx)
                  }}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            )
          })}
        </div>
      )

    case "education":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.education.map((edu, idx) => (
            <div
              key={idx}
              className="group flex items-start justify-between text-sm p-2 rounded hover:bg-muted/50 cursor-pointer min-w-0"
              onClick={() => onEditItem("education", idx)}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-medium break-words">{edu.institution}</p>
                {edu.degree && <p className="text-muted-foreground text-xs break-words">{edu.degree}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteItem("education", idx)
                }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )

    case "skills":
      return (
        <div className="pl-7 pr-2 pb-2">
          <div className="flex flex-wrap gap-1">
            {parsed.skills.slice(0, 8).map((skill, idx) => (
              <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded">
                {stripMarkdown(skill)}
              </span>
            ))}
            {parsed.skills.length > 8 && (
              <span className="text-xs text-muted-foreground">+{parsed.skills.length - 8} more</span>
            )}
          </div>
        </div>
      )

    case "interests":
      return (
        <div className="pl-7 pr-2 pb-2 text-sm text-muted-foreground min-w-0 break-words">
          {parsed.interests.length > 0
            ? parsed.interests.slice(0, 5).map((i) => stripMarkdown(i)).join(", ") +
              (parsed.interests.length > 5 ? ` +${parsed.interests.length - 5} more` : "")
            : "No interests added"}
        </div>
      )

    case "certifications":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-1 min-w-0">
          {parsed.certifications.slice(0, 3).map((cert, idx) => (
            <p key={idx} className="text-sm text-muted-foreground break-words">{cert.name}</p>
          ))}
          {parsed.certifications.length > 3 && (
            <p className="text-xs text-muted-foreground">+{parsed.certifications.length - 3} more</p>
          )}
        </div>
      )

    case "awards":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-1 min-w-0">
          {parsed.awards.slice(0, 3).map((award, idx) => (
            <p key={idx} className="text-sm text-muted-foreground break-words">{award}</p>
          ))}
          {parsed.awards.length > 3 && (
            <p className="text-xs text-muted-foreground">+{parsed.awards.length - 3} more</p>
          )}
        </div>
      )

    case "projects":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.projects.map((project, idx) => (
            <div
              key={idx}
              className="group flex items-start justify-between text-sm p-2 rounded hover:bg-muted/50 cursor-pointer min-w-0"
              onClick={() => onEditItem("projects", idx)}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-medium break-words">{project.name}</p>
                {project.description && (
                  <p className="text-muted-foreground text-xs break-words line-clamp-1">{project.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteItem("projects", idx)
                }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )

    case "volunteering":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.volunteering.map((vol, idx) => (
            <div
              key={idx}
              className="group flex items-start justify-between text-sm p-2 rounded hover:bg-muted/50 cursor-pointer min-w-0"
              onClick={() => onEditItem("volunteering", idx)}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-medium break-words">{vol.organization}</p>
                {vol.role && <p className="text-muted-foreground text-xs break-words">{vol.role}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteItem("volunteering", idx)
                }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )

    case "publications":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.publications.map((pub, idx) => (
            <div
              key={idx}
              className="group flex items-start justify-between text-sm p-2 rounded hover:bg-muted/50 cursor-pointer min-w-0"
              onClick={() => onEditItem("publications", idx)}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-medium break-words">{pub.title}</p>
                {pub.publisher && <p className="text-muted-foreground text-xs break-words">{pub.publisher}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteItem("publications", idx)
                }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}

// Resume Preview Component
function ResumePreview({
  parsed,
  highlightChanges,
  modifiedSections,
}: {
  parsed: ParsedResume
  highlightChanges?: boolean
  modifiedSections?: ModifiedSections
}) {
  const summaryModified = highlightChanges && modifiedSections?.summary

  return (
    <div className="p-8 text-sm font-['Georgia',serif] bg-white text-black min-h-full">
      {/* Header */}
      {parsed.contact.name && (
        <h1 className="text-2xl font-bold text-emerald-700 mb-1">{parsed.contact.name}</h1>
      )}
      <p className="text-xs text-gray-600 mb-4">{formatContactString(parsed.contact)}</p>

      {/* Target Title */}
      {parsed.targetTitle && (
        <p className="font-bold mb-4">{parsed.targetTitle}</p>
      )}

      {/* Professional Summary */}
      {parsed.summary && (
        <div className={cn("mb-6", summaryModified && "relative")}>
          {summaryModified && (
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-emerald-500 rounded" />
          )}
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 border-b border-gray-200 pb-1 mb-2">
            Professional Summary
          </h2>
          <p className="text-xs leading-relaxed">{stripMarkdown(parsed.summary)}</p>
        </div>
      )}

      {/* Work Experience */}
      {parsed.workExperience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 border-b border-gray-200 pb-1 mb-2">
            Work Experience
          </h2>
          {parsed.workExperience.map((exp, idx) => {
            const expModified = highlightChanges && isExperienceModified(exp.company, modifiedSections)
            return (
              <div key={idx} className={cn("mb-3 relative", expModified && "pl-3")}>
                {expModified && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded" />
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-xs">{exp.company}</p>
                    <p className="text-xs text-gray-600">{exp.title}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : ""}
                    {exp.location && ` | ${exp.location}`}
                  </p>
                </div>
                {exp.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {exp.bullets.map((bullet, bidx) => (
                      <li key={bidx} className="text-xs flex">
                        <span className="mr-2">•</span>
                        <span>{stripMarkdown(bullet)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Education */}
      {parsed.education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 border-b border-gray-200 pb-1 mb-2">
            Education
          </h2>
          {parsed.education.map((edu, idx) => (
            <div key={idx} className="mb-2">
              <p className="font-bold text-xs">{edu.institution}</p>
              <p className="text-xs text-gray-600">
                {edu.degree}
                {edu.graduationDate && ` - ${edu.graduationDate}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {parsed.skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 border-b border-gray-200 pb-1 mb-2">
            Skills
          </h2>
          <p className="text-xs">{parsed.skills.map((s) => stripMarkdown(s)).join(" • ")}</p>
        </div>
      )}

      {/* Certifications */}
      {parsed.certifications.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 border-b border-gray-200 pb-1 mb-2">
            Certifications
          </h2>
          {parsed.certifications.map((cert, idx) => (
            <p key={idx} className="text-xs">
              {cert.name}
              {cert.issuer && ` — ${cert.issuer}`}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// Main Component
export function FlowResumeViewer({
  resumeData,
  matchScore,
  onChange,
  highlightChanges = false,
  modifiedSections,
}: FlowResumeViewerProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "contact",
    "summary",
    "experience",
    "skills",
  ])
  const [copySuccess, setCopySuccess] = useState(false)

  // Dialog states
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [targetDialogOpen, setTargetDialogOpen] = useState(false)
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false)
  const [interestsDialogOpen, setInterestsDialogOpen] = useState(false)
  const [awardsDialogOpen, setAwardsDialogOpen] = useState(false)
  const [certificationsDialogOpen, setCertificationsDialogOpen] = useState(false)
  const [editingExperienceIndex, setEditingExperienceIndex] = useState<number | null>(null)
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null)
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null)
  const [editingVolunteeringIndex, setEditingVolunteeringIndex] = useState<number | null>(null)
  const [editingPublicationIndex, setEditingPublicationIndex] = useState<number | null>(null)

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    )
  }, [])

  // Update resume data helper
  const updateResumeData = useCallback(
    (updates: Partial<ParsedResume>) => {
      const updated = { ...resumeData, ...updates }
      onChange(updated)
    },
    [resumeData, onChange]
  )

  // Handle edit item
  const handleEditItem = useCallback((sectionId: SectionId, index: number) => {
    switch (sectionId) {
      case "experience":
        setEditingExperienceIndex(index)
        break
      case "education":
        setEditingEducationIndex(index)
        break
      case "projects":
        setEditingProjectIndex(index)
        break
      case "volunteering":
        setEditingVolunteeringIndex(index)
        break
      case "publications":
        setEditingPublicationIndex(index)
        break
    }
  }, [])

  // Handle delete item
  const handleDeleteItem = useCallback(
    (sectionId: SectionId, index: number) => {
      switch (sectionId) {
        case "experience":
          updateResumeData({
            workExperience: resumeData.workExperience.filter((_, i) => i !== index),
          })
          break
        case "education":
          updateResumeData({
            education: resumeData.education.filter((_, i) => i !== index),
          })
          break
        case "projects":
          updateResumeData({
            projects: resumeData.projects.filter((_, i) => i !== index),
          })
          break
        case "volunteering":
          updateResumeData({
            volunteering: resumeData.volunteering.filter((_, i) => i !== index),
          })
          break
        case "publications":
          updateResumeData({
            publications: resumeData.publications.filter((_, i) => i !== index),
          })
          break
      }
    },
    [resumeData, updateResumeData]
  )

  // Handle add item for a section
  const handleAddItem = useCallback((sectionId: SectionId) => {
    switch (sectionId) {
      case "target":
        setTargetDialogOpen(true)
        break
      case "summary":
        setSummaryDialogOpen(true)
        break
      case "experience":
        setEditingExperienceIndex(-1) // -1 means new item
        break
      case "education":
        setEditingEducationIndex(-1)
        break
      case "skills":
        setSkillsDialogOpen(true)
        break
      case "interests":
        setInterestsDialogOpen(true)
        break
      case "certifications":
        setCertificationsDialogOpen(true)
        break
      case "awards":
        setAwardsDialogOpen(true)
        break
      case "projects":
        setEditingProjectIndex(-1)
        break
      case "volunteering":
        setEditingVolunteeringIndex(-1)
        break
      case "publications":
        setEditingPublicationIndex(-1)
        break
    }
  }, [])

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      const textParts: string[] = []
      if (resumeData.contact.name) {
        textParts.push(resumeData.contact.name.toUpperCase())
        textParts.push(formatContactString(resumeData.contact))
        textParts.push("")
      }
      if (resumeData.summary) {
        textParts.push("PROFESSIONAL SUMMARY")
        textParts.push(stripMarkdown(resumeData.summary))
        textParts.push("")
      }
      if (resumeData.workExperience.length > 0) {
        textParts.push("WORK EXPERIENCE")
        resumeData.workExperience.forEach((exp) => {
          textParts.push(`${exp.company} - ${exp.title}`)
          exp.bullets.forEach((b) => textParts.push(`• ${stripMarkdown(b)}`))
          textParts.push("")
        })
      }
      if (resumeData.education.length > 0) {
        textParts.push("EDUCATION")
        resumeData.education.forEach((edu) => {
          textParts.push(`${edu.institution}${edu.degree ? ` - ${edu.degree}` : ""}`)
        })
        textParts.push("")
      }
      if (resumeData.skills.length > 0) {
        textParts.push("SKILLS")
        textParts.push(resumeData.skills.map((s) => stripMarkdown(s)).join(" • "))
      }

      await navigator.clipboard.writeText(textParts.join("\n"))
      setCopySuccess(true)
      toast.success("Resume copied to clipboard")
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      toast.error("Failed to copy resume")
    }
  }, [resumeData])

  // Match score color
  const matchScoreColor = useMemo(() => {
    if (!matchScore) return "text-muted-foreground"
    if (matchScore >= 80) return "text-emerald-600"
    if (matchScore >= 60) return "text-amber-600"
    return "text-red-600"
  }, [matchScore])

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h3 className="font-semibold truncate">
                {resumeData.contact.name || "Optimized Resume"}
              </h3>
              {matchScore !== undefined && (
                <p className="text-sm">
                  Match: <span className={cn("font-medium", matchScoreColor)}>{matchScore}%</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copySuccess ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-0">
          <div className="flex h-[600px]">
            {/* Left Panel - Sections List */}
            <div className="w-[340px] border-r">
              <ScrollArea className="h-full">
                <div className="py-2">
                  {SECTIONS.map((section) => {
                    const isExpanded = expandedSections.includes(section.id)
                    const hasContent = hasSectionContent(resumeData, section.id)
                    const count = getSectionCount(resumeData, section.id)
                    const sectionConfig = SECTIONS.find((s) => s.id === section.id)
                    const isModified = highlightChanges && isSectionModified(section.id, modifiedSections)

                    return (
                      <div key={section.id} className="border-b last:border-b-0">
                        {/* Section Header */}
                        <div
                          className={cn(
                            "flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors",
                            isModified && "bg-emerald-500/5"
                          )}
                          onClick={() => toggleSection(section.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                                isExpanded && "rotate-90"
                              )}
                            />
                            <section.icon className={cn(
                              "h-4 w-4 shrink-0",
                              isModified ? "text-emerald-500" : "text-muted-foreground"
                            )} />
                            <span className={cn(
                              "text-sm font-medium truncate",
                              isModified && "text-emerald-600 dark:text-emerald-400"
                            )}>
                              {section.label}
                            </span>
                            {count > 0 && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                {count}
                              </span>
                            )}
                            {isModified && (
                              <Sparkles className="h-3 w-3 text-emerald-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {"hasEdit" in section && section.hasEdit && section.id === "contact" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setContactDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            {sectionConfig && "hasAdd" in sectionConfig && sectionConfig.hasAdd && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddItem(section.id as SectionId)
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Section Content */}
                        {isExpanded && hasContent && (
                          <SectionContent
                            sectionId={section.id as SectionId}
                            parsed={resumeData}
                            onEditItem={handleEditItem}
                            onDeleteItem={handleDeleteItem}
                            highlightChanges={highlightChanges}
                            modifiedSections={modifiedSections}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <Card className="shadow-lg">
                    <ResumePreview
                      parsed={resumeData}
                      highlightChanges={highlightChanges}
                      modifiedSections={modifiedSections}
                    />
                  </Card>
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialogs */}
      <ContactEditDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        contact={resumeData.contact}
        onSave={(contact) => updateResumeData({ contact })}
      />

      <TextEditDialog
        open={targetDialogOpen}
        onOpenChange={setTargetDialogOpen}
        title="Edit Target Title"
        label="Target Title"
        value={resumeData.targetTitle || ""}
        onSave={(targetTitle) => updateResumeData({ targetTitle })}
      />

      <TextEditDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
        title="Edit Professional Summary"
        label="Summary"
        value={resumeData.summary || ""}
        multiline
        maxLength={500}
        onSave={(summary) => updateResumeData({ summary })}
      />

      <SkillsEditDialog
        open={skillsDialogOpen}
        onOpenChange={setSkillsDialogOpen}
        skills={resumeData.skills}
        onSave={(skills) => updateResumeData({ skills })}
      />

      <SimpleListEditDialog
        open={interestsDialogOpen}
        onOpenChange={setInterestsDialogOpen}
        title="Edit Interests"
        items={resumeData.interests}
        onSave={(interests) => updateResumeData({ interests })}
        placeholder="Enter interest..."
      />

      <SimpleListEditDialog
        open={awardsDialogOpen}
        onOpenChange={setAwardsDialogOpen}
        title="Edit Awards & Scholarships"
        items={resumeData.awards}
        onSave={(awards) => updateResumeData({ awards })}
        placeholder="Enter award..."
      />

      <CertificationsEditDialog
        open={certificationsDialogOpen}
        onOpenChange={setCertificationsDialogOpen}
        certifications={resumeData.certifications}
        onSave={(certifications) => updateResumeData({ certifications })}
      />

      {editingExperienceIndex !== null && (
        <ExperienceEditDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingExperienceIndex(null)
          }}
          experience={
            editingExperienceIndex === -1
              ? { company: "", title: "", bullets: [] }
              : resumeData.workExperience[editingExperienceIndex]
          }
          onSave={(exp) => {
            if (editingExperienceIndex === -1) {
              updateResumeData({ workExperience: [...resumeData.workExperience, exp] })
            } else {
              const updated = [...resumeData.workExperience]
              updated[editingExperienceIndex] = exp
              updateResumeData({ workExperience: updated })
            }
            setEditingExperienceIndex(null)
          }}
        />
      )}

      {editingEducationIndex !== null && (
        <EducationEditDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingEducationIndex(null)
          }}
          education={
            editingEducationIndex === -1
              ? { institution: "" }
              : resumeData.education[editingEducationIndex]
          }
          onSave={(edu) => {
            if (editingEducationIndex === -1) {
              updateResumeData({ education: [...resumeData.education, edu] })
            } else {
              const updated = [...resumeData.education]
              updated[editingEducationIndex] = edu
              updateResumeData({ education: updated })
            }
            setEditingEducationIndex(null)
          }}
        />
      )}

      {editingProjectIndex !== null && (
        <ProjectEditDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingProjectIndex(null)
          }}
          project={
            editingProjectIndex === -1
              ? { name: "", bullets: [] }
              : resumeData.projects[editingProjectIndex]
          }
          onSave={(project) => {
            if (editingProjectIndex === -1) {
              updateResumeData({ projects: [...resumeData.projects, project] })
            } else {
              const updated = [...resumeData.projects]
              updated[editingProjectIndex] = project
              updateResumeData({ projects: updated })
            }
            setEditingProjectIndex(null)
          }}
        />
      )}

      {editingVolunteeringIndex !== null && (
        <VolunteeringEditDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingVolunteeringIndex(null)
          }}
          volunteering={
            editingVolunteeringIndex === -1
              ? { organization: "" }
              : resumeData.volunteering[editingVolunteeringIndex]
          }
          onSave={(vol) => {
            if (editingVolunteeringIndex === -1) {
              updateResumeData({ volunteering: [...resumeData.volunteering, vol] })
            } else {
              const updated = [...resumeData.volunteering]
              updated[editingVolunteeringIndex] = vol
              updateResumeData({ volunteering: updated })
            }
            setEditingVolunteeringIndex(null)
          }}
        />
      )}

      {editingPublicationIndex !== null && (
        <PublicationEditDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingPublicationIndex(null)
          }}
          publication={
            editingPublicationIndex === -1
              ? { title: "" }
              : resumeData.publications[editingPublicationIndex]
          }
          onSave={(pub) => {
            if (editingPublicationIndex === -1) {
              updateResumeData({ publications: [...resumeData.publications, pub] })
            } else {
              const updated = [...resumeData.publications]
              updated[editingPublicationIndex] = pub
              updateResumeData({ publications: updated })
            }
            setEditingPublicationIndex(null)
          }}
        />
      )}
    </>
  )
}
