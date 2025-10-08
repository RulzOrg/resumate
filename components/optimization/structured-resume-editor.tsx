"use client"

import React, { useState, useEffect, useMemo } from "react"
import { ChevronDown, Wand2, Plus, Trash2, Save, Download, FileText, Copy as CopyIcon, Check, X } from "lucide-react"
import { toast } from "sonner"
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx"
import { saveAs } from "file-saver"

// Types
interface ContactInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  linkedin: string
  location: string
  // Individual inclusion flags for each field
  firstNameIncluded: boolean
  lastNameIncluded: boolean
  emailIncluded: boolean
  phoneIncluded: boolean
  linkedinIncluded: boolean
  locationIncluded: boolean
}

interface Summary {
  id: string
  text: string
  included: boolean
}

interface WorkBullet {
  id: string
  text: string
  included: boolean
}

interface WorkExperience {
  id: string
  company: string
  role: string
  dates: string
  location: string
  bullets: WorkBullet[]
  included: boolean
}

interface Education {
  id: string
  institution: string
  degree: string
  field: string
  location: string
  gpa?: string
  start: string
  end: string
  notes: string
  included: boolean
}

interface Certification {
  id: string
  name: string
  issuer: string
  date: string
  included: boolean
}

interface Skill {
  id: string
  name: string
  included: boolean
}

interface Interest {
  id: string
  name: string
  included: boolean
}

interface ResumeData {
  contactInfo: ContactInfo
  targetTitle: { text: string; included: boolean }
  summaries: Summary[]
  workExperience: WorkExperience[]
  education: Education[]
  certifications: Certification[]
  skills: Skill[]
  interests: Interest[]
}

interface StructuredResumeEditorProps {
  optimizedContent: string
  optimizedId: string | null
  jobTitle: string
  companyName: string
  onSave?: (data: ResumeData) => Promise<void>
}

