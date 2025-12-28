/**
 * Resume content parser
 * Extracts structured sections from markdown resume content
 * Handles various LLM output formats flexibly
 */

export interface ContactInfo {
  name: string
  location?: string
  phone?: string
  email?: string
  linkedin?: string
  website?: string
}

export interface WorkExperienceItem {
  company: string
  title: string
  location?: string
  startDate?: string
  endDate?: string
  employmentType?: string
  bullets: string[]
}

export interface EducationItem {
  institution: string
  degree?: string
  field?: string
  graduationDate?: string
  notes?: string
}

export interface CertificationItem {
  name: string
  issuer?: string
  date?: string
}

export interface ProjectItem {
  name: string
  description?: string
  technologies?: string[]
  bullets: string[]
}

export interface VolunteerItem {
  organization: string
  role?: string
  dates?: string
  description?: string
}

export interface PublicationItem {
  title: string
  publisher?: string
  date?: string
  description?: string
}

export interface ParsedResume {
  contact: ContactInfo
  targetTitle?: string
  summary?: string
  workExperience: WorkExperienceItem[]
  education: EducationItem[]
  skills: string[]
  interests: string[]
  certifications: CertificationItem[]
  awards: string[]
  projects: ProjectItem[]
  volunteering: VolunteerItem[]
  publications: PublicationItem[]
}

/**
 * Check if a line looks like a job/company header
 * Handles various formats:
 * - ### Company Name
 * - **Company Name**
 * - **Job Title** at Company
 * - **Job Title**  Company Name, Location
 * - Company Name — Location
 */
function isJobHeader(line: string): boolean {
  // ### Header format
  if (line.startsWith('### ')) return true

  // **Bold text** anywhere in line (not just at end)
  if (line.match(/^\*\*[^*]+\*\*/)) return true

  // Company — Location format (em dash)
  if (line.match(/^[A-Z][^—\n]+\s*[—–-]\s*[A-Z]/)) return true

  // Title line without markdown but with company indicators
  // e.g., "Senior Designer at Tech Corp"
  if (line.match(/^[A-Z][a-zA-Z\s]+(?:at|@|,)\s+[A-Z]/)) return true

  return false
}

/**
 * Check if a line looks like a date range
 */
function isDateLine(line: string): boolean {
  // Matches: Jan 2020 - Present, 2019 – 2022, Jan 2020 – Dec 2022, etc.
  return !!line.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\s*[-–—]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Current|\d{4})/i)
}

/**
 * Extract dates from a line
 */
function extractDates(line: string): { startDate?: string, endDate?: string } {
  const dateMatch = line.match(/(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s*)?(\d{4})\s*[-–—]\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s*)?(\d{4}|Present|Current)/i)
  if (dateMatch) {
    const startMonth = dateMatch[1] || ''
    const startYear = dateMatch[2]
    const endMonth = dateMatch[3] || ''
    const endYear = dateMatch[4]
    return {
      startDate: startMonth ? `${startMonth} ${startYear}` : startYear,
      endDate: endYear === 'Present' || endYear === 'Current' ? 'Present' : (endMonth ? `${endMonth} ${endYear}` : endYear)
    }
  }
  return {}
}

/**
 * Parse markdown resume content into structured data
 */
