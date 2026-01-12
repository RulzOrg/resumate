"use client"

import { toast } from "sonner"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
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
  Save,
  Loader2,
  Check,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  parseResumeContent,
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
} from "./dialogs"
import { cn } from "@/lib/utils"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { usePlatform } from "@/hooks/use-platform"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Kbd } from "@/components/keyboard-shortcuts/kbd"

/**
 * Strip markdown formatting from text
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold **text**
    .replace(/\*([^*]+)\*/g, '$1')     // Remove italic *text*
    .replace(/__([^_]+)__/g, '$1')     // Remove bold __text__
    .replace(/_([^_]+)_/g, '$1')       // Remove italic _text_
    .replace(/`([^`]+)`/g, '$1')       // Remove code `text`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url)
    .replace(/^#+\s*/gm, '')           // Remove headers
    .replace(/^[-*+]\s+/gm, '')        // Remove list markers
    .trim()
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Convert markdown to HTML (preserves bold, italic, etc.)
 */
function markdownToHtml(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold **text**
    .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Italic *text*
    .replace(/__([^_]+)__/g, '<strong>$1</strong>') // Bold __text__
    .replace(/_([^_]+)_/g, '<em>$1</em>') // Italic _text_
    .replace(/`([^`]+)`/g, '<code>$1</code>') // Code `text`
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>') // Links [text](url)
}

/**
 * Format resume as HTML suitable for Word documents (preserves formatting)
 */