// Helper functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function parseMarkdownToStructured(markdown: string): ResumeData {
  console.log('[Parser] Starting parse:', {
    length: markdown.length,
    preview: markdown.substring(0, 200),
    lineCount: markdown.split('\n').length
  })

  try {
    const lines = markdown.split('\n')

    // Default structure
    const data: ResumeData = {
    contactInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      location: '',
      firstNameIncluded: true,
      lastNameIncluded: true,
      emailIncluded: true,
      phoneIncluded: true,
      linkedinIncluded: true,
      locationIncluded: true
    },
    targetTitle: { text: '', included: true },
    summaries: [],
    workExperience: [],
    education: [],
    certifications: [],
    skills: [],
    interests: []
  }

  // Extract contact info from first few lines
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/
  const phoneRegex = /(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/
  const linkedinRegex = /(linkedin\.com\/in\/[\w-]+|in\/[\w-]+)/i
  const locationRegex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2,}(?:\s*\d{5})?)/  // City, STATE or City, Country
  
  // Get name from first heading or first line
  let nameFound = false
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim()
    if (line.startsWith('#')) {
      const name = line.replace(/^#+\s*/, '').trim()
      const nameParts = name.split(' ')
      data.contactInfo.firstName = nameParts[0] || ''
      data.contactInfo.lastName = nameParts.slice(1).join(' ') || ''
      nameFound = true
      break
    } else if (i === 0 && line && !emailRegex.test(line)) {
      const nameParts = line.split(' ')
      data.contactInfo.firstName = nameParts[0] || ''
      data.contactInfo.lastName = nameParts.slice(1).join(' ') || ''
      nameFound = true
      break
    }
  }

  // Extract contact details from first 10 lines
  // Handle both pipe-separated (email | phone | linkedin | location) and line-separated formats
  const headerSection = lines.slice(0, 10).join('\n')
  
  if (!data.contactInfo.email && emailRegex.test(headerSection)) {
    const match = headerSection.match(emailRegex)
    if (match) data.contactInfo.email = match[0]
  }
  
  if (!data.contactInfo.phone && phoneRegex.test(headerSection)) {
    const match = headerSection.match(phoneRegex)
    if (match) data.contactInfo.phone = match[0].trim()
  }
  
  if (!data.contactInfo.linkedin && linkedinRegex.test(headerSection)) {
    const match = headerSection.match(linkedinRegex)
    if (match) {
      data.contactInfo.linkedin = match[0].includes('linkedin.com') 
        ? match[0] 
        : `linkedin.com/${match[0]}`
    }
  }
  
  if (!data.contactInfo.location && locationRegex.test(headerSection)) {
    const match = headerSection.match(locationRegex)
    if (match) data.contactInfo.location = match[0].trim()
  }
  
  // If no location found with regex, try extracting from pipe-separated line
  if (!data.contactInfo.location) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim()
      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim())
        // Location is usually the last part that's not email/phone/linkedin
        for (const part of parts.reverse()) {
          if (!emailRegex.test(part) && !phoneRegex.test(part) && !linkedinRegex.test(part) && part.length > 0) {
            data.contactInfo.location = part
            break
          }
        }
        if (data.contactInfo.location) break
      }
    }
  }

  // Parse section by section
  let currentSection = ''
  let currentExperience: WorkExperience | null = null
  let currentEducation: Education | null = null
  let summaryLines: string[] = []
  let titleFound = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Check for section headers
    if (line.match(/^##\s*(professional\s*summary|summary|about)/i)) {
      console.log('[Parser] Found section: Summary')
      if (currentExperience) data.workExperience.push(currentExperience)
      if (currentEducation) data.education.push(currentEducation)
      currentExperience = null
      currentEducation = null
      currentSection = 'summary'
      summaryLines = []
      continue
    } else if (line.match(/^##\s*(work\s*experience|experience|employment)/i)) {
      console.log('[Parser] Found section: Work Experience')
      if (summaryLines.length > 0 && data.summaries.length === 0) {
        data.summaries.push({
          id: generateId(),
          text: summaryLines.join(' '),
          included: true
        })
      }
      if (currentExperience) data.workExperience.push(currentExperience)
      if (currentEducation) data.education.push(currentEducation)
      currentExperience = null
      currentEducation = null
      currentSection = 'experience'
      continue
    } else if (line.match(/^##\s*(education|academic)/i)) {
      console.log('[Parser] Found section: Education')
      if (currentExperience) data.workExperience.push(currentExperience)
      if (currentEducation) data.education.push(currentEducation)
      currentExperience = null
      currentEducation = null
      currentSection = 'education'
      continue
    } else if (line.match(/^##\s*(certifications?|certificates|professional\s*certifications)/i)) {
      console.log('[Parser] Found section: Certifications')
      if (currentExperience) data.workExperience.push(currentExperience)
      if (currentEducation) data.education.push(currentEducation)
      currentExperience = null
      currentEducation = null
      currentSection = 'certifications'
      continue
    } else if (line.match(/^##\s*(skills|technical\s*skills|core\s*competencies)/i)) {
      console.log('[Parser] Found section: Skills')
      if (currentExperience) data.workExperience.push(currentExperience)
      if (currentEducation) data.education.push(currentEducation)
      currentExperience = null
      currentEducation = null
      currentSection = 'skills'
      continue
    } else if (line.match(/^##\s*(interests|hobbies)/i)) {
      console.log('[Parser] Found section: Interests')
      if (currentExperience) data.workExperience.push(currentExperience)
      if (currentEducation) data.education.push(currentEducation)
      currentExperience = null
      currentEducation = null
      currentSection = 'interests'
      continue
    }

    // Extract target title (first ## heading that's not a section)
    if (!titleFound && line.match(/^##\s+/) && !line.match(/^##\s*(professional\s*summary|summary|experience|education|skills|interests|about)/i)) {
      data.targetTitle.text = line.replace(/^##\s+/, '').trim()
      titleFound = true
      continue
    }

    // Parse based on current section
    if (currentSection === 'summary') {
      if (line && !line.startsWith('#')) {
        summaryLines.push(line.replace(/^[*-]\s*/, ''))
      }
    } else if (currentSection === 'experience') {
      if (line.match(/^###\s+/)) {
        // Save previous experience
        if (currentExperience) {
          data.workExperience.push(currentExperience)
        }
        // Parse company and role from heading
        const heading = line.replace(/^###\s+/, '').trim()
        let company = ''
        let role = ''

        // Try different patterns
        if (heading.includes('—') || heading.includes('–')) {
          // Format: "Company — Role" or "Role — Company"
          const parts = heading.split(/[—–]/)
          company = parts[0]?.trim() || ''
          role = parts[1]?.trim() || ''
        } else if (heading.toLowerCase().includes(' at ')) {
          // Format: "Role at Company"
          const parts = heading.split(/\s+at\s+/i)
          role = parts[0]?.trim() || ''
          company = parts[1]?.trim() || ''
        } else if (heading.includes('|')) {
          // Format: "Company | Role"
          const parts = heading.split('|')
          company = parts[0]?.trim() || ''
          role = parts[1]?.trim() || ''
        } else {
          // Default: treat whole thing as company (role might be on next line)
          company = heading
          role = ''
        }

        currentExperience = {
          id: generateId(),
          company,
          role,
          dates: '',
          location: '',
          bullets: [],
          included: true
        }
      } else if (currentExperience && !line.startsWith('*') && !line.startsWith('-') && !line.startsWith('#')) {
        // This line likely contains dates and/or location metadata
        // Common formats:
        // "Jan 2021 – Present | Remote"
        // "2020-2023 • San Francisco, CA"
        // "January 2021 - December 2023"
        
        // Try to extract dates (various formats)
        const datePatterns = [
          /([A-Za-z]{3,}\s+\d{4}\s*[-–]\s*[A-Za-z]{3,}\s+\d{4})/i,  // "January 2021 – December 2023"
          /([A-Za-z]{3,}\s+\d{4}\s*[-–]\s*Present)/i,               // "Jan 2021 – Present"
          /(\d{4}\/\d{2}\s*[-–]\s*\d{4}\/\d{2})/,                   // "2020/01 – 2023/12"
          /(\d{4}\/\d{2}\s*[-–]\s*Present)/i,                       // "2020/01 – Present"
          /(\d{4}\s*[-–]\s*\d{4})/,                                  // "2020-2023"
          /(\d{4}\s*[-–]\s*Present)/i,                               // "2020-Present"
          /(Q[1-4]\s+\d{4}\s*[-–]\s*Q[1-4]\s+\d{4})/i,              // "Q1 2020 – Q4 2023"
          /(Q[1-4]\s+\d{4}\s*[-–]\s*Present)/i,                     // "Q1 2020 – Present"
        ]

        let dateMatch = null
        for (const pattern of datePatterns) {
          dateMatch = line.match(pattern)
          if (dateMatch) {
            currentExperience.dates = dateMatch[0].trim()
            break
          }
        }

        if (dateMatch) {
          // Everything after dates (separated by | • or ·) is location
          const remainder = line.replace(dateMatch[0], '').replace(/^[\s|•·,]+/, '').replace(/[\s|•·,]+$/, '').trim()
          if (remainder) {
            currentExperience.location = remainder
          }
        } else {
          // No dates found, try to extract location from pipe/bullet separated line
          if (line.includes('|') || line.includes('•') || line.includes('·')) {
            const parts = line.split(/[|•·]/).map(p => p.trim()).filter(Boolean)
            if (parts.length >= 1) {
              // Assume last part is location if it looks like a place (has capital letters or "remote")
              const lastPart = parts[parts.length - 1]
              if (lastPart.match(/[A-Z][a-z]+/) || lastPart.toLowerCase().includes('remote')) {
                currentExperience.location = lastPart
                // First parts might be dates
                if (parts.length >= 2) {
                  currentExperience.dates = parts.slice(0, -1).join(' • ')
                }
              } else {
                // All parts might be dates or other metadata
                if (parts.length >= 2) {
                  currentExperience.dates = parts[0]
                  currentExperience.location = parts.slice(1).join(' • ')
                } else if (parts.length === 1) {
                  // Could be dates or location, prefer dates if it has numbers
                  if (/\d/.test(parts[0])) {
                    currentExperience.dates = parts[0]
                  } else {
                    currentExperience.location = parts[0]
                  }
                }
              }
            }
          }
        }
      } else if (currentExperience && (line.startsWith('*') || line.startsWith('-') || line.match(/^\s+[*-]\s/))) {
        // Bullet point - handle nested bullets by stripping indentation
        const bulletText = line.replace(/^[\s]*[*-]\s*/, '').trim()
        if (bulletText) {
          currentExperience.bullets.push({
            id: generateId(),
            text: bulletText,
            included: true
          })
        }
      } else if (currentExperience && !line.startsWith('#') && line.length > 20 && currentExperience.bullets.length === 0) {
        // Paragraph description - add as single bullet if no bullets exist yet
        // Only if line is substantial (>20 chars) and doesn't look like metadata
        currentExperience.bullets.push({
          id: generateId(),
          text: line.trim(),
          included: true
        })
      }
    } else if (currentSection === 'education') {
      if (line.match(/^###\s+/)) {
        // Save previous education
        if (currentEducation) {
          data.education.push(currentEducation)
        }
        currentEducation = {
          id: generateId(),
          institution: line.replace(/^###\s+/, '').trim(),
          degree: '',
          field: '',
          location: '',
          start: '',
          end: '',
          notes: '',
          included: true
        }
      } else if (currentEducation && !line.startsWith('*') && !line.startsWith('-') && !line.startsWith('#')) {
        // Try to parse degree and field
        const degreeMatch = line.match(/(?:bachelor|master|phd|doctorate|associate|b\.?s\.?|m\.?s\.?|mba|ma|ba)/i)
        if (degreeMatch && !currentEducation.degree) {
          const parts = line.split(/\s+in\s+|\s+of\s+|·|•|\|/)
          currentEducation.degree = parts[0]?.trim() || ''
          if (parts.length > 1) {
            // Extract field, removing any trailing location
            currentEducation.field = parts[1]?.trim().split(/[|•·]/)[0]?.trim() || ''
            if (parts.length > 2) {
              currentEducation.location = parts[2]?.trim() || ''
            }
          }
        }
        // Try to parse dates
        else if (line.match(/\d{4}/) && !currentEducation.start) {
          const dateMatch = line.match(/(\d{4})\s*[-–]\s*(\d{4}|Present|Expected\s+\d{4})/i)
          if (dateMatch) {
            currentEducation.start = dateMatch[1]
            currentEducation.end = dateMatch[2]
          }
        }
        // Try to parse GPA
        else if (line.toLowerCase().includes('gpa') && !currentEducation.gpa) {
          const gpaMatch = line.match(/GPA:?\s*(\d\.\d+)/i) || line.match(/\((\d\.\d+)\/\d\.\d+\)/)
          if (gpaMatch) {
            currentEducation.gpa = gpaMatch[1]
          }
        }
        // Otherwise might be location
        else if (!currentEducation.location && line.match(/[A-Z][a-z]+/)) {
          currentEducation.location = line.trim()
        }
      } else if (currentEducation && (line.startsWith('*') || line.startsWith('-') || line.match(/^\s+[*-]\s/))) {
        // Bullet point - add to notes (honors, thesis, etc.)
        const note = line.replace(/^[\s]*[*-]\s*/, '').trim()
        if (note) {
          currentEducation.notes += (currentEducation.notes ? '\n' : '') + note
        }
      }
    } else if (currentSection === 'certifications') {
      if (line.match(/^###\s+/)) {
        // Format: ### Certification Name — Issuer (Year)
        const heading = line.replace(/^###\s+/, '').trim()
        let name = heading
        let issuer = ''
        let date = ''

        // Try to extract issuer and date from heading
        // Pattern: "Name — Issuer (Year)" or "Name | Issuer | Year"
        if (heading.includes('—') || heading.includes('–')) {
          const parts = heading.split(/[—–]/)
          name = parts[0]?.trim() || ''
          const remainder = parts[1]?.trim() || ''
          // Check for date in parentheses
          const dateMatch = remainder.match(/\((\d{4})\)/)
          if (dateMatch) {
            date = dateMatch[1]
            issuer = remainder.replace(/\(\d{4}\)/, '').trim()
          } else {
            issuer = remainder
          }
        } else if (heading.includes('|')) {
          const parts = heading.split('|').map(p => p.trim())
          name = parts[0] || ''
          issuer = parts[1] || ''
          date = parts[2] || ''
        }

        data.certifications.push({
          id: generateId(),
          name,
          issuer,
          date,
          included: true
        })
      } else if (line.startsWith('*') || line.startsWith('-') || line.match(/^\s+[*-]\s/)) {
        // Bullet format: "- Cert Name | Issuer | Year" or "- Cert (Issuer, Year)"
        const text = line.replace(/^[\s]*[*-]\s*/, '').trim()
        let name = text
        let issuer = ''
        let date = ''

        if (text.includes('|')) {
          const parts = text.split('|').map(p => p.trim())
          name = parts[0] || ''
          issuer = parts[1] || ''
          date = parts[2] || ''
        } else if (text.includes('(') && text.includes(')')) {
          const match = text.match(/^(.+?)\s*\((.+?)\)$/)
          if (match) {
            name = match[1].trim()
            const details = match[2].split(',').map(p => p.trim())
            issuer = details[0] || ''
            date = details[1] || ''
          }
        }

        data.certifications.push({
          id: generateId(),
          name,
          issuer,
          date,
          included: true
        })
      }
    } else if (currentSection === 'skills') {
      if (line && !line.startsWith('#')) {
        console.log('[Parser] Parsing skills line:', line)
        // Parse skills from comma-separated list or bullets
        // Handle multiple separators: comma, semicolon, pipe, bullets
        const skillText = line.replace(/^[*-]\s*/, '')
        const skills = skillText.split(/[,;|·•]/)
        skills.forEach(skill => {
          const trimmed = skill.trim()
          // Deduplicate (case-insensitive)
          if (trimmed && !data.skills.find(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
            console.log('[Parser] Adding skill:', trimmed)
            data.skills.push({
              id: generateId(),
              name: trimmed,
              included: true
            })
          }
        })
      } else if (line.startsWith('###')) {
        // Handle skill categories: ### Programming Languages
        // The skills will be on the next lines
        console.log('[Parser] Found skill category:', line)
      }
    } else if (currentSection === 'interests') {
      if (line && !line.startsWith('#')) {
        console.log('[Parser] Parsing interests line:', line)
        // Parse interests from comma-separated list or bullets
        // Handle multiple separators: comma, semicolon, pipe, bullets
        const interestText = line.replace(/^[*-]\s*/, '')
        const interests = interestText.split(/[,;|·•]/)
        interests.forEach(interest => {
          const trimmed = interest.trim()
          // Deduplicate (case-insensitive)
          if (trimmed && !data.interests.find(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
            console.log('[Parser] Adding interest:', trimmed)
            data.interests.push({
              id: generateId(),
              name: trimmed,
              included: true
            })
          }
        })
      } else if (line.startsWith('###')) {
        // Handle interest categories (rare but possible)
        console.log('[Parser] Found interest category:', line)
      }
    }
  }

  // Save last items
  if (currentExperience) data.workExperience.push(currentExperience)
  if (currentEducation) data.education.push(currentEducation)
  if (summaryLines.length > 0 && data.summaries.length === 0) {
    data.summaries.push({
      id: generateId(),
      text: summaryLines.join(' '),
      included: true
    })
  }

  // Add default entries if empty
  if (data.summaries.length === 0) {
    data.summaries.push({
      id: generateId(),
      text: '',
      included: true
    })
  }

  if (data.workExperience.length === 0) {
    data.workExperience.push({
      id: generateId(),
      company: '',
      role: '',
      dates: '',
      location: '',
      bullets: [{ id: generateId(), text: '', included: true }],
      included: true
    })
  }

    console.log('[Parser] Parse complete:', {
      hasContact: !!(data.contactInfo.firstName || data.contactInfo.email),
      summaries: data.summaries.length,
      experience: data.workExperience.length,
      education: data.education.length,
      certifications: data.certifications.length,
      skills: data.skills.length,
      interests: data.interests.length
    })

    return data
  } catch (error: any) {
    console.error('[Parser] Fatal error:', {
      error: error?.message || String(error),
      stack: error?.stack,
      markdownPreview: markdown.substring(0, 500)
    })

    // Return default empty structure
    return {
      contactInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        linkedin: '',
        location: '',
        firstNameIncluded: true,
        lastNameIncluded: true,
        emailIncluded: true,
        phoneIncluded: true,
        linkedinIncluded: true,
        locationIncluded: true
      },
      targetTitle: { text: '', included: true },
      summaries: [],
      workExperience: [],
      education: [],
      certifications: [],
      skills: [],
      interests: []
    }
  }
}

function convertToMarkdown(data: ResumeData): string {
  let md = ''

  // Contact info - respect individual field inclusion
  const nameParts = []
  if (data.contactInfo.firstNameIncluded && data.contactInfo.firstName) {
    nameParts.push(data.contactInfo.firstName)
  }
  if (data.contactInfo.lastNameIncluded && data.contactInfo.lastName) {
    nameParts.push(data.contactInfo.lastName)
  }
  if (nameParts.length > 0) {
    md += `# ${nameParts.join(' ')}\n\n`
  }
  
  const contactParts = []
  if (data.contactInfo.emailIncluded && data.contactInfo.email) {
    contactParts.push(data.contactInfo.email)
  }
  if (data.contactInfo.phoneIncluded && data.contactInfo.phone) {
    contactParts.push(data.contactInfo.phone)
  }
  if (data.contactInfo.linkedinIncluded && data.contactInfo.linkedin) {
    contactParts.push(data.contactInfo.linkedin)
  }
  if (data.contactInfo.locationIncluded && data.contactInfo.location) {
    contactParts.push(data.contactInfo.location)
  }
  if (contactParts.length > 0) {
    md += `${contactParts.join(' • ')}\n\n`
  }

  // Target title
  if (data.targetTitle.included && data.targetTitle.text) {
    md += `## ${data.targetTitle.text}\n\n`
  }

  // Summary
  const includedSummaries = data.summaries.filter(s => s.included)
  if (includedSummaries.length > 0) {
    md += `## Professional Summary\n\n`
    includedSummaries.forEach(s => {
      md += `${s.text}\n\n`
    })
  }

  // Work Experience
  const includedWork = data.workExperience.filter(w => w.included)
  if (includedWork.length > 0) {
    md += `## Work Experience\n\n`
    includedWork.forEach(exp => {
      md += `### ${exp.company} — ${exp.role}\n`
      md += `${exp.dates} • ${exp.location}\n\n`
      exp.bullets.filter(b => b.included).forEach(bullet => {
        md += `- ${bullet.text}\n`
      })
      md += `\n`
    })
  }

  // Education
  const includedEducation = data.education.filter(e => e.included)
  if (includedEducation.length > 0) {
    md += `## Education\n\n`
    includedEducation.forEach(edu => {
      md += `### ${edu.institution}\n`
      md += `${edu.degree} in ${edu.field} • ${edu.location}\n`
      if (edu.start || edu.end) {
        md += `${edu.start} - ${edu.end}\n`
      }
      if (edu.gpa) {
        md += `GPA: ${edu.gpa}\n`
      }
      if (edu.notes) {
        md += `${edu.notes}\n`
      }
      md += `\n`
    })
  }

  // Certifications
  const includedCertifications = data.certifications.filter(c => c.included)
  if (includedCertifications.length > 0) {
    md += `## Certifications\n\n`
    includedCertifications.forEach(cert => {
      if (cert.issuer && cert.date) {
        md += `### ${cert.name} — ${cert.issuer} (${cert.date})\n\n`
      } else if (cert.issuer) {
        md += `### ${cert.name} — ${cert.issuer}\n\n`
      } else {
        md += `### ${cert.name}\n\n`
      }
    })
  }

  // Skills
  const includedSkills = data.skills.filter(s => s.included)
  if (includedSkills.length > 0) {
    md += `## Skills\n\n`
    md += includedSkills.map(s => s.name).join(', ')
    md += `\n\n`
  }

  // Interests
  const includedInterests = data.interests.filter(i => i.included)
  if (includedInterests.length > 0) {
    md += `## Interests\n\n`
    md += includedInterests.map(i => i.name).join(', ')
    md += `\n\n`
  }

  return md
}

export default function StructuredResumeEditor({
  optimizedContent,
  optimizedId,
  jobTitle,
  companyName,
  onSave
}: StructuredResumeEditorProps) {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    contact: true,
    title: true,
    summary: true,
    work: true,
    education: true,
    skills: true,
    interests: true
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isGeneratingDOCX, setIsGeneratingDOCX] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  // Debug mode toggle (Shift+Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.ctrlKey && e.key === 'D') {
        e.preventDefault()
        setDebugMode(prev => {
          const newMode = !prev
          console.log('[Debug] Debug mode:', newMode ? 'ENABLED' : 'DISABLED')
          return newMode
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Initialize resume data from markdown
  useEffect(() => {
    if (optimizedContent && !resumeData) {
      try {
        const parsed = parseMarkdownToStructured(optimizedContent)
        setResumeData(parsed)
        setParseError(null)

        // Check if parse was successful (has at least contact info or summaries)
        const hasData = parsed.contactInfo.firstName || parsed.contactInfo.email || parsed.summaries.length > 0
        if (!hasData) {
          const errorMsg = 'Resume parser returned empty data. Check console for details.'
          setParseError(errorMsg)
          toast.error(errorMsg)
        }
      } catch (error: any) {
        const errorMsg = `Failed to parse resume: ${error?.message || 'Unknown error'}`
        setParseError(errorMsg)
        toast.error(errorMsg)
        console.error('[Editor] Parse error:', error)
      }
    }
  }, [optimizedContent, resumeData])

  // Build preview HTML
  const previewHtml = useMemo(() => {
    if (!resumeData) return ''

    let html = ''

    // Contact info - check individual field inclusion
    const nameParts = []
    if (resumeData.contactInfo.firstNameIncluded && resumeData.contactInfo.firstName) {
      nameParts.push(resumeData.contactInfo.firstName)
    }
    if (resumeData.contactInfo.lastNameIncluded && resumeData.contactInfo.lastName) {
      nameParts.push(resumeData.contactInfo.lastName)
    }
    if (nameParts.length > 0) {
      html += `<div class="text-2xl font-semibold tracking-tight mb-1">${nameParts.join(' ')}</div>`
    }
    
    const contactParts = []
    if (resumeData.contactInfo.emailIncluded && resumeData.contactInfo.email) {
      contactParts.push(resumeData.contactInfo.email)
    }
    if (resumeData.contactInfo.phoneIncluded && resumeData.contactInfo.phone) {
      contactParts.push(resumeData.contactInfo.phone)
    }
    if (resumeData.contactInfo.linkedinIncluded && resumeData.contactInfo.linkedin) {
      contactParts.push(resumeData.contactInfo.linkedin)
    }
    if (resumeData.contactInfo.locationIncluded && resumeData.contactInfo.location) {
      contactParts.push(resumeData.contactInfo.location)
    }
    if (contactParts.length > 0) {
      html += `<div class="text-sm text-neutral-400 mb-4">${contactParts.join(' • ')}</div>`
    }

    // Target title
    if (resumeData.targetTitle.included && resumeData.targetTitle.text) {
      html += `<div class="text-lg font-medium text-neutral-300 mb-4">${resumeData.targetTitle.text}</div>`
    }

    // Summaries
    const includedSummaries = resumeData.summaries.filter(s => s.included)
    if (includedSummaries.length > 0) {
      html += `<div class="pt-4 text-sm font-medium text-neutral-300">Professional Summary</div>`
      includedSummaries.forEach(s => {
        html += `<p class="mt-2 text-sm text-neutral-200">${s.text}</p>`
      })
    }

    // Work experience
    const includedWork = resumeData.workExperience.filter(w => w.included)
    if (includedWork.length > 0) {
      html += `<div class="pt-4 text-sm font-medium text-neutral-300">Work Experience</div>`
      includedWork.forEach(exp => {
        html += `<div class="mt-3">
          <div class="font-medium">${exp.company}</div>
          <div class="text-neutral-300">${exp.role}</div>
          <div class="text-xs text-neutral-500">${exp.dates} • ${exp.location}</div>
          <ul class="list-disc pl-5 mt-2 space-y-1 text-sm text-neutral-200">`
        exp.bullets.filter(b => b.included).forEach(bullet => {
          html += `<li>${bullet.text}</li>`
        })
        html += `</ul></div>`
      })
    }

    // Education
    const includedEducation = resumeData.education.filter(e => e.included)
    if (includedEducation.length > 0) {
      html += `<div class="pt-4 text-sm font-medium text-neutral-300">Education</div>`
      includedEducation.forEach(edu => {
        html += `<div class="mt-2">
          <div class="font-medium">${edu.institution}</div>
          <div class="text-neutral-300">${edu.degree}${edu.field ? ` • ${edu.field}` : ''}</div>
          <div class="text-xs text-neutral-500">${[edu.start, edu.end].filter(Boolean).join(' – ')}${edu.location ? ` • ${edu.location}` : ''}</div>
          ${edu.notes ? `<p class="text-sm text-neutral-200 mt-1">${edu.notes}</p>` : ''}
        </div>`
      })
    }

    // Certifications
    const includedCertifications = resumeData.certifications.filter(c => c.included)
    if (includedCertifications.length > 0) {
      html += `<div class="pt-4 text-sm font-medium text-neutral-300">Certifications</div>`
      includedCertifications.forEach(cert => {
        html += `<div class="mt-2">
          <div class="font-medium">${cert.name}</div>
          ${cert.issuer ? `<div class="text-neutral-300">${cert.issuer}</div>` : ''}
          ${cert.date ? `<div class="text-xs text-neutral-500">${cert.date}</div>` : ''}
        </div>`
      })
    }

    // Skills
    const includedSkills = resumeData.skills.filter(s => s.included)
    if (includedSkills.length > 0) {
      html += `<div class="pt-4 text-sm font-medium text-neutral-300">Skills</div>
        <div class="mt-2 flex flex-wrap gap-2">`
      includedSkills.forEach(s => {
        html += `<span class="text-xs px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-100">${s.name}</span>`
      })
      html += `</div>`
    }

    // Interests
    const includedInterests = resumeData.interests.filter(i => i.included)
    if (includedInterests.length > 0) {
      html += `<div class="pt-4 text-sm font-medium text-neutral-300">Interests</div>
        <div class="mt-2 flex flex-wrap gap-2">`
      includedInterests.forEach(i => {
        html += `<span class="text-xs px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-100">${i.name}</span>`
      })
      html += `</div>`
    }

    return html
  }, [resumeData])

  // Count included items
  const includedCount = useMemo(() => {
    if (!resumeData) return 0
    let count = 0
    // Count individual contact fields that are included
    if (resumeData.contactInfo.firstNameIncluded) count++
    if (resumeData.contactInfo.lastNameIncluded) count++
    if (resumeData.contactInfo.emailIncluded) count++
    if (resumeData.contactInfo.phoneIncluded) count++
    if (resumeData.contactInfo.linkedinIncluded) count++
    if (resumeData.contactInfo.locationIncluded) count++
    if (resumeData.targetTitle.included) count++
    count += resumeData.summaries.filter(s => s.included).length
    count += resumeData.workExperience.filter(w => w.included).length
    resumeData.workExperience.forEach(exp => {
      count += exp.bullets.filter(b => b.included).length
    })
    count += resumeData.education.filter(e => e.included).length
    count += resumeData.skills.filter(s => s.included).length
    count += resumeData.interests.filter(i => i.included).length
    return count
  }, [resumeData])

  // Handlers
  const handleSave = async () => {
    if (!resumeData || !optimizedId) return
    
    setIsSaving(true)
    try {
      const markdown = convertToMarkdown(resumeData)
      const response = await fetch(`/api/resumes/optimized/${optimizedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optimized_content: markdown })
      })

      if (!response.ok) throw new Error('Failed to save')
      
      if (onSave) await onSave(resumeData)
      toast.success('Resume saved successfully')
    } catch (error) {
      toast.error('Failed to save resume')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadPDF = () => {
    if (!resumeData) return
    
    setIsGeneratingPDF(true)
    try {
      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) {
        toast.error('Please allow popups to download PDF')
        return
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${resumeData.contactInfo.firstName} ${resumeData.contactInfo.lastName} - Resume</title>
            <meta charset="utf-8" />
            <style>
              @media print {
                @page { margin: 0.5in; size: letter; }
              }
              body { 
                font-family: system-ui, -apple-system, sans-serif;
                color: #111;
                line-height: 1.5;
                padding: 32px;
                max-width: 8.5in;
                margin: 0 auto;
              }
              h1 { font-size: 24px; margin: 0 0 4px 0; font-weight: 600; }
              h2 { font-size: 16px; margin: 16px 0 8px 0; font-weight: 600; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
              .contact { font-size: 12px; color: #666; margin-bottom: 16px; }
              .section { margin-bottom: 16px; }
              .job { margin-bottom: 12px; }
              .job-title { font-weight: 600; font-size: 14px; }
              .job-meta { font-size: 11px; color: #666; margin-bottom: 4px; }
              ul { margin: 4px 0 0 20px; padding: 0; }
              li { margin-bottom: 2px; font-size: 13px; }
              .skills, .interests { display: inline; font-size: 13px; }
              .skills span, .interests span { margin-right: 8px; }
            </style>
          </head>
          <body>
            <h1>${resumeData.contactInfo.firstName} ${resumeData.contactInfo.lastName}</h1>
            <div class="contact">${[resumeData.contactInfo.email, resumeData.contactInfo.phone, resumeData.contactInfo.linkedin, resumeData.contactInfo.location].filter(Boolean).join(' • ')}</div>
            
            ${resumeData.targetTitle.included && resumeData.targetTitle.text ? `<div style="font-weight: 500; margin-bottom: 12px;">${resumeData.targetTitle.text}</div>` : ''}
            
            ${resumeData.summaries.filter(s => s.included).length > 0 ? `
              <h2>Professional Summary</h2>
              ${resumeData.summaries.filter(s => s.included).map(s => `<p style="margin: 8px 0; font-size: 13px;">${s.text}</p>`).join('')}
            ` : ''}
            
            ${resumeData.workExperience.filter(w => w.included).length > 0 ? `
              <h2>Work Experience</h2>
              ${resumeData.workExperience.filter(w => w.included).map(exp => `
                <div class="job">
                  <div class="job-title">${exp.company} — ${exp.role}</div>
                  <div class="job-meta">${exp.dates} • ${exp.location}</div>
                  <ul>
                    ${exp.bullets.filter(b => b.included).map(b => `<li>${b.text}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            ` : ''}
            
            ${resumeData.education.filter(e => e.included).length > 0 ? `
              <h2>Education</h2>
              ${resumeData.education.filter(e => e.included).map(edu => `
                <div style="margin-bottom: 8px;">
                  <div style="font-weight: 600; font-size: 14px;">${edu.institution}</div>
                  <div style="font-size: 13px;">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</div>
                  <div style="font-size: 11px; color: #666;">${[edu.start, edu.end].filter(Boolean).join(' – ')}${edu.location ? ` • ${edu.location}` : ''}</div>
                  ${edu.notes ? `<div style="font-size: 12px; margin-top: 4px;">${edu.notes}</div>` : ''}
                </div>
              `).join('')}
            ` : ''}
            
            ${resumeData.skills.filter(s => s.included).length > 0 ? `
              <h2>Skills</h2>
              <div class="skills">${resumeData.skills.filter(s => s.included).map(s => s.name).join(', ')}</div>
            ` : ''}
            
            ${resumeData.interests.filter(i => i.included).length > 0 ? `
              <h2>Interests</h2>
              <div class="interests">${resumeData.interests.filter(i => i.included).map(i => i.name).join(', ')}</div>
            ` : ''}
            
            <script>
              window.onload = () => {
                setTimeout(() => window.print(), 100)
                window.onafterprint = () => window.close()
              }
            </script>
          </body>
        </html>
      `

      printWindow.document.write(html)
      printWindow.document.close()
      toast.success('PDF download started')
    } catch (error) {
      toast.error('Failed to generate PDF')
      console.error(error)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleDownloadDOCX = async () => {
    if (!resumeData) return
    
    setIsGeneratingDOCX(true)
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Header
            new Paragraph({
              text: `${resumeData.contactInfo.firstName} ${resumeData.contactInfo.lastName}`,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: [resumeData.contactInfo.email, resumeData.contactInfo.phone, resumeData.contactInfo.linkedin, resumeData.contactInfo.location].filter(Boolean).join(' • '),
                  size: 18
                })
              ],
              spacing: { after: 200 }
            }),

            // Target Title
            ...(resumeData.targetTitle.included && resumeData.targetTitle.text ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: resumeData.targetTitle.text,
                    bold: true
                  })
                ],
                spacing: { after: 200 }
              })
            ] : []),

            // Professional Summary
            ...(resumeData.summaries.filter(s => s.included).length > 0 ? [
              new Paragraph({
                text: "Professional Summary",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 }
              }),
              ...resumeData.summaries.filter(s => s.included).map(s =>
                new Paragraph({
                  text: s.text,
                  spacing: { after: 100 }
                })
              )
            ] : []),

            // Work Experience
            ...(resumeData.workExperience.filter(w => w.included).length > 0 ? [
              new Paragraph({
                text: "Work Experience",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 }
              }),
              ...resumeData.workExperience.filter(w => w.included).flatMap(exp => [
                new Paragraph({
                  text: `${exp.company} — ${exp.role}`,
                  heading: HeadingLevel.HEADING_3,
                  spacing: { before: 100 }
                }),
                new Paragraph({
                  text: `${exp.dates} • ${exp.location}`,
                  spacing: { after: 50 }
                }),
                ...exp.bullets.filter(b => b.included).map(bullet =>
                  new Paragraph({
                    text: `• ${bullet.text}`,
                    spacing: { after: 50 }
                  })
                )
              ])
            ] : []),

            // Education
            ...(resumeData.education.filter(e => e.included).length > 0 ? [
              new Paragraph({
                text: "Education",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 }
              }),
              ...resumeData.education.filter(e => e.included).flatMap(edu => [
                new Paragraph({
                  text: edu.institution,
                  heading: HeadingLevel.HEADING_3,
                  spacing: { before: 100 }
                }),
                new Paragraph({
                  text: `${edu.degree}${edu.field ? ` in ${edu.field}` : ''} • ${edu.location}`,
                  spacing: { after: 50 }
                }),
                ...(edu.notes ? [new Paragraph({ text: edu.notes, spacing: { after: 50 } })] : [])
              ])
            ] : []),

            // Skills
            ...(resumeData.skills.filter(s => s.included).length > 0 ? [
              new Paragraph({
                text: "Skills",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 }
              }),
              new Paragraph({
                text: resumeData.skills.filter(s => s.included).map(s => s.name).join(', '),
                spacing: { after: 100 }
              })
            ] : []),

            // Interests
            ...(resumeData.interests.filter(i => i.included).length > 0 ? [
              new Paragraph({
                text: "Interests",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 }
              }),
              new Paragraph({
                text: resumeData.interests.filter(i => i.included).map(i => i.name).join(', ')
              })
            ] : [])
          ]
        }]
      })

      const blob = await Packer.toBlob(doc)
      saveAs(blob, `${resumeData.contactInfo.firstName}_${resumeData.contactInfo.lastName}_Resume.docx`)
      toast.success('Resume downloaded as DOCX')
    } catch (error) {
      toast.error('Failed to generate DOCX')
      console.error(error)
    } finally {
      setIsGeneratingDOCX(false)
    }
  }

  const handleCopyToClipboard = async () => {
    if (!resumeData) return
    
    try {
      const text = convertToMarkdown(resumeData)
      await navigator.clipboard.writeText(text)
      toast.success('Resume copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Update functions
  const updateContactInfo = (field: keyof ContactInfo, value: string | boolean) => {
    if (!resumeData) return
    setResumeData({
      ...resumeData,
      contactInfo: { ...resumeData.contactInfo, [field]: value }
    })
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const addWorkBullet = (expId: string) => {
    if (!resumeData) return
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map(exp =>
        exp.id === expId
          ? { ...exp, bullets: [...exp.bullets, { id: generateId(), text: '', included: true }] }
          : exp
      )
    })
  }

  const removeWorkBullet = (expId: string, bulletId: string) => {
    if (!resumeData) return
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map(exp =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.filter(b => b.id !== bulletId) }
          : exp
      )
    })
  }

  const updateWorkBullet = (expId: string, bulletId: string, text: string) => {
    if (!resumeData) return
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map(exp =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.map(b => b.id === bulletId ? { ...b, text } : b)
            }
          : exp
      )
    })
  }

  const addSkill = (name: string) => {
    if (!resumeData || !name.trim()) return
    setResumeData({
      ...resumeData,
      skills: [...resumeData.skills, { id: generateId(), name: name.trim(), included: true }]
    })
  }

  const removeSkill = (id: string) => {
    if (!resumeData) return
    setResumeData({
      ...resumeData,
      skills: resumeData.skills.filter(s => s.id !== id)
    })
  }

  if (!resumeData) {
    return <div className="text-center py-12">Loading resume data...</div>
  }

  // Fallback: Show raw markdown if there's a critical parse error
  if (parseError && !resumeData.contactInfo.firstName && resumeData.summaries.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Parse Error</h3>
          <p className="text-sm text-red-300 mb-4">{parseError}</p>
          <p className="text-xs text-neutral-400">Showing raw markdown below. Check browser console for detailed error logs.</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 overflow-auto">
          <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-mono">
            {optimizedContent}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Optimized Resume</h2>
          <p className="text-sm text-white/60 mt-1">
            Tailored to: {jobTitle} — {companyName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 rounded-full py-2 px-3 hover:bg-white/20 transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 rounded-full py-2 px-3 hover:bg-white/20 transition-colors"
          >
            <CopyIcon className="h-4 w-4" />
            Copy
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-3 hover:bg-emerald-400 transition-colors disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isGeneratingPDF ? 'Generating...' : 'PDF'}
          </button>
          <button
            onClick={handleDownloadDOCX}
            disabled={isGeneratingDOCX}
            className="inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 rounded-full py-2 px-3 hover:bg-white/20 transition-colors disabled:opacity-60"
          >
            <FileText className="h-4 w-4" />
            {isGeneratingDOCX ? 'Generating...' : 'DOCX'}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Editor Panel */}
        <section className="space-y-6">
          {/* Contact Information */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800">
              <button
                type="button"
                onClick={() => toggleSection('contact')}
                className="group inline-flex items-center gap-3"
              >
                <span className="h-7 w-7 rounded-md bg-neutral-800 flex items-center justify-center">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.contact ? '' : '-rotate-90'}`} />
                </span>
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold">Contact Information</h3>
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm font-medium">
                <Wand2 className="h-4 w-4" />
                Enhance
              </button>
            </div>
            {expandedSections.contact && (
              <div className="px-4 sm:px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">First name</label>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={resumeData.contactInfo.firstNameIncluded}
                        onChange={(e) => updateContactInfo('firstNameIncluded', e.target.checked)}
                      />
                      <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                        <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                      </span>
                    </label>
                    <input
                      type="text"
                      value={resumeData.contactInfo.firstName}
                      onChange={(e) => updateContactInfo('firstName', e.target.value)}
                      className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Last name</label>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={resumeData.contactInfo.lastNameIncluded}
                        onChange={(e) => updateContactInfo('lastNameIncluded', e.target.checked)}
                      />
                      <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                        <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                      </span>
                    </label>
                    <input
                      type="text"
                      value={resumeData.contactInfo.lastName}
                      onChange={(e) => updateContactInfo('lastName', e.target.value)}
                      className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Contact details */}
                <div className="sm:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {(['email', 'phone', 'linkedin', 'location'] as const).map(field => {
                    const includedField = `${field}Included` as keyof ContactInfo
                    return (
                      <div key={field}>
                        <label className="block text-sm text-neutral-300 mb-2 capitalize">{field}</label>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={resumeData.contactInfo[includedField] as boolean}
                              onChange={(e) => updateContactInfo(includedField, e.target.checked)}
                            />
                            <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                              <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                            </span>
                          </label>
                          <input
                            type="text"
                            value={resumeData.contactInfo[field]}
                            onChange={(e) => updateContactInfo(field, e.target.value)}
                            className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Target Title */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800">
              <button
                type="button"
                onClick={() => toggleSection('title')}
                className="group inline-flex items-center gap-3"
              >
                <span className="h-7 w-7 rounded-md bg-neutral-800 flex items-center justify-center">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.title ? '' : '-rotate-90'}`} />
                </span>
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold">Target Title</h3>
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm font-medium">
                <Wand2 className="h-4 w-4" />
                Suggest
              </button>
            </div>
            {expandedSections.title && (
              <div className="px-4 sm:px-6 py-5">
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={resumeData.targetTitle.included}
                      onChange={(e) => setResumeData({ ...resumeData, targetTitle: { ...resumeData.targetTitle, included: e.target.checked } })}
                    />
                    <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                      <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                    </span>
                  </label>
                  <input
                    type="text"
                    value={resumeData.targetTitle.text}
                    onChange={(e) => setResumeData({ ...resumeData, targetTitle: { ...resumeData.targetTitle, text: e.target.value } })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g., Senior UX Designer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Professional Summary */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800">
              <button
                type="button"
                onClick={() => toggleSection('summary')}
                className="group inline-flex items-center gap-3"
              >
                <span className="h-7 w-7 rounded-md bg-neutral-800 flex items-center justify-center">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.summary ? '' : '-rotate-90'}`} />
                </span>
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold">Professional Summary</h3>
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm font-medium">
                <Wand2 className="h-4 w-4" />
                Generate
              </button>
            </div>
            {expandedSections.summary && (
              <div className="px-4 sm:px-6 py-5 space-y-4">
                {resumeData.summaries.map((summary, idx) => (
                  <div key={summary.id} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <label className="relative inline-flex items-center mt-1">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={summary.included}
                          onChange={(e) => setResumeData({
                            ...resumeData,
                            summaries: resumeData.summaries.map((s, i) =>
                              i === idx ? { ...s, included: e.target.checked } : s
                            )
                          })}
                        />
                        <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                          <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={summary.text}
                        onChange={(e) => setResumeData({
                          ...resumeData,
                          summaries: resumeData.summaries.map((s, i) =>
                            i === idx ? { ...s, text: e.target.value } : s
                          )
                        })}
                        className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                        placeholder={idx === 0 ? "Professional summary" : "Alternative summary (optional)"}
                      />
                    </div>
                  </div>
                ))}
                {resumeData.summaries.length < 3 && (
                  <button
                    onClick={() => setResumeData({
                      ...resumeData,
                      summaries: [...resumeData.summaries, { id: generateId(), text: '', included: false }]
                    })}
                    className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add alternative summary
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Work Experience */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800">
              <button
                type="button"
                onClick={() => toggleSection('work')}
                className="group inline-flex items-center gap-3"
              >
                <span className="h-7 w-7 rounded-md bg-neutral-800 flex items-center justify-center">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.work ? '' : '-rotate-90'}`} />
                </span>
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold">Work Experience</h3>
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm font-medium">
                <Wand2 className="h-4 w-4" />
                Generate bullets
              </button>
            </div>
            {expandedSections.work && (
              <div className="px-4 sm:px-6 py-5 space-y-5">
                {resumeData.workExperience.map((exp, idx) => (
                  <div key={exp.id} className="rounded-xl border border-neutral-800 bg-neutral-950/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={exp.included}
                            onChange={(e) => setResumeData({
                              ...resumeData,
                              workExperience: resumeData.workExperience.map((w, i) =>
                                i === idx ? { ...w, included: e.target.checked } : w
                              )
                            })}
                          />
                          <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                            <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                          </span>
                        </label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => setResumeData({
                            ...resumeData,
                            workExperience: resumeData.workExperience.map((w, i) =>
                              i === idx ? { ...w, company: e.target.value } : w
                            )
                          })}
                          className="bg-transparent border border-neutral-800 rounded-md px-2.5 py-1.5 text-sm"
                          placeholder="Company"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => setResumeData({
                            ...resumeData,
                            workExperience: resumeData.workExperience.map((w, i) =>
                              i === idx ? { ...w, role: e.target.value } : w
                            )
                          })}
                          className="bg-transparent border border-neutral-800 rounded-md px-2.5 py-1.5 text-sm"
                          placeholder="Role"
                        />
                        <input
                          type="text"
                          value={exp.dates}
                          onChange={(e) => setResumeData({
                            ...resumeData,
                            workExperience: resumeData.workExperience.map((w, i) =>
                              i === idx ? { ...w, dates: e.target.value } : w
                            )
                          })}
                          className="bg-transparent border border-neutral-800 rounded-md px-2.5 py-1.5 text-sm"
                          placeholder="Dates"
                        />
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {exp.bullets.map((bullet) => (
                        <div key={bullet.id} className="flex items-start gap-2">
                          <label className="relative inline-flex items-center mt-1">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={bullet.included}
                              onChange={(e) => setResumeData({
                                ...resumeData,
                                workExperience: resumeData.workExperience.map((w, i) =>
                                  i === idx ? {
                                    ...w,
                                    bullets: w.bullets.map(b =>
                                      b.id === bullet.id ? { ...b, included: e.target.checked } : b
                                    )
                                  } : w
                                )
                              })}
                            />
                            <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                              <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                            </span>
                          </label>
                          <textarea
                            rows={2}
                            value={bullet.text}
                            onChange={(e) => updateWorkBullet(exp.id, bullet.id, e.target.value)}
                            className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                            placeholder="Describe your achievement or responsibility"
                          />
                          <button
                            onClick={() => removeWorkBullet(exp.id, bullet.id)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800 mt-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      <div className="flex pt-2 items-center justify-between">
                        <button
                          onClick={() => addWorkBullet(exp.id)}
                          className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
                        >
                          <Plus className="h-4 w-4" />
                          Add bullet
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800">
              <button
                type="button"
                onClick={() => toggleSection('skills')}
                className="group inline-flex items-center gap-3"
              >
                <span className="h-7 w-7 rounded-md bg-neutral-800 flex items-center justify-center">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.skills ? '' : '-rotate-90'}`} />
                </span>
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold">Skills</h3>
              </button>
              <button 
                onClick={() => {
                  // Generate skills
                  const suggestions = ['Usability Testing', 'A/B Testing', 'Information Architecture', 'Accessibility (WCAG)', 'Journey Mapping']
                  const currentSkills = new Set(resumeData.skills.map(s => s.name.toLowerCase()))
                  let added = 0
                  for (const skill of suggestions) {
                    if (!currentSkills.has(skill.toLowerCase())) {
                      addSkill(skill)
                      added++
                      if (added >= 3) break
                    }
                  }
                  if (added > 0) toast.success(`Added ${added} skill${added > 1 ? 's' : ''}`)
                }}
                className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm font-medium"
              >
                <Wand2 className="h-4 w-4" />
                Generate skills
              </button>
            </div>
            {expandedSections.skills && (
              <div className="px-4 sm:px-6 py-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.map((skill) => (
                    <div key={skill.id} className="skill-row group relative">
                      <label className="inline-block cursor-pointer">
                        <input
                          type="checkbox"
                          className="peer sr-only include-checkbox"
                          checked={skill.included}
                          onChange={(e) => setResumeData({
                            ...resumeData,
                            skills: resumeData.skills.map(s =>
                              s.id === skill.id ? { ...s, included: e.target.checked } : s
                            )
                          })}
                        />
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-700 ring-1 ring-inset ring-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-sm text-neutral-100 transition peer-checked:border-emerald-600 peer-checked:ring-emerald-600/40">
                          <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                            <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                          </span>
                          <span 
                            className="skill-label"
                            onDoubleClick={() => {
                              const newName = prompt('Edit skill', skill.name)
                              if (newName && newName.trim()) {
                                setResumeData({
                                  ...resumeData,
                                  skills: resumeData.skills.map(s =>
                                    s.id === skill.id ? { ...s, name: newName.trim() } : s
                                  )
                                })
                              }
                            }}
                          >
                            {skill.name}
                          </span>
                        </span>
                      </label>
                      <button
                        onClick={() => removeSkill(skill.id)}
                        className="absolute -top-2 -right-2 hidden group-hover:inline-flex items-center justify-center h-6 w-6 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex pt-2">
                  <button
                    onClick={() => {
                      const name = prompt('Add skill')
                      if (name && name.trim()) addSkill(name.trim())
                    }}
                    className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add skill
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interests */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800">
              <button
                type="button"
                onClick={() => toggleSection('interests')}
                className="group inline-flex items-center gap-3"
              >
                <span className="h-7 w-7 rounded-md bg-neutral-800 flex items-center justify-center">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.interests ? '' : '-rotate-90'}`} />
                </span>
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold">Interests</h3>
              </button>
              <button 
                onClick={() => {
                  const suggestions = ['Photography', 'Hiking', 'Reading', 'Chess', 'Cooking']
                  const currentInterests = new Set(resumeData.interests.map(i => i.name.toLowerCase()))
                  let added = 0
                  for (const interest of suggestions) {
                    if (!currentInterests.has(interest.toLowerCase())) {
                      setResumeData({
                        ...resumeData,
                        interests: [...resumeData.interests, { id: generateId(), name: interest, included: true }]
                      })
                      added++
                      if (added >= 3) break
                    }
                  }
                  if (added > 0) toast.success(`Added ${added} interest${added > 1 ? 's' : ''}`)
                }}
                className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm font-medium"
              >
                <Wand2 className="h-4 w-4" />
                Generate interests
              </button>
            </div>
            {expandedSections.interests && (
              <div className="px-4 sm:px-6 py-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {resumeData.interests.map((interest) => (
                    <div key={interest.id} className="interest-row group relative">
                      <label className="inline-block cursor-pointer">
                        <input
                          type="checkbox"
                          className="peer sr-only include-checkbox"
                          checked={interest.included}
                          onChange={(e) => setResumeData({
                            ...resumeData,
                            interests: resumeData.interests.map(i =>
                              i.id === interest.id ? { ...i, included: e.target.checked } : i
                            )
                          })}
                        />
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-700 ring-1 ring-inset ring-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-sm text-neutral-100 transition peer-checked:border-emerald-600 peer-checked:ring-emerald-600/40">
                          <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                            <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                          </span>
                          <span 
                            className="interest-label"
                            onDoubleClick={() => {
                              const newName = prompt('Edit interest', interest.name)
                              if (newName && newName.trim()) {
                                setResumeData({
                                  ...resumeData,
                                  interests: resumeData.interests.map(i =>
                                    i.id === interest.id ? { ...i, name: newName.trim() } : i
                                  )
                                })
                              }
                            }}
                          >
                            {interest.name}
                          </span>
                        </span>
                      </label>
                      <button
                        onClick={() => setResumeData({
                          ...resumeData,
                          interests: resumeData.interests.filter(i => i.id !== interest.id)
                        })}
                        className="absolute -top-2 -right-2 hidden group-hover:inline-flex items-center justify-center h-6 w-6 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex pt-2">
                  <button
                    onClick={() => {
                      const name = prompt('Add interest')
                      if (name && name.trim()) {
                        setResumeData({
                          ...resumeData,
                          interests: [...resumeData.interests, { id: generateId(), name: name.trim(), included: true }]
                        })
                      }
                    }}
                    className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add interest
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: Preview Panel */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            <div className="h-28 w-full bg-gradient-to-br from-neutral-800 to-neutral-900 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl tracking-tight font-semibold">Live Preview</h3>
                <button
                  onClick={handleCopyToClipboard}
                  className="inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium"
                >
                  <CopyIcon className="h-4 w-4" />
                  Copy
                </button>
              </div>
              <div
                className="space-y-4 text-sm leading-6"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Included parts</h4>
              <span className="text-xs text-white/60">{includedCount} selected</span>
            </div>
            <p className="text-xs text-white/60">
              Use the checkboxes in the editor to include or exclude any field, summary, or bullet from this variant.
            </p>
          </div>
        </aside>
      </div>

      {/* Debug Overlay */}
      {debugMode && resumeData && (
        <div className="fixed bottom-4 right-4 max-w-md rounded-xl border border-emerald-500/50 bg-black/90 backdrop-blur-xl p-4 shadow-2xl z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              🐛 Debug Info
            </h3>
            <button
              onClick={() => setDebugMode(false)}
              className="text-white/60 hover:text-white"
              title="Close (or press Shift+Ctrl+D)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-white/60">Contact:</div>
              <div className="text-white">{resumeData.contactInfo.firstName || resumeData.contactInfo.email ? '✓' : '✗'}</div>

              <div className="text-white/60">Summaries:</div>
              <div className="text-white">{resumeData.summaries.length}</div>

              <div className="text-white/60">Experience:</div>
              <div className="text-white">{resumeData.workExperience.length}</div>

              <div className="text-white/60">Education:</div>
              <div className="text-white">{resumeData.education.length}</div>

              <div className="text-white/60">Certifications:</div>
              <div className="text-white">{resumeData.certifications.length}</div>

              <div className="text-white/60">Skills:</div>
              <div className="text-white">{resumeData.skills.length}</div>

              <div className="text-white/60">Interests:</div>
              <div className="text-white">{resumeData.interests.length}</div>
            </div>
            <div className="pt-2 border-t border-white/10 text-white/60">
              Press <kbd className="px-1 py-0.5 bg-white/10 rounded">Shift+Ctrl+D</kbd> to toggle
            </div>
          </div>
        </div>
      )}
    </>
  )
}