export function parseResumeContent(content: string): ParsedResume {
  const lines = content.split('\n')
  const result: ParsedResume = {
    contact: { name: '' },
    workExperience: [],
    education: [],
    skills: [],
    interests: [],
    certifications: [],
    awards: [],
    projects: [],
    volunteering: [],
    publications: [],
  }

  let currentSection = ''
  let currentSubsection: any = null
  let buffer: string[] = []

  // Extract name - try multiple formats
  let nameFound = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Skip section headers (Professional Summary, Work Experience, etc.)
    const sectionKeywords = ['summary', 'experience', 'education', 'skill', 'contact', 'professional', 'work', 'objective']
    const lowerTrimmed = trimmed.toLowerCase()
    if (sectionKeywords.some(kw => lowerTrimmed.includes(kw))) continue

    // Skip placeholder text
    if (trimmed.includes('[Email') || trimmed.includes('[Phone') || trimmed.includes('[LinkedIn')) continue

    // Format 1: # Name or ## Name or ### Name (markdown heading)
    if (trimmed.match(/^#{1,3}\s+/)) {
      const name = trimmed.replace(/^#+\s*/, '').replace(/\*+/g, '').trim()
      if (name && name.length < 60) {
        result.contact.name = name
        nameFound = true
        break
      }
    }

    // Format 2: **Name** (bold at start) - can have trailing text
    const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch && !trimmed.includes('@') && !trimmed.includes('|') && !trimmed.includes('[') && boldMatch[1].split(' ').length <= 5) {
      result.contact.name = boldMatch[1].trim()
      nameFound = true
      break
    }

    // Format 3: First non-empty line that looks like a name (no special chars, not too long)
    if (!trimmed.includes('@') &&
      !trimmed.includes('|') &&
      !trimmed.includes(':') &&
      !trimmed.includes('[') &&
      !trimmed.startsWith('-') &&
      !trimmed.startsWith('*') &&
      !trimmed.startsWith('#') &&
      !trimmed.match(/^\d/) &&
      trimmed.length < 60 &&
      trimmed.split(' ').length <= 5) {
      result.contact.name = trimmed.replace(/\*+/g, '').trim()
      nameFound = true
      break
    }
  }

  // Extract target title early in document (after name/contact, before summary)
  // Look in first 30 lines - this catches cases where target title is bold text without a section header
  let contactInfoFound = false
  let nameLineIndex = -1
  const maxLinesToCheck = Math.min(30, lines.length)
  
  // Find where name appears to start looking after it
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim()
    if (line && (result.contact.name || line.match(/^#{1,3}\s+/) || line.match(/^\*\*[^*]+\*\*/))) {
      nameLineIndex = i
      break
    }
  }
  
  // Start checking from after name (or from beginning if name not found)
  const startIndex = nameLineIndex >= 0 ? nameLineIndex + 1 : 0
  
  for (let i = startIndex; i < maxLinesToCheck; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Skip if we've already found target title
    if (result.targetTitle) break

    // Track when we've passed contact info (email, phone, location, etc.)
    if (line.includes('@') || 
        (line.includes('|') && (line.includes('@') || line.match(/[\+]?[\d\s\-\(\)]{10,}/))) ||
        line.match(/[\+]?[\d\s\-\(\)]{10,}/) || 
        (line.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2,})?$/) && !result.targetTitle)) {
      contactInfoFound = true
      continue
    }

    // Skip section headers - if we hit a major section, stop looking
    if (line.match(/^#{2,3}\s+/)) {
      const sectionName = line.replace(/^#+\s*/, '').replace(/\*+/g, '').trim().toLowerCase()
      if (sectionName.includes('summary') || sectionName.includes('experience') || sectionName.includes('education') || 
          sectionName.includes('skill') || sectionName.includes('work') || sectionName.includes('professional')) {
        break // We've hit a major section, stop looking
      }
      // If it's a target section header, let the normal parsing handle it
      if (sectionName.includes('target') || sectionName.includes('headline')) {
        break
      }
      continue
    }

    // Extract target title from bold text (prefer after contact info, but also check before)
    // Format: **Target Title** (bold text)
    const boldMatch = line.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      const potentialTitle = boldMatch[1].trim()
      // Validate it looks like a job title (not too short, not too long, doesn't look like contact info or name)
      if (potentialTitle.length >= 5 && 
          potentialTitle.length <= 80 && 
          !potentialTitle.includes('@') && 
          !potentialTitle.includes('|') &&
          potentialTitle !== result.contact.name &&
          !potentialTitle.match(/^[\+]?[\d\s\-\(\)]{10,}$/) &&
          !potentialTitle.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2,})?$/)) {
        // If we've seen contact info, this is likely the target title
        // Otherwise, check if it looks like a job title
        if (contactInfoFound || potentialTitle.split(' ').length >= 2) {
          result.targetTitle = potentialTitle
          break
        }
      }
    }
    // Format: Plain text that looks like a job title (after contact, before sections)
    else if (contactInfoFound && line && 
             !line.startsWith('#') && 
             !line.startsWith('-') && 
             !line.startsWith('*') &&
             !line.includes('@') &&
             !line.includes('|') &&
             line.length >= 5 && 
             line.length <= 80 &&
             line !== result.contact.name &&
             !line.match(/^[\+]?[\d\s\-\(\)]{10,}$/) &&
             !line.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2,})?$/)) {
      // Check if it looks like a job title (contains common job title words or reasonable length)
      const jobTitleIndicators = /(senior|junior|lead|principal|staff|chief|head|vp|director|manager|engineer|designer|developer|analyst|specialist|consultant|associate|intern|product|software|data|marketing|sales|operations|strategy|research|design|development)/i
      if (jobTitleIndicators.test(line) || (line.split(' ').length >= 2 && line.split(' ').length <= 8)) {
        result.targetTitle = line.replace(/\*+/g, '').trim()
        break
      }
    }
  }

  // Process lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines at start
    if (!line && !currentSection) continue

    // Detect section headers (## or ### or ALL CAPS)
    // We allow ### for sections if they match a known section type to be more robust
    const headerMatch = line.match(/^(#{2,3})\s+/)
    if (headerMatch || line.match(/^[A-Z][A-Z\s&]+$/)) {
      const sectionName = line.replace(/^#+\s*/, '').replace(/\*+/g, '').trim()
      const newSection = detectSection(sectionName)

      // Only change section if it maps to something known
      if (newSection) {
        // Warning: Avoid switching if 'match' is weak or it looks like a job title
        // e.g. "User Experience Designer" -> detects 'experience'
        // But headers like "Work Experience" or "Professional Experience" are safe
        const isSafeSectionHeader =
          sectionName.length < 40 &&
          !sectionName.toLowerCase().includes('designer') &&
          !sectionName.toLowerCase().includes('engineer') &&
          !sectionName.toLowerCase().includes('manager') &&
          !sectionName.toLowerCase().includes('director')

        if (isSafeSectionHeader) {
          // Save previous section data
          if (currentSubsection && currentSection) {
            saveSubsection(result, currentSection, currentSubsection, buffer)
          }

          currentSection = newSection
          currentSubsection = null
          buffer = []
          continue
        }
      }
    }

    // Handle ### headers as subsections within experience, education, projects, volunteering
    if (line.match(/^###\s+/) && ['experience', 'education', 'projects', 'volunteering'].includes(currentSection)) {
      // Save previous subsection
      if (currentSubsection) {
        saveSubsection(result, currentSection, currentSubsection, buffer)
      }

      const subsectionName = line.replace(/^###\s*/, '').trim()
      currentSubsection = { headerLine: line, name: subsectionName, bullets: [] }
      buffer = []
      continue
    }

    // Parse based on current section
    switch (currentSection) {
      case 'contact':
        parseContactLine(result.contact, line)
        break

      case 'summary':
        if (line) {
          result.summary = result.summary ? `${result.summary}\n${line}` : line
        }
        break

      case 'target':
        if (line && !result.targetTitle) {
          result.targetTitle = line.replace(/^\*+|\*+$/g, '').trim()
        }
        break

      case 'experience':
        // More flexible job header detection (for **bold** headers without ###)
        // Only start a new job entry if we DON'T already have a subsection from ###
        // If we have a subsection, **bold** lines are job titles that go in buffer
        if (!line.startsWith('###') && isJobHeader(line) && !currentSubsection) {
          currentSubsection = { headerLine: line, bullets: [] }
          buffer = []
        } else if (currentSubsection) {
          buffer.push(line)
        }
        break

      case 'education':
        if (line.startsWith('### ') || line.match(/^\*\*[^*]+\*\*/)) {
          if (currentSubsection) {
            saveSubsection(result, currentSection, currentSubsection, buffer)
          }
          currentSubsection = { institution: extractInstitution(line) }
          buffer = []
        } else if (currentSubsection) {
          buffer.push(line)
        } else if (line) {
          // Single line education entry
          result.education.push(parseEducationLine(line))
        }
        break

      case 'skills':
        parseSkillLine(result.skills, line)
        break

      case 'interests':
        if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          result.interests.push(line.replace(/^[-*•]\s*/, '').trim())
        } else if (line) {
          result.interests.push(...line.split(/[,•·]/).map(s => s.trim()).filter(Boolean))
        }
        break

      case 'certifications':
        if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          result.certifications.push(parseCertification(line.replace(/^[-*•]\s*/, '')))
        } else if (line) {
          result.certifications.push(parseCertification(line))
        }
        break

      case 'awards':
        if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          result.awards.push(line.replace(/^[-*•]\s*/, '').trim())
        } else if (line) {
          result.awards.push(line)
        }
        break

      case 'projects':
        if (line.startsWith('### ') || line.match(/^\*\*[^*]+\*\*/)) {
          if (currentSubsection) {
            saveSubsection(result, currentSection, currentSubsection, buffer)
          }
          currentSubsection = { name: line.replace(/^###\s*|\*+/g, '').trim(), bullets: [] }
          buffer = []
        } else if (currentSubsection) {
          buffer.push(line)
        }
        break

      case 'volunteering':
        if (line.startsWith('### ') || line.match(/^\*\*[^*]+\*\*/)) {
          if (currentSubsection) {
            saveSubsection(result, currentSection, currentSubsection, buffer)
          }
          currentSubsection = { organization: line.replace(/^###\s*|\*+/g, '').trim() }
          buffer = []
        } else if (currentSubsection) {
          buffer.push(line)
        }
        break

      case 'publications':
        if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          result.publications.push(parsePublication(line.replace(/^[-*•]\s*/, '')))
        } else if (line) {
          result.publications.push(parsePublication(line))
        }
        break
    }
  }

  // Save any remaining subsection
  if (currentSubsection && currentSection) {
    saveSubsection(result, currentSection, currentSubsection, buffer)
  }

  // Parse contact info from first few lines if not already parsed
  if (!result.contact.email || !result.contact.phone) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      parseContactLine(result.contact, lines[i])
    }
  }

  return result
}

function detectSection(text: string): string {
  const lower = text.toLowerCase()

  if (lower.includes('contact') || lower.includes('personal info')) return 'contact'
  if (lower.includes('summary') || lower.includes('profile') || lower.includes('objective')) return 'summary'
  if (lower.includes('target') || lower.includes('headline')) return 'target'
  if (lower.includes('experience') || lower.includes('employment') || lower.includes('work history')) return 'experience'
  if (lower.includes('education') || lower.includes('academic')) return 'education'
  if (lower.includes('skill') || lower.includes('competenc') || lower.includes('expertise')) return 'skills'
  if (lower.includes('interest') || lower.includes('hobbies')) return 'interests'
  if (lower.includes('certif') || lower.includes('license')) return 'certifications'
  if (lower.includes('award') || lower.includes('honor') || lower.includes('scholarship')) return 'awards'
  if (lower.includes('project')) return 'projects'
  if (lower.includes('volunteer') || lower.includes('leadership')) return 'volunteering'
  if (lower.includes('publication') || lower.includes('paper')) return 'publications'

  return ''
}

function parseContactLine(contact: ContactInfo, line: string) {
  const trimmed = line.trim()

  // Skip placeholder text
  if (trimmed.includes('[Email') || trimmed.includes('[Phone') ||
    trimmed.includes('[LinkedIn') || trimmed.includes('[Portfolio') ||
    trimmed.includes('[Address') || trimmed.includes('[Website')) {
    return
  }

  // Email - must be actual email, not placeholder
  const emailMatch = trimmed.match(/[\w.-]+@[\w.-]+\.\w+/)
  if (emailMatch && !emailMatch[0].includes('example') && !emailMatch[0].includes('placeholder')) {
    contact.email = emailMatch[0]
  }

  // Phone - must contain actual digits
  const phoneMatch = trimmed.match(/[\+]?[\d\s\-\(\)]{10,}/)
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) {
    contact.phone = phoneMatch[0].trim()
  }

  // LinkedIn
  if (trimmed.includes('linkedin.com')) {
    const linkedinMatch = trimmed.match(/linkedin\.com\/in\/[\w-]+/)
    if (linkedinMatch) contact.linkedin = `https://${linkedinMatch[0]}`
  }

  // Website
  if (trimmed.match(/https?:\/\//) && !trimmed.includes('linkedin')) {
    const urlMatch = trimmed.match(/https?:\/\/[\w.-]+\/?[\w.-]*/)
    if (urlMatch) contact.website = urlMatch[0]
  }

  // Location (city, state/country pattern)
  const locationMatch = trimmed.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2,})?$/)
  if (locationMatch && !contact.location) {
    contact.location = locationMatch[0]
  }
}