function formatResumeForWord(parsed: ParsedResume): { html: string; text: string } {
  const htmlParts: string[] = []
  const textParts: string[] = []
  
  // Add basic styling for Word compatibility
  htmlParts.push('<div style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5;">')

  // Header
  if (parsed.contact.name) {
    const name = escapeHtml(parsed.contact.name.toUpperCase())
    htmlParts.push(`<h1 style="font-size: 18pt; font-weight: bold; margin-bottom: 6pt; margin-top: 0;">${name}</h1>`)
    textParts.push(parsed.contact.name.toUpperCase())
    textParts.push('')
  }

  // Contact info
  const contactInfo = formatContactString(parsed.contact)
  if (contactInfo) {
    htmlParts.push(`<p style="margin-top: 0; margin-bottom: 12pt; font-size: 10pt;">${escapeHtml(contactInfo)}</p>`)
    textParts.push(contactInfo)
    textParts.push('')
  }

  // Target Title
  if (parsed.targetTitle) {
    htmlParts.push(`<p style="font-size: 12pt; font-weight: bold; margin-bottom: 12pt; margin-top: 0;">${escapeHtml(parsed.targetTitle)}</p>`)
    textParts.push(parsed.targetTitle)
    textParts.push('')
  }

  // Professional Summary
  if (parsed.summary) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">PROFESSIONAL SUMMARY</h2>')
    htmlParts.push(`<p style="margin-top: 0; margin-bottom: 12pt;">${markdownToHtml(escapeHtml(stripMarkdown(parsed.summary)))}</p>`)
    textParts.push('PROFESSIONAL SUMMARY')
    textParts.push('─'.repeat(50))
    textParts.push(stripMarkdown(parsed.summary))
    textParts.push('')
  }

  // Work Experience
  if (parsed.workExperience.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">WORK EXPERIENCE</h2>')
    textParts.push('WORK EXPERIENCE')
    textParts.push('─'.repeat(50))
    
    parsed.workExperience.forEach((exp) => {
      const company = escapeHtml(exp.company || exp.title || 'Position')
      const subtitleParts: string[] = []
      if (exp.title && exp.company) subtitleParts.push(exp.title)
      if (exp.startDate && exp.endDate) subtitleParts.push(`${exp.startDate} - ${exp.endDate}`)
      if (exp.location) subtitleParts.push(exp.location)
      
      htmlParts.push(`<p style="margin-top: 6pt; margin-bottom: 2pt;"><strong style="font-size: 11pt;">${company}</strong></p>`)
      if (subtitleParts.length > 0) {
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt; font-size: 10pt;">${escapeHtml(subtitleParts.join(' • '))}</p>`)
      }
      
      if (exp.bullets.length > 0) {
        htmlParts.push('<ul style="margin-top: 4pt; margin-bottom: 12pt; padding-left: 20pt;">')
        exp.bullets.forEach((bullet) => {
          const bulletText = markdownToHtml(escapeHtml(stripMarkdown(bullet)))
          htmlParts.push(`<li style="margin-bottom: 2pt; font-size: 10pt;">${bulletText}</li>`)
        })
        htmlParts.push('</ul>')
      } else {
        htmlParts.push('<p style="margin-bottom: 12pt;"></p>')
      }
      
      textParts.push(company)
      if (subtitleParts.length > 0) {
        textParts.push(subtitleParts.join(' • '))
      }
      if (exp.bullets.length > 0) {
        exp.bullets.forEach((bullet) => {
          textParts.push(`  • ${stripMarkdown(bullet)}`)
        })
      }
      textParts.push('')
    })
  }

  // Education
  if (parsed.education.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">EDUCATION</h2>')
    textParts.push('EDUCATION')
    textParts.push('─'.repeat(50))
    
    parsed.education.forEach((edu) => {
      const eduParts: string[] = []
      if (edu.institution) eduParts.push(edu.institution)
      if (edu.degree) eduParts.push(edu.degree)
      if (edu.graduationDate) eduParts.push(edu.graduationDate)
      const eduText = escapeHtml(eduParts.join(' • '))
      htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt;"><strong>${escapeHtml(edu.institution || '')}</strong>${edu.degree ? ` - ${escapeHtml(edu.degree)}` : ''}${edu.graduationDate ? ` - ${escapeHtml(edu.graduationDate)}` : ''}</p>`)
      textParts.push(eduParts.join(' • '))
    })
    htmlParts.push('<p style="margin-bottom: 12pt;"></p>')
    textParts.push('')
  }

  // Skills
  if (parsed.skills.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">SKILLS</h2>')
    const skillsText = parsed.skills.map(s => escapeHtml(stripMarkdown(s))).join(' • ')
    htmlParts.push(`<p style="margin-top: 0; margin-bottom: 12pt;">${skillsText}</p>`)
    textParts.push('SKILLS')
    textParts.push('─'.repeat(50))
    textParts.push(parsed.skills.map(s => stripMarkdown(s)).join(' • '))
    textParts.push('')
  }

  // Certifications
  if (parsed.certifications.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">CERTIFICATIONS</h2>')
    parsed.certifications.forEach((cert) => {
      const certName = escapeHtml(stripMarkdown(cert.name))
      if (cert.issuer) {
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt;">${certName} — ${escapeHtml(stripMarkdown(cert.issuer))}</p>`)
      } else {
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt;">${certName}</p>`)
      }
    })
    htmlParts.push('<p style="margin-bottom: 12pt;"></p>')
    textParts.push('CERTIFICATIONS')
    textParts.push('─'.repeat(50))
    parsed.certifications.forEach((cert) => {
      const certLine = stripMarkdown(cert.name)
      if (cert.issuer) {
        textParts.push(`${certLine} — ${stripMarkdown(cert.issuer)}`)
      } else {
        textParts.push(certLine)
      }
    })
    textParts.push('')
  }

  // Projects
  if (parsed.projects.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">PROJECTS</h2>')
    parsed.projects.forEach((project) => {
      htmlParts.push(`<p style="margin-top: 0; margin-bottom: 2pt;"><strong>${escapeHtml(stripMarkdown(project.name))}</strong></p>`)
      if (project.description) {
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt; font-size: 10pt;">${escapeHtml(stripMarkdown(project.description))}</p>`)
      }
      if (project.bullets.length > 0) {
        htmlParts.push('<ul style="margin-top: 4pt; margin-bottom: 12pt; padding-left: 20pt;">')
        project.bullets.forEach((bullet) => {
          const bulletText = markdownToHtml(escapeHtml(stripMarkdown(bullet)))
          htmlParts.push(`<li style="margin-bottom: 2pt; font-size: 10pt;">${bulletText}</li>`)
        })
        htmlParts.push('</ul>')
      } else {
        htmlParts.push('<p style="margin-bottom: 12pt;"></p>')
      }
    })
    textParts.push('PROJECTS')
    textParts.push('─'.repeat(50))
    parsed.projects.forEach((project) => {
      textParts.push(stripMarkdown(project.name))
      if (project.description) {
        textParts.push(`  ${stripMarkdown(project.description)}`)
      }
      if (project.bullets.length > 0) {
        project.bullets.forEach((bullet) => {
          textParts.push(`  • ${stripMarkdown(bullet)}`)
        })
      }
      textParts.push('')
    })
  }

  // Awards
  if (parsed.awards.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">AWARDS & SCHOLARSHIPS</h2>')
    htmlParts.push('<ul style="margin-top: 0; margin-bottom: 12pt; padding-left: 20pt;">')
    parsed.awards.forEach((award) => {
      htmlParts.push(`<li style="margin-bottom: 2pt;">${escapeHtml(stripMarkdown(award))}</li>`)
    })
    htmlParts.push('</ul>')
    textParts.push('AWARDS & SCHOLARSHIPS')
    textParts.push('─'.repeat(50))
    parsed.awards.forEach((award) => {
      textParts.push(`  • ${stripMarkdown(award)}`)
    })
    textParts.push('')
  }

  // Volunteering
  if (parsed.volunteering.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">VOLUNTEERING & LEADERSHIP</h2>')
    parsed.volunteering.forEach((vol) => {
      htmlParts.push(`<p style="margin-top: 0; margin-bottom: 2pt;"><strong>${escapeHtml(vol.organization)}</strong></p>`)
      if (vol.role) htmlParts.push(`<p style="margin-top: 0; margin-bottom: 2pt; font-size: 10pt;">${escapeHtml(vol.role)}</p>`)
      if (vol.dates) htmlParts.push(`<p style="margin-top: 0; margin-bottom: 8pt; font-size: 10pt;">${escapeHtml(vol.dates)}</p>`)
    })
    htmlParts.push('<p style="margin-bottom: 12pt;"></p>')
    textParts.push('VOLUNTEERING & LEADERSHIP')
    textParts.push('─'.repeat(50))
    parsed.volunteering.forEach((vol) => {
      textParts.push(vol.organization)
      if (vol.role) textParts.push(`  ${vol.role}`)
      if (vol.dates) textParts.push(`  ${vol.dates}`)
      textParts.push('')
    })
  }

  // Publications
  if (parsed.publications.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">PUBLICATIONS</h2>')
    parsed.publications.forEach((pub) => {
      const pubTitle = escapeHtml(stripMarkdown(pub.title))
      if (pub.publisher) {
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt;">${pubTitle} — ${escapeHtml(stripMarkdown(pub.publisher))}</p>`)
      } else {
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt;">${pubTitle}</p>`)
      }
    })
    htmlParts.push('<p style="margin-bottom: 12pt;"></p>')
    textParts.push('PUBLICATIONS')
    textParts.push('─'.repeat(50))
    parsed.publications.forEach((pub) => {
      const pubLine = stripMarkdown(pub.title)
      if (pub.publisher) {
        textParts.push(`${pubLine} — ${stripMarkdown(pub.publisher)}`)
      } else {
        textParts.push(pubLine)
      }
    })
    textParts.push('')
  }

  // Interests
  if (parsed.interests.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">INTERESTS</h2>')
    const interestsText = parsed.interests.map(i => escapeHtml(stripMarkdown(i))).join(' • ')
    htmlParts.push(`<p style="margin-top: 0; margin-bottom: 12pt;">${interestsText}</p>`)
    textParts.push('INTERESTS')
    textParts.push('─'.repeat(50))
    textParts.push(parsed.interests.map(i => stripMarkdown(i)).join(' • '))
  }

  htmlParts.push('</div>')

  return {
    html: htmlParts.join(''),
    text: textParts.join('\n')
  }
}

