import type { ParsedResume } from "@/lib/resume-parser"
import { formatContactString } from "@/lib/resume-parser"
import { stripMarkdown, escapeHtml, markdownToHtml } from "./markdown"

/**
 * Format resume as HTML suitable for Word documents (preserves formatting)
 */
export function formatResumeForWord(parsed: ParsedResume): { html: string; text: string } {
  const htmlParts: string[] = []
  const textParts: string[] = []

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
    textParts.push('\u2500'.repeat(50))
    textParts.push(stripMarkdown(parsed.summary))
    textParts.push('')
  }

  // Work Experience
  if (parsed.workExperience.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">WORK EXPERIENCE</h2>')
    textParts.push('WORK EXPERIENCE')
    textParts.push('\u2500'.repeat(50))

    parsed.workExperience.forEach((exp) => {
      const company = escapeHtml(exp.company || exp.title || 'Position')
      const subtitleParts: string[] = []
      if (exp.title && exp.company) subtitleParts.push(exp.title)
      if (exp.startDate && exp.endDate) subtitleParts.push(`${exp.startDate} - ${exp.endDate}`)
      if (exp.location) subtitleParts.push(exp.location)

      htmlParts.push(`<p style="margin-top: 6pt; margin-bottom: 2pt;"><strong style="font-size: 11pt;">${company}</strong></p>`)
      if (subtitleParts.length > 0) {
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt; font-size: 10pt;">${escapeHtml(subtitleParts.join(' \u2022 '))}</p>`)
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
        textParts.push(subtitleParts.join(' \u2022 '))
      }
      if (exp.bullets.length > 0) {
        exp.bullets.forEach((bullet) => {
          textParts.push(`  \u2022 ${stripMarkdown(bullet)}`)
        })
      }
      textParts.push('')
    })
  }

  // Education
  if (parsed.education.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">EDUCATION</h2>')
    textParts.push('EDUCATION')
    textParts.push('\u2500'.repeat(50))

    parsed.education.forEach((edu) => {
      const eduParts: string[] = []
      if (edu.institution) eduParts.push(edu.institution)
      if (edu.degree) eduParts.push(edu.degree)
      if (edu.graduationDate) eduParts.push(edu.graduationDate)
      htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt;"><strong>${escapeHtml(edu.institution || '')}</strong>${edu.degree ? ` - ${escapeHtml(edu.degree)}` : ''}${edu.graduationDate ? ` - ${escapeHtml(edu.graduationDate)}` : ''}</p>`)
      textParts.push(eduParts.join(' \u2022 '))
    })
    htmlParts.push('<p style="margin-bottom: 12pt;"></p>')
    textParts.push('')
  }

  // Skills
  if (parsed.skills.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">SKILLS</h2>')
    const skillsText = parsed.skills.map(s => escapeHtml(stripMarkdown(s))).join(' \u2022 ')
    htmlParts.push(`<p style="margin-top: 0; margin-bottom: 12pt;">${skillsText}</p>`)
    textParts.push('SKILLS')
    textParts.push('\u2500'.repeat(50))
    textParts.push(parsed.skills.map(s => stripMarkdown(s)).join(' \u2022 '))
    textParts.push('')
  }

  // Certifications
  if (parsed.certifications.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">CERTIFICATIONS</h2>')
    parsed.certifications.forEach((cert) => {
      const certName = escapeHtml(stripMarkdown(cert.name))
      if (cert.issuer) {
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt;">${certName} \u2014 ${escapeHtml(stripMarkdown(cert.issuer))}</p>`)
      } else {
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt;">${certName}</p>`)
      }
    })
    htmlParts.push('<p style="margin-bottom: 12pt;"></p>')
    textParts.push('CERTIFICATIONS')
    textParts.push('\u2500'.repeat(50))
    parsed.certifications.forEach((cert) => {
      const certLine = stripMarkdown(cert.name)
      if (cert.issuer) {
        textParts.push(`${certLine} \u2014 ${stripMarkdown(cert.issuer)}`)
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
    textParts.push('\u2500'.repeat(50))
    parsed.projects.forEach((project) => {
      textParts.push(stripMarkdown(project.name))
      if (project.description) {
        textParts.push(`  ${stripMarkdown(project.description)}`)
      }
      if (project.bullets.length > 0) {
        project.bullets.forEach((bullet) => {
          textParts.push(`  \u2022 ${stripMarkdown(bullet)}`)
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
    textParts.push('\u2500'.repeat(50))
    parsed.awards.forEach((award) => {
      textParts.push(`  \u2022 ${stripMarkdown(award)}`)
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
    textParts.push('\u2500'.repeat(50))
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
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt;">${pubTitle} \u2014 ${escapeHtml(stripMarkdown(pub.publisher))}</p>`)
      } else {
        htmlParts.push(`<p style="margin-top: 0; margin-bottom: 4pt;">${pubTitle}</p>`)
      }
    })
    htmlParts.push('<p style="margin-bottom: 12pt;"></p>')
    textParts.push('PUBLICATIONS')
    textParts.push('\u2500'.repeat(50))
    parsed.publications.forEach((pub) => {
      const pubLine = stripMarkdown(pub.title)
      if (pub.publisher) {
        textParts.push(`${pubLine} \u2014 ${stripMarkdown(pub.publisher)}`)
      } else {
        textParts.push(pubLine)
      }
    })
    textParts.push('')
  }

  // Interests
  if (parsed.interests.length > 0) {
    htmlParts.push('<h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt;">INTERESTS</h2>')
    const interestsText = parsed.interests.map(i => escapeHtml(stripMarkdown(i))).join(' \u2022 ')
    htmlParts.push(`<p style="margin-top: 0; margin-bottom: 12pt;">${interestsText}</p>`)
    textParts.push('INTERESTS')
    textParts.push('\u2500'.repeat(50))
    textParts.push(parsed.interests.map(i => stripMarkdown(i)).join(' \u2022 '))
  }

  htmlParts.push('</div>')

  return {
    html: htmlParts.join(''),
    text: textParts.join('\n')
  }
}