/**
 * Parse skill lines with various formats
 */
function parseSkillLine(skills: string[], line: string) {
  // List format: - Skill or * Skill or • Skill
  if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
    const skill = line.replace(/^[-*•]\s*/, '').trim()
    if (skill) skills.push(skill)
    return
  }

  // Category: skill1, skill2 format or Category: skill1 · skill2
  if (line.includes(':')) {
    const colonIndex = line.indexOf(':')
    const afterColon = line.slice(colonIndex + 1).trim()
    if (afterColon) {
      // Split by comma, bullet, or middle dot
      const items = afterColon.split(/[,•·]/).map(s => s.trim()).filter(Boolean)
      skills.push(...items)
    }
    return
  }

  // Comma or bullet separated: skill1, skill2, skill3 or skill1 · skill2 · skill3
  if (line.includes(',') || line.includes('·') || line.includes('•')) {
    skills.push(...line.split(/[,•·]/).map(s => s.trim()).filter(Boolean))
    return
  }

  // Single skill on a line
  if (line) {
    skills.push(line)
  }
}

function extractInstitution(line: string): string {
  return line.replace(/^###\s*|\*+/g, '').trim()
}

function parseEducationLine(line: string): EducationItem {
  return {
    institution: line.replace(/\*+/g, '').trim(),
  }
}

function parseCertification(line: string): CertificationItem {
  const parts = line.split(/[-–—]/)
  return {
    name: parts[0]?.trim() || line.trim(),
    issuer: parts[1]?.trim(),
  }
}

function parsePublication(line: string): PublicationItem {
  return {
    title: line.replace(/\*+/g, '').trim(),
  }
}

/**
 * Parse work experience header and buffer into structured data
 */
function parseExperienceEntry(headerLine: string, buffer: string[]): WorkExperienceItem {
  const exp: WorkExperienceItem = {
    company: '',
    title: '',
    bullets: [],
  }

  // Parse the header line first
  // Format 1: ### Company Name
  if (headerLine.startsWith('### ')) {
    exp.company = headerLine.replace(/^###\s*/, '').trim()
  }
  // Format 2: **Bold text** possibly with more text
  else if (headerLine.match(/^\*\*([^*]+)\*\*/)) {
    const boldMatch = headerLine.match(/^\*\*([^*]+)\*\*(.*)/)
    if (boldMatch) {
      const boldPart = boldMatch[1].trim()
      const restPart = boldMatch[2].trim()

      // Check if bold part looks like a job title or company
      // Job titles often start with: Senior, Lead, Manager, Director, etc.
      const jobTitlePatterns = /^(Senior|Lead|Junior|Principal|Staff|Chief|Head|VP|Director|Manager|Engineer|Designer|Developer|Analyst|Specialist|Consultant|Associate|Intern)/i

      if (boldPart.match(jobTitlePatterns)) {
        exp.title = boldPart
        // Rest might contain company and/or dates
        if (restPart) {
          // Try to extract company from "at Company" or just use it as company
          const atMatch = restPart.match(/(?:at|@)\s+(.+?)(?:\s*[|,]|$)/i)
          if (atMatch) {
            exp.company = atMatch[1].trim()
          } else {
            // Might be "Company, Location" or just company
            const companyMatch = restPart.replace(/^[,\s]+/, '').split(/[|]/)[0]
            if (companyMatch) {
              exp.company = companyMatch.trim().replace(/^,\s*/, '')
            }
          }
        }
      } else {
        // Bold part is probably company name
        exp.company = boldPart
        if (restPart) {
          // Rest might be location or other info
          exp.location = restPart.replace(/^[,—–-]\s*/, '').trim()
        }
      }
    }
  }
  // Format 3: Company — Location
  else if (headerLine.match(/^[^—–-]+\s*[—–-]\s*.+/)) {
    const parts = headerLine.split(/\s*[—–-]\s*/)
    exp.company = parts[0].trim()
    if (parts[1]) exp.location = parts[1].trim()
  }
  // Format 4: Plain text company name
  else {
    exp.company = headerLine.replace(/\*+/g, '').trim()
  }

  // Process buffer lines
  for (const line of buffer) {
    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      exp.bullets.push(line.replace(/^[-*•]\s*/, '').trim())
    }
    // Title | Date format
    else if (line.includes('|')) {
      const parts = line.split('|')
      if (!exp.title && parts[0]) {
        exp.title = parts[0].trim().replace(/\*+/g, '')
      }
      if (parts[1]) {
        const dates = extractDates(parts[1])
        if (dates.startDate) exp.startDate = dates.startDate
        if (dates.endDate) exp.endDate = dates.endDate
      }
    }
    // Line that's primarily a date
    else if (isDateLine(line)) {
      const dates = extractDates(line)
      if (dates.startDate) exp.startDate = dates.startDate
      if (dates.endDate) exp.endDate = dates.endDate
      // Check if there's a title before the date
      const titlePart = line.replace(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\s*[-–—].*$/i, '').trim()
      if (titlePart && !exp.title) {
        exp.title = titlePart.replace(/\*+/g, '').replace(/[|,]$/, '').trim()
      }
    }
    // Title line (italic or plain text with job indicators)
    else if (line.match(/^\*[^*]+\*$/) || (line && !exp.title && !line.startsWith('#'))) {
      const cleanLine = line.replace(/\*+/g, '').trim()
      // Check if this looks like a job title
      if (cleanLine.match(/^(Senior|Lead|Junior|Principal|Staff|Chief|Head|VP|Director|Manager|Engineer|Designer|Developer|Analyst|Specialist|Consultant|Associate|Intern)/i) ||
        cleanLine.match(/(Engineer|Designer|Developer|Manager|Director|Analyst|Specialist|Consultant|Lead)/i)) {
        if (!exp.title) {
          exp.title = cleanLine
        }
      }
      // Check if it contains company info
      else if (!exp.company && cleanLine.length < 80) {
        // Could be company name if we don't have one yet
        exp.company = cleanLine
      }
    }
    // Employment type indicators
    else if (line.includes('Full-time') || line.includes('Part-time') || line.includes('Contract') || line.includes('Remote')) {
      if (line.includes('Full-time')) exp.employmentType = 'Full-time'
      else if (line.includes('Part-time')) exp.employmentType = 'Part-time'
      else if (line.includes('Contract')) exp.employmentType = 'Contract'

      if (line.includes('Remote')) {
        exp.location = exp.location ? `${exp.location}, Remote` : 'Remote'
      }
    }
  }

  // If we got title as company and vice versa, try to fix it
  if (exp.company && !exp.title) {
    // Check if company name looks like a job title
    if (exp.company.match(/^(Senior|Lead|Junior|Principal|Staff|Chief|Head|VP|Director|Manager|Engineer|Designer|Developer|Analyst|Specialist|Consultant|Associate|Intern)/i)) {
      exp.title = exp.company
      exp.company = ''
    }
  }

  return exp
}

function saveSubsection(result: ParsedResume, section: string, subsection: any, buffer: string[]) {
  switch (section) {
    case 'experience':
      const exp = parseExperienceEntry(subsection.headerLine || subsection.company || '', buffer)
      // Only add if we have meaningful content
      if (exp.company || exp.title || exp.bullets.length > 0) {
        result.workExperience.push(exp)
      }
      break

    case 'education':
      const edu: EducationItem = {
        institution: subsection.institution,
      }

      for (const line of buffer) {
        if (line.match(/\d{4}/)) {
          edu.graduationDate = line.match(/\d{4}/)?.[0]
        }
        if (line.toLowerCase().includes('bachelor') || line.toLowerCase().includes('master') ||
          line.toLowerCase().includes('degree') || line.toLowerCase().includes('phd') ||
          line.toLowerCase().includes('b.s.') || line.toLowerCase().includes('b.a.') ||
          line.toLowerCase().includes('m.s.') || line.toLowerCase().includes('m.a.')) {
          edu.degree = line.replace(/\*+/g, '').trim()
        }
      }

      result.education.push(edu)
      break

    case 'projects':
      const proj: ProjectItem = {
        name: subsection.name,
        bullets: [],
      }

      for (const line of buffer) {
        if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          proj.bullets.push(line.replace(/^[-*•]\s*/, '').trim())
        } else if (line) {
          proj.description = line
        }
      }

      result.projects.push(proj)
      break

    case 'volunteering':
      const vol: VolunteerItem = {
        organization: subsection.organization,
      }

      for (const line of buffer) {
        if (line.match(/\d{4}/)) {
          vol.dates = line.trim()
        } else if (line) {
          vol.description = line
        }
      }

      result.volunteering.push(vol)
      break
  }
}

/**
 * Format parsed resume back to display-ready format
 */
export function formatContactString(contact: ContactInfo): string {
  const parts: string[] = []

  if (contact.location) parts.push(contact.location)
  if (contact.phone) parts.push(contact.phone)
  if (contact.email) parts.push(contact.email)
  if (contact.linkedin) parts.push(contact.linkedin.replace('https://', ''))
  if (contact.website) parts.push(contact.website.replace('https://', '').replace('http://', ''))

  return parts.join(' • ')
}