interface ResumeViewerV2Props {
  optimizedId: string
  title: string
  optimizedContent: string
  matchScore?: number | null
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

type SectionId = (typeof SECTIONS)[number]["id"]

function classifyMatch(score?: number | null) {
  const s = typeof score === "number" ? score : null
  if (s === null) return { label: "N/A", className: "text-foreground/70" }
  if (s === 0) return { label: `${s}%`, className: "text-red-500" }
  if (s < 60) return { label: `${s}%`, className: "text-amber-500" }
  return { label: `${s}%`, className: "text-emerald-500" }
}

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

// Accordion Section Content Component
function SectionContent({
  sectionId,
  parsed,
  onEditItem,
  onDeleteItem,
}: {
  sectionId: SectionId
  parsed: ParsedResume
  onEditItem: (sectionId: SectionId, index: number) => void
  onDeleteItem: (sectionId: SectionId, index: number) => void
}) {
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
        <div className="pl-7 pr-2 pb-2 text-sm min-w-0">
          <p className="text-muted-foreground line-clamp-3 break-words">
            {parsed.summary || "No summary added"}
          </p>
        </div>
      )

    case "experience":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.workExperience.map((exp, idx) => (
            <div
              key={idx}
              className="group flex items-start justify-between text-sm p-2 rounded hover:bg-muted/50 cursor-pointer min-w-0"
              onClick={() => onEditItem("experience", idx)}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-medium break-words">{exp.company}</p>
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
          ))}
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
                {edu.degree && (
                  <p className="text-muted-foreground text-xs break-words">{edu.degree}</p>
                )}
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
              <span
                key={idx}
                className="text-xs bg-muted px-2 py-0.5 rounded"
              >
                {stripMarkdown(skill)}
              </span>
            ))}
            {parsed.skills.length > 8 && (
              <span className="text-xs text-muted-foreground">
                +{parsed.skills.length - 8} more
              </span>
            )}
          </div>
        </div>
      )

    case "interests":
      return (
        <div className="pl-7 pr-2 pb-2 text-sm text-muted-foreground min-w-0 break-words">
          {parsed.interests.length > 0
            ? parsed.interests.slice(0, 5).map(i => stripMarkdown(i)).join(", ") +
              (parsed.interests.length > 5 ? ` +${parsed.interests.length - 5} more` : "")
            : "No interests added"}
        </div>
      )

    case "certifications":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-1 min-w-0">
          {parsed.certifications.slice(0, 3).map((cert, idx) => (
            <p key={idx} className="text-sm text-muted-foreground break-words">
              {cert.name}
            </p>
          ))}
          {parsed.certifications.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{parsed.certifications.length - 3} more
            </p>
          )}
        </div>
      )

    case "awards":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-1 min-w-0">
          {parsed.awards.slice(0, 3).map((award, idx) => (
            <p key={idx} className="text-sm text-muted-foreground break-words">
              {award}
            </p>
          ))}
          {parsed.awards.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{parsed.awards.length - 3} more
            </p>
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
                  <p className="text-muted-foreground text-xs break-words line-clamp-1">
                    {project.description}
                  </p>
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
                {vol.role && (
                  <p className="text-muted-foreground text-xs break-words">
                    {vol.role}
                  </p>
                )}
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
                {pub.publisher && (
                  <p className="text-muted-foreground text-xs break-words">
                    {pub.publisher}
                  </p>
                )}
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

// Sections List Component (Left Panel)
function SectionsList({
  parsed,
  expandedSections,
  onToggle,
  onEdit,
  onAdd,
  onEditItem,
  onDeleteItem,
}: {
  parsed: ParsedResume
  expandedSections: string[]
  onToggle: (section: string) => void
  onEdit: (sectionId: SectionId) => void
  onAdd: (sectionId: SectionId) => void
  onEditItem: (sectionId: SectionId, index: number) => void
  onDeleteItem: (sectionId: SectionId, index: number) => void
}) {
  return (
    <div className="space-y-0.5 w-full min-w-0">
      {SECTIONS.map((section) => {
        const hasContent = hasSectionContent(parsed, section.id)
        const count = getSectionCount(parsed, section.id)
        const Icon = section.icon
        const isExpanded = expandedSections.includes(section.id)

        return (
          <div key={section.id} className="w-full overflow-hidden">
            <div
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors cursor-pointer w-full overflow-hidden",
                hasContent ? "hover:bg-muted/50" : "opacity-60 hover:opacity-80",
                isExpanded && "bg-muted/50"
              )}
              onClick={() => onToggle(section.id)}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                  isExpanded && "rotate-90"
                )}
              />
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate flex-1 min-w-0 pr-2">{section.label}</span>
              {count > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {count}
                </span>
              )}

              <div
                className="flex items-center gap-0.5 shrink-0 ml-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {'hasEdit' in section && section.hasEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onEdit(section.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {'hasAdd' in section && section.hasAdd && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onAdd(section.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
                {'hasMore' in section && section.hasMore && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(section.id)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit All
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAdd(section.id)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add New
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Accordion Content */}
            {isExpanded && (
              <div className="overflow-hidden w-full min-w-0">
                <div className="w-full min-w-0 overflow-x-hidden">
                  <SectionContent
                    sectionId={section.id}
                    parsed={parsed}
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// PDF Preview Component (Right Panel)
function ResumePreview({ parsed, rawContent }: { parsed: ParsedResume; rawContent?: string }) {
  // Check if content is essentially empty
  const isEmpty = !parsed.contact.name && 
                  !parsed.summary && 
                  parsed.workExperience.length === 0 && 
                  parsed.skills.length === 0

  if (isEmpty && rawContent) {
    // Show raw content as fallback if parsing failed
    return (
      <div className="bg-white rounded-lg shadow-xl p-8 md:p-10 min-h-[900px] text-gray-900">
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ Resume parsing encountered issues. Showing raw content below.
          </p>
        </div>
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
          {rawContent}
        </pre>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-8 md:p-10 min-h-[900px] text-gray-900 font-['Georgia',serif]">
      {/* Header */}
      <div className="mb-5 border-b-2 border-primary pb-4">
        <h1 className="text-2xl font-bold text-primary tracking-wide">
          {parsed.contact.name || "Your Name"}
        </h1>

        {/* Contact Info Line */}
        <p className="text-xs text-gray-600 mt-1.5 tracking-wide">
          {formatContactString(parsed.contact)}
        </p>
      </div>

      {/* Target Title */}
      {parsed.targetTitle && (
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            {parsed.targetTitle}
          </h2>
        </div>
      )}

      {/* Professional Summary */}
      {parsed.summary && (
        <div className="mb-5">
          <p className="text-xs text-gray-700 leading-relaxed">
            {stripMarkdown(parsed.summary)}
          </p>
        </div>
      )}

      {/* Work Experience */}
      {parsed.workExperience.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">
            Work Experience
          </h2>

          {parsed.workExperience.map((exp, idx) => (
            <div key={idx} className="mb-4 last:mb-0">
              <div className="flex justify-between items-start mb-0.5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{exp.company}</h3>
                  <p className="text-xs text-gray-700">
                    {exp.title}
                    {exp.employmentType && ` · ${exp.employmentType}`}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>
                    {exp.startDate && exp.endDate
                      ? `${exp.startDate} - ${exp.endDate}`
                      : ""}
                  </p>
                  {exp.location && <p>{exp.location}</p>}
                </div>
              </div>

              {exp.bullets.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {exp.bullets.map((bullet, bIdx) => (
                    <li
                      key={bIdx}
                      className="text-xs text-gray-700 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
                    >
                      {stripMarkdown(bullet)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {parsed.education.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">
            Education
          </h2>

          {parsed.education.map((edu, idx) => (
            <div key={idx} className="mb-2 last:mb-0">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {edu.institution}
                  </h3>
                  {edu.degree && (
                    <p className="text-xs text-gray-700">{edu.degree}</p>
                  )}
                  {edu.field && (
                    <p className="text-xs text-gray-600">{edu.field}</p>
                  )}
                </div>
                {edu.graduationDate && (
                  <p className="text-xs text-gray-600">{edu.graduationDate}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {parsed.skills.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Skills
          </h2>
          <p className="text-xs text-gray-700">
            {parsed.skills.map(s => stripMarkdown(s)).join(" · ")}
          </p>
        </div>
      )}

      {/* Certifications */}
      {parsed.certifications.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Certifications
          </h2>
          <ul className="space-y-0.5">
            {parsed.certifications.map((cert, idx) => (
              <li key={idx} className="text-xs text-gray-700">
                {stripMarkdown(cert.name)}
                {cert.issuer && (
                  <span className="text-gray-500"> — {stripMarkdown(cert.issuer)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Projects */}
      {parsed.projects.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Projects
          </h2>
          {parsed.projects.map((project, idx) => (
            <div key={idx} className="mb-2 last:mb-0">
              <h3 className="text-sm font-bold text-gray-900">{stripMarkdown(project.name)}</h3>
              {project.description && (
                <p className="text-xs text-gray-600">{stripMarkdown(project.description)}</p>
              )}
              {project.bullets.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {project.bullets.map((bullet, bIdx) => (
                    <li
                      key={bIdx}
                      className="text-xs text-gray-700 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
                    >
                      {stripMarkdown(bullet)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Awards */}
      {parsed.awards.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Awards & Scholarships
          </h2>
          <ul className="space-y-0.5">
            {parsed.awards.map((award, idx) => (
              <li
                key={idx}
                className="text-xs text-gray-700 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
              >
                {stripMarkdown(award)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Volunteering */}
      {parsed.volunteering.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Volunteering & Leadership
          </h2>
          {parsed.volunteering.map((vol, idx) => (
            <div key={idx} className="mb-1.5 last:mb-0">
              <h3 className="text-sm font-bold text-gray-900">
                {vol.organization}
              </h3>
              {vol.role && <p className="text-xs text-gray-700">{vol.role}</p>}
              {vol.dates && <p className="text-xs text-gray-500">{vol.dates}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Publications */}
      {parsed.publications.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Publications
          </h2>
          <ul className="space-y-0.5">
            {parsed.publications.map((pub, idx) => (
              <li key={idx} className="text-xs text-gray-700">
                {stripMarkdown(pub.title)}
                {pub.publisher && (
                  <span className="text-gray-500"> — {stripMarkdown(pub.publisher)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interests */}
      {parsed.interests.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Interests
          </h2>
          <p className="text-xs text-gray-700">{parsed.interests.map(i => stripMarkdown(i)).join(" · ")}</p>
        </div>
      )}
    </div>
  )
}

// A4 page constants for pagination
const A4_HEIGHT = 1131  // A4 height at 800px width (aspect ratio 1:1.414)

// Paginated Resume Preview Component - splits content into A4 pages
function PaginatedResumePreview({
  parsed,
  rawContent
}: {
  parsed: ParsedResume
  rawContent?: string
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(1)
  const [contentHeight, setContentHeight] = useState(0)

  // Measure content height after render
  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight
      setContentHeight(height)
      const pages = Math.max(1, Math.ceil(height / A4_HEIGHT))
      setPageCount(pages)
    }
  }, [parsed, rawContent])

  // Check if content is essentially empty
  const isEmpty = !parsed.contact.name &&
                  !parsed.summary &&
                  parsed.workExperience.length === 0 &&
                  parsed.skills.length === 0

  // Render the resume content (used for both measurement and display)
  const ResumeContent = ({ forMeasurement = false }: { forMeasurement?: boolean }) => {
    if (isEmpty && rawContent) {
      return (
        <div className="p-8 md:p-10 text-gray-900">
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              ⚠️ Resume parsing encountered issues. Showing raw content below.
            </p>
          </div>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {rawContent}
          </pre>
        </div>
      )
    }

    return (
      <div className="p-8 md:p-10 text-gray-900 font-['Georgia',serif]">
        {/* Header */}
        <div className="mb-5 border-b-2 border-primary pb-4">
          <h1 className="text-2xl font-bold text-primary tracking-wide">
            {parsed.contact.name || "Your Name"}
          </h1>
          <p className="text-xs text-gray-600 mt-1.5 tracking-wide">
            {formatContactString(parsed.contact)}
          </p>
        </div>

        {/* Target Title */}
        {parsed.targetTitle && (
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              {parsed.targetTitle}
            </h2>
          </div>
        )}

        {/* Professional Summary */}
        {parsed.summary && (
          <div className="mb-5">
            <p className="text-xs text-gray-700 leading-relaxed">
              {stripMarkdown(parsed.summary)}
            </p>
          </div>
        )}

        {/* Work Experience */}
        {parsed.workExperience.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">
              Work Experience
            </h2>
            {parsed.workExperience.map((exp, idx) => (
              <div key={idx} className="mb-4 last:mb-0">
                <div className="flex justify-between items-start mb-0.5">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{exp.company}</h3>
                    <p className="text-xs text-gray-700">
                      {exp.title}
                      {exp.employmentType && ` · ${exp.employmentType}`}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    <p>
                      {exp.startDate && exp.endDate
                        ? `${exp.startDate} - ${exp.endDate}`
                        : ""}
                    </p>
                    {exp.location && <p>{exp.location}</p>}
                  </div>
                </div>
                {exp.bullets.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {exp.bullets.map((bullet, bIdx) => (
                      <li
                        key={bIdx}
                        className="text-xs text-gray-700 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
                      >
                        {stripMarkdown(bullet)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {parsed.education.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">
              Education
            </h2>
            {parsed.education.map((edu, idx) => (
              <div key={idx} className="mb-2 last:mb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {edu.institution}
                    </h3>
                    {edu.degree && (
                      <p className="text-xs text-gray-700">{edu.degree}</p>
                    )}
                    {edu.field && (
                      <p className="text-xs text-gray-600">{edu.field}</p>
                    )}
                  </div>
                  {edu.graduationDate && (
                    <p className="text-xs text-gray-600">{edu.graduationDate}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {parsed.skills.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
              Skills
            </h2>
            <p className="text-xs text-gray-700">
              {parsed.skills.map(s => stripMarkdown(s)).join(" · ")}
            </p>
          </div>
        )}

        {/* Certifications */}
        {parsed.certifications.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
              Certifications
            </h2>
            <ul className="space-y-0.5">
              {parsed.certifications.map((cert, idx) => (
                <li key={idx} className="text-xs text-gray-700">
                  {stripMarkdown(cert.name)}
                  {cert.issuer && (
                    <span className="text-gray-500"> — {stripMarkdown(cert.issuer)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Projects */}
        {parsed.projects.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
              Projects
            </h2>
            {parsed.projects.map((project, idx) => (
              <div key={idx} className="mb-2 last:mb-0">
                <h3 className="text-sm font-bold text-gray-900">{stripMarkdown(project.name)}</h3>
                {project.description && (
                  <p className="text-xs text-gray-600">{stripMarkdown(project.description)}</p>
                )}
                {project.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {project.bullets.map((bullet, bIdx) => (
                      <li
                        key={bIdx}
                        className="text-xs text-gray-700 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
                      >
                        {stripMarkdown(bullet)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Awards */}
        {parsed.awards.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
              Awards & Scholarships
            </h2>
            <ul className="space-y-0.5">
              {parsed.awards.map((award, idx) => (
                <li
                  key={idx}
                  className="text-xs text-gray-700 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
                >
                  {stripMarkdown(award)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Volunteering */}
        {parsed.volunteering.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
              Volunteering & Leadership
            </h2>
            {parsed.volunteering.map((vol, idx) => (
              <div key={idx} className="mb-1.5 last:mb-0">
                <h3 className="text-sm font-bold text-gray-900">
                  {vol.organization}
                </h3>
                {vol.role && <p className="text-xs text-gray-700">{vol.role}</p>}
                {vol.dates && <p className="text-xs text-gray-500">{vol.dates}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Publications */}
        {parsed.publications.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
              Publications
            </h2>
            <ul className="space-y-0.5">
              {parsed.publications.map((pub, idx) => (
                <li key={idx} className="text-xs text-gray-700">
                  {stripMarkdown(pub.title)}
                  {pub.publisher && (
                    <span className="text-gray-500"> — {stripMarkdown(pub.publisher)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Interests */}
        {parsed.interests.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
              Interests
            </h2>
            <p className="text-xs text-gray-700">{parsed.interests.map(i => stripMarkdown(i)).join(" · ")}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative space-y-8">
      {/* Hidden measurement container - positioned off-screen for accurate height measurement */}
      <div
        ref={contentRef}
        className="absolute left-[-9999px] top-0"
        style={{ width: '800px' }}
        aria-hidden="true"
      >
        <ResumeContent forMeasurement />
      </div>

      {/* Visible paginated pages */}
      {Array.from({ length: pageCount }, (_, pageIndex) => (
        <div
          key={pageIndex}
          className="bg-white rounded-lg shadow-xl overflow-hidden"
          style={{
            height: `${A4_HEIGHT}px`,
            maxWidth: '800px',
            margin: '0 auto'
          }}
        >
          <div
            style={{
              marginTop: `-${pageIndex * A4_HEIGHT}px`,
            }}
          >
            <ResumeContent />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ResumeViewerV2({
  optimizedId,
  title,
  optimizedContent,
  matchScore,
}: ResumeViewerV2Props) {
  const layout = "modern" // TODO: Add layout selector in V2
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "contact",
    "experience",
    "education",
    "skills",
  ])
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // Parse initial content
  const initialParsed = useMemo(() => {
    console.log('[ResumeViewerV2] Parsing content:', {
      length: optimizedContent?.length || 0,
      preview: optimizedContent?.slice(0, 200) || 'EMPTY',
    })
    const parsed = parseResumeContent(optimizedContent || '')
    console.log('[ResumeViewerV2] Parsed result:', {
      name: parsed.contact.name,
      email: parsed.contact.email,
      experienceCount: parsed.workExperience.length,
      skillsCount: parsed.skills.length,
    })
    return parsed
  }, [optimizedContent])

  // Editable state
  const [resumeData, setResumeData] = useState<ParsedResume>(initialParsed)
  const lastSyncedContentRef = useRef<string | undefined>(optimizedContent)

  // Sync resumeData when optimizedContent changes
  useEffect(() => {
    // Only update if optimizedContent actually changed
    if (lastSyncedContentRef.current === optimizedContent) {
      return
    }

    if (hasChanges) {
      // If there are unsaved changes, don't overwrite them
      // User should save or discard their changes first
      console.warn('Skipping sync: unsaved changes present')
      return
    } else {
      // No unsaved changes, safe to update directly
      setResumeData(initialParsed)
    }
    
    // Update the ref to track this version
    lastSyncedContentRef.current = optimizedContent
  }, [initialParsed, optimizedContent, hasChanges])

  // Dialog states
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [targetDialogOpen, setTargetDialogOpen] = useState(false)
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false)
  const [interestsDialogOpen, setInterestsDialogOpen] = useState(false)
  const [certificationsDialogOpen, setCertificationsDialogOpen] = useState(false)
  const [awardsDialogOpen, setAwardsDialogOpen] = useState(false)
  const [experienceDialogOpen, setExperienceDialogOpen] = useState(false)
  const [educationDialogOpen, setEducationDialogOpen] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [volunteeringDialogOpen, setVolunteeringDialogOpen] = useState(false)
  const [publicationDialogOpen, setPublicationDialogOpen] = useState(false)

  // Current editing index for array items
  const [editingExperienceIndex, setEditingExperienceIndex] = useState<number | null>(null)
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null)
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null)
  const [editingVolunteeringIndex, setEditingVolunteeringIndex] = useState<number | null>(null)
  const [editingPublicationIndex, setEditingPublicationIndex] = useState<number | null>(null)
  const [isNewExperience, setIsNewExperience] = useState(false)
  const [isNewEducation, setIsNewEducation] = useState(false)
  const [isNewProject, setIsNewProject] = useState(false)
  const [isNewVolunteering, setIsNewVolunteering] = useState(false)
  const [isNewPublication, setIsNewPublication] = useState(false)

  const match = classifyMatch(matchScore)

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Update handlers
  const updateResumeData = useCallback(
    (updates: Partial<ParsedResume>) => {
      setResumeData((prev) => ({ ...prev, ...updates }))
      setHasChanges(true)
    },
    []
  )

  const handleEditSection = (sectionId: SectionId) => {
    switch (sectionId) {
      case "contact":
        setContactDialogOpen(true)
        break
      case "target":
        setTargetDialogOpen(true)
        break
      case "summary":
        setSummaryDialogOpen(true)
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
      case "experience":
        // Edit first item or open empty dialog
        if (resumeData.workExperience.length > 0) {
          setEditingExperienceIndex(0)
          setIsNewExperience(false)
          setExperienceDialogOpen(true)
        }
        break
      case "education":
        if (resumeData.education.length > 0) {
          setEditingEducationIndex(0)
          setIsNewEducation(false)
          setEducationDialogOpen(true)
        }
        break
      case "projects":
        if (resumeData.projects.length > 0) {
          setEditingProjectIndex(0)
          setIsNewProject(false)
          setProjectDialogOpen(true)
        }
        break
      case "volunteering":
        if (resumeData.volunteering.length > 0) {
          setEditingVolunteeringIndex(0)
          setIsNewVolunteering(false)
          setVolunteeringDialogOpen(true)
        }
        break
      case "publications":
        if (resumeData.publications.length > 0) {
          setEditingPublicationIndex(0)
          setIsNewPublication(false)
          setPublicationDialogOpen(true)
        }
        break
    }
  }

  const handleAddSection = (sectionId: SectionId) => {
    switch (sectionId) {
      case "target":
        setTargetDialogOpen(true)
        break
      case "summary":
        setSummaryDialogOpen(true)
        break
      case "experience":
        setEditingExperienceIndex(null)
        setIsNewExperience(true)
        setExperienceDialogOpen(true)
        break
      case "education":
        setEditingEducationIndex(null)
        setIsNewEducation(true)
        setEducationDialogOpen(true)
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
        setEditingProjectIndex(null)
        setIsNewProject(true)
        setProjectDialogOpen(true)
        break
      case "volunteering":
        setEditingVolunteeringIndex(null)
        setIsNewVolunteering(true)
        setVolunteeringDialogOpen(true)
        break
      case "publications":
        setEditingPublicationIndex(null)
        setIsNewPublication(true)
        setPublicationDialogOpen(true)
        break
    }
  }

  const handleEditItem = (sectionId: SectionId, index: number) => {
    switch (sectionId) {
      case "experience":
        setEditingExperienceIndex(index)
        setIsNewExperience(false)
        setExperienceDialogOpen(true)
        break
      case "education":
        setEditingEducationIndex(index)
        setIsNewEducation(false)
        setEducationDialogOpen(true)
        break
      case "projects":
        setEditingProjectIndex(index)
        setIsNewProject(false)
        setProjectDialogOpen(true)
        break
      case "volunteering":
        setEditingVolunteeringIndex(index)
        setIsNewVolunteering(false)
        setVolunteeringDialogOpen(true)
        break
      case "publications":
        setEditingPublicationIndex(index)
        setIsNewPublication(false)
        setPublicationDialogOpen(true)
        break
    }
  }

  const handleDeleteItem = (sectionId: SectionId, index: number) => {
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
  }

  // Save handlers
  const handleSaveContact = (contact: ContactInfo) => {
    updateResumeData({ contact })
  }

  const handleSaveExperience = (experience: WorkExperienceItem) => {
    if (isNewExperience) {
      updateResumeData({
        workExperience: [...resumeData.workExperience, experience],
      })
    } else if (editingExperienceIndex !== null) {
      const updated = [...resumeData.workExperience]
      updated[editingExperienceIndex] = experience
      updateResumeData({ workExperience: updated })
    }
  }

  const handleSaveEducation = (education: EducationItem) => {
    if (isNewEducation) {
      updateResumeData({
        education: [...resumeData.education, education],
      })
    } else if (editingEducationIndex !== null) {
      const updated = [...resumeData.education]
      updated[editingEducationIndex] = education
      updateResumeData({ education: updated })
    }
    setEditingEducationIndex(null)
    setIsNewEducation(false)
    setEducationDialogOpen(false)
  }

  const handleSaveProject = (project: ProjectItem) => {
    if (isNewProject) {
      updateResumeData({
        projects: [...resumeData.projects, project],
      })
    } else if (editingProjectIndex !== null) {
      const updated = [...resumeData.projects]
      updated[editingProjectIndex] = project
      updateResumeData({ projects: updated })
    }
    setEditingProjectIndex(null)
    setIsNewProject(false)
    setProjectDialogOpen(false)
  }

  const handleSaveVolunteering = (volunteering: VolunteerItem) => {
    if (isNewVolunteering) {
      updateResumeData({
        volunteering: [...resumeData.volunteering, volunteering],
      })
    } else if (editingVolunteeringIndex !== null) {
      const updated = [...resumeData.volunteering]
      updated[editingVolunteeringIndex] = volunteering
      updateResumeData({ volunteering: updated })
    }
    setEditingVolunteeringIndex(null)
    setIsNewVolunteering(false)
    setVolunteeringDialogOpen(false)
  }

  const handleSavePublication = (publication: PublicationItem) => {
    if (isNewPublication) {
      updateResumeData({
        publications: [...resumeData.publications, publication],
      })
    } else if (editingPublicationIndex !== null) {
      const updated = [...resumeData.publications]
      updated[editingPublicationIndex] = publication
      updateResumeData({ publications: updated })
    }
    setEditingPublicationIndex(null)
    setIsNewPublication(false)
    setPublicationDialogOpen(false)
  }

  const copyText = async () => {
    try {
      // Format resume data as HTML for Word (preserves formatting)
      const { html, text } = formatResumeForWord(resumeData)

      // Use Clipboard API with HTML format for Word compatibility
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })

      await navigator.clipboard.write([clipboardItem])

      // Show success feedback
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      toast.success("Copied to clipboard")
    } catch (err) {
      console.error('Failed to copy HTML:', err)
      // Fallback: try copying plain text
      try {
        const { text } = formatResumeForWord(resumeData)
        await navigator.clipboard.writeText(text)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
        toast.success("Copied to clipboard")
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr)
        // Last resort: try raw content
        try {
          await navigator.clipboard.writeText(optimizedContent)
          setCopySuccess(true)
          setTimeout(() => setCopySuccess(false), 2000)
          toast.success("Copied to clipboard")
        } catch (lastErr) {
          console.error('All copy methods failed:', lastErr)
          toast.error("Copy failed. Try again.")
        }
      }
    }
  }

  const download = (format: "docx" | "html") => {
    try {
      const link = document.createElement("a")
      const encodedId = encodeURIComponent(optimizedId)
      link.href = `/api/resumes/export?resume_id=${encodedId}&format=${format}&layout=${layout}`
      link.target = "_blank"
      link.rel = "noopener"
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("Download started")
    } catch {
      toast.error("Download failed. Try again.")
    }
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/resumes/optimized/${optimizedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData }),
      })

      if (response.ok) {
        setHasChanges(false)
        toast.success("Changes saved")
      } else {
        toast.error("Save failed. Try again.")
      }
    } catch {
      toast.error("Save failed. Try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Platform detection for shortcut display
  const { modifierKey } = usePlatform()

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "d",
      modifiers: { meta: true },
      handler: () => download("docx"),
      description: "Download DOCX",
    },
    {
      key: "c",
      modifiers: { meta: true },
      handler: copyText,
      description: "Copy resume content",
    },
    {
      key: "s",
      modifiers: { meta: true },
      handler: handleSaveChanges,
      description: "Save changes",
      enabled: hasChanges && !isSaving,
    },
    {
      key: "p",
      modifiers: { meta: true },
      handler: () => download("html"),
      description: "Preview HTML",
    },
  ])

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="text-sm text-muted-foreground">
              Match: <span className={match.className}>{match.label}</span>
            </div>
          </div>

          <TooltipProvider>
            <div className="flex flex-wrap items-center gap-2">
              {hasChanges && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="bg-primary"
                      aria-label="Save resume changes"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                      )}
                      Save Changes
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Save changes</span>
                    <span className="ml-2 opacity-60">
                      <Kbd>{modifierKey}</Kbd>
                      <Kbd>S</Kbd>
                    </span>
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyText}
                    className={copySuccess ? "bg-emerald-500/10 border-emerald-500/20" : ""}
                    aria-label="Copy resume content to clipboard"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-emerald-500" aria-hidden="true" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" aria-hidden="true" /> Copy
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Copy resume content</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>C</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download("html")}
                    aria-label="Preview resume as HTML"
                  >
                    <FileText className="h-4 w-4 mr-2" aria-hidden="true" /> Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Preview as HTML</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>P</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download("docx")}
                    aria-label="Download resume as Word document"
                  >
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" /> DOCX
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Download as DOCX</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>D</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] h-[calc(100vh-280px)] min-h-[800px]">
            {/* Left Panel - Sections List */}
            <div className="relative border-r-0 md:border-r border-border bg-muted/20 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 h-full">
                <div className="p-4">
                  <SectionsList
                    parsed={resumeData}
                    expandedSections={expandedSections}
                    onToggle={toggleSection}
                    onEdit={handleEditSection}
                    onAdd={handleAddSection}
                    onEditItem={handleEditItem}
                    onDeleteItem={handleDeleteItem}
                  />
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - PDF Preview */}
            <div className="relative bg-gray-100 dark:bg-gray-900 overflow-hidden min-w-0 flex flex-col">
              <ScrollArea className="flex-1 h-full">
                <div className="p-4 md:p-6 lg:p-8">
                  <PaginatedResumePreview parsed={resumeData} rawContent={optimizedContent} />
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ContactEditDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        contact={resumeData.contact}
        onSave={handleSaveContact}
      />

      <TextEditDialog
        open={targetDialogOpen}
        onOpenChange={setTargetDialogOpen}
        title="Edit Target Title"
        label="Target Job Title"
        value={resumeData.targetTitle || ""}
        onSave={(value) => updateResumeData({ targetTitle: value })}
        placeholder="Senior Product Designer"
      />

      <TextEditDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
        title="Edit Professional Summary"
        label="Professional Summary"
        value={resumeData.summary || ""}
        onSave={(value) => updateResumeData({ summary: value })}
        multiline
        maxLength={500}
        placeholder="Write a compelling summary highlighting your key achievements and value proposition..."
      />

      <ExperienceEditDialog
        open={experienceDialogOpen}
        onOpenChange={setExperienceDialogOpen}
        experience={
          editingExperienceIndex !== null
            ? resumeData.workExperience[editingExperienceIndex]
            : null
        }
        onSave={handleSaveExperience}
        isNew={isNewExperience}
      />

      <EducationEditDialog
        open={educationDialogOpen}
        onOpenChange={setEducationDialogOpen}
        education={
          editingEducationIndex !== null
            ? resumeData.education[editingEducationIndex]
            : null
        }
        onSave={handleSaveEducation}
        isNew={isNewEducation}
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
        title="Interests"
        items={resumeData.interests}
        onSave={(interests) => updateResumeData({ interests })}
        placeholder="Enter an interest..."
      />

      <CertificationsEditDialog
        open={certificationsDialogOpen}
        onOpenChange={setCertificationsDialogOpen}
        certifications={resumeData.certifications}
        onSave={(certifications) =>
          updateResumeData({
            certifications,
          })
        }
      />

      <SimpleListEditDialog
        open={awardsDialogOpen}
        onOpenChange={setAwardsDialogOpen}
        title="Awards & Scholarships"
        items={resumeData.awards}
        onSave={(awards) => updateResumeData({ awards })}
        placeholder="Award or scholarship name..."
      />

      <ProjectEditDialog
        open={projectDialogOpen}
        onOpenChange={(open) => {
          setProjectDialogOpen(open)
          if (!open) {
            setEditingProjectIndex(null)
            setIsNewProject(false)
          }
        }}
        project={
          editingProjectIndex !== null
            ? resumeData.projects[editingProjectIndex]
            : null
        }
        onSave={handleSaveProject}
        isNew={isNewProject}
      />

      <VolunteeringEditDialog
        open={volunteeringDialogOpen}
        onOpenChange={(open) => {
          setVolunteeringDialogOpen(open)
          if (!open) {
            setEditingVolunteeringIndex(null)
            setIsNewVolunteering(false)
          }
        }}
        volunteering={
          editingVolunteeringIndex !== null
            ? resumeData.volunteering[editingVolunteeringIndex]
            : null
        }
        onSave={handleSaveVolunteering}
        isNew={isNewVolunteering}
      />

      <PublicationEditDialog
        open={publicationDialogOpen}
        onOpenChange={(open) => {
          setPublicationDialogOpen(open)
          if (!open) {
            setEditingPublicationIndex(null)
            setIsNewPublication(false)
          }
        }}
        publication={
          editingPublicationIndex !== null
            ? resumeData.publications[editingPublicationIndex]
            : null
        }
        onSave={handleSavePublication}
        isNew={isNewPublication}
      />
    </div>
  )
}
