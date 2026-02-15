import type { ParsedResume } from "@/lib/resume-parser";
import { debugLog } from "@/lib/debug-logger"

export function formatResumeToMarkdown(data: ParsedResume): string {
  debugLog('[ResumeFormatter] Formatting resume to markdown:', {
    workExperienceCount: data.workExperience.length,
    educationCount: data.education.length,
    skillsCount: data.skills.length,
    certificationsCount: data.certifications.length,
  })

  const lines: string[] = []

  // Name/Header
  if (data.contact.name) {
    lines.push(`# ${data.contact.name}`)
    lines.push("")
  }

  // Contact info
  const contactParts: string[] = []
  if (data.contact.location) contactParts.push(data.contact.location)
  if (data.contact.phone) contactParts.push(data.contact.phone)
  if (data.contact.email) contactParts.push(data.contact.email)
  if (data.contact.linkedin) contactParts.push(data.contact.linkedin)
  if (data.contact.website) contactParts.push(data.contact.website)

  if (contactParts.length > 0) {
    lines.push(contactParts.join(" | "))
    lines.push("")
  }

  // Target Title (always show if exists)
  if (data.targetTitle) {
    lines.push(`**${data.targetTitle}**`)
    lines.push("")
  }

  // Professional Summary (always show if exists)
  if (data.summary) {
    lines.push("## Professional Summary")
    lines.push("")
    lines.push(data.summary)
    lines.push("")
  }

  // Work Experience
  if (data.workExperience.length > 0) {
    lines.push("## Work Experience")
    lines.push("")

    for (const exp of data.workExperience) {
      // Format: ### Company Name · Location (inline to prevent location being treated as header)
      const companyHeader = exp.location 
        ? `### ${exp.company} · ${exp.location}`
        : `### ${exp.company}`
      lines.push(companyHeader)

      // Format: **Title** | Date Range | EmploymentType
      const detailParts: string[] = []
      if (exp.title) {
        detailParts.push(`**${exp.title}**`)
      }

      // Add dates if available
      const dateParts: string[] = []
      if (exp.startDate) dateParts.push(exp.startDate)
      if (exp.endDate) dateParts.push(exp.endDate)
      if (dateParts.length > 0) {
        detailParts.push(dateParts.join(" - "))
      }

      // Add employment type if exists
      if (exp.employmentType) {
        detailParts.push(exp.employmentType)
      }

      // Write the detail line if we have any details
      if (detailParts.length > 0) {
        lines.push(detailParts.join(" | "))
      }

      lines.push("")

      // Bullets (parser extracts these from buffer)
      for (const bullet of exp.bullets) {
        lines.push(`- ${bullet}`)
      }
      lines.push("")
    }
  }

  // Education (only if exists)
  if (data.education.length > 0) {
    lines.push("## Education")
    lines.push("")

    for (const edu of data.education) {
      if (edu.institution) lines.push(`### ${edu.institution}`)
      if (edu.degree) lines.push(`**${edu.degree}**`)
      if (edu.field) lines.push(edu.field)
      if (edu.graduationDate) lines.push(`*${edu.graduationDate}*`)
      if (edu.notes) lines.push(edu.notes)
      lines.push("")
    }
  }

  // Skills (only if exists)
  if (data.skills.length > 0) {
    lines.push("## Skills")
    lines.push("")
    lines.push(data.skills.filter(s => s && s.trim()).join(" · "))
    lines.push("")
  }

  // Certifications (only if exists)
  if (data.certifications.length > 0) {
    lines.push("## Certifications")
    lines.push("")
    for (const cert of data.certifications) {
      const certParts: string[] = [cert.name]
      if (cert.issuer) certParts.push(cert.issuer)
      if (cert.date) certParts.push(`(${cert.date})`)
      lines.push(`- ${certParts.join(" — ")}`)
    }
    lines.push("")
  }

  // Projects (only if exists)
  if (data.projects.length > 0) {
    lines.push("## Projects")
    lines.push("")
    for (const proj of data.projects) {
      if (!proj.name) continue
      lines.push(`### ${proj.name}`)
      if (proj.description) lines.push(proj.description)
      if (Array.isArray(proj.technologies) && proj.technologies.length > 0) {
        lines.push(`Technologies: ${proj.technologies.join(", ")}`)
      }
      for (const bullet of proj.bullets || []) {
        lines.push(`- ${bullet}`)
      }
      lines.push("")
    }
  }

  // Volunteering (only if exists)
  if (data.volunteering.length > 0) {
    lines.push("## Volunteering & Leadership")
    lines.push("")
    for (const vol of data.volunteering) {
      if (vol.organization) lines.push(`### ${vol.organization}`)
      if (vol.role) lines.push(`**${vol.role}**`)
      if (vol.dates) lines.push(`*${vol.dates}*`)
      if (vol.description) lines.push(vol.description)
      lines.push("")
    }
  }

  // Publications (only if exists)
  if (data.publications.length > 0) {
    lines.push("## Publications")
    lines.push("")
    for (const pub of data.publications) {
      const pubParts: string[] = [pub.title]
      if (pub.publisher) pubParts.push(pub.publisher)
      if (pub.date) pubParts.push(`(${pub.date})`)
      lines.push(`- ${pubParts.join(" — ")}`)
      if (pub.description) lines.push(`  ${pub.description}`)
    }
    lines.push("")
  }

  // Awards (only if exists)
  if (data.awards.length > 0) {
    lines.push("## Awards & Scholarships")
    lines.push("")
    for (const award of data.awards) {
      lines.push(`- ${award}`)
    }
    lines.push("")
  }

  // Interests (only if exists)
  if (data.interests.length > 0) {
    lines.push("## Interests")
    lines.push("")
    lines.push(data.interests.join(" · "))
    lines.push("")
  }

  const markdown = lines.join("\n")

  debugLog('[ResumeFormatter] Generated markdown:', {
    totalLength: markdown.length,
    hasEducation: markdown.includes('## Education'),
    hasSkills: markdown.includes('## Skills'),
    hasWorkExperience: markdown.includes('## Work Experience'),
  })

  return markdown
}
