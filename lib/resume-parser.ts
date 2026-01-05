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
  // Skip empty lines
  if (!line.trim()) return false

  // EXCLUSIONS: Lines that should NOT be treated as job headers
  // These are job title lines, not company names
  const jobTitlePatterns = /\b(Designer|Developer|Engineer|Manager|Director|Analyst|Specialist|Consultant|Lead|Senior|Junior|Principal|Staff|Chief|VP|Head|Intern|Associate|Architect|Coordinator|Administrator|Executive|Officer|President|Founder|CEO|CTO|CFO|COO|Full-time|Part-time|Contract|Remote|Freelance)\b/i

  // If it contains job title keywords AND no company-like structures, it's likely a title line
  if (jobTitlePatterns.test(line) && !line.startsWith('### ') && !line.includes('—') && !line.includes('–')) {
    // Exception: "Title at Company" format should still be detected
    if (!line.match(/\b(at|@)\s+[A-Z]/)) {
      return false
    }
  }

  // ### Header format - this is always a company header
  if (line.startsWith('### ')) return true

  // **Bold text** that looks like a company (not a job title)
  if (line.match(/^\*\*[^*]+\*\*/)) {
    const boldContent = line.match(/^\*\*([^*]+)\*\*/)?.[1] || ''
    // Exclude if it looks like a job title
    if (jobTitlePatterns.test(boldContent)) return false
    return true
  }

  // Company — Location format (em dash, en dash, hyphen)
  if (line.match(/^[A-Z][^—–\-\n]+\s*[—–-]\s*[A-Z]/)) return true

  // "Title at Company" format - e.g., "Senior Designer at Tech Corp"
  if (line.match(/^[A-Z][a-zA-Z\s]+\b(at|@)\s+[A-Z]/)) return true

  // Company name followed by dates (common format: "Amazon  Jan 2020 - Present")
  if (line.match(/^[A-Z][A-Za-z\s&.,]+\s{2,}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/\d{4})/)) return true

  // Just a company name on its own line (capitalized, no special chars, reasonable length)
  // But NOT if it looks like a job title
  if (line.match(/^[A-Z][A-Za-z\s&.,]{2,50}$/) &&
    !line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Current)/i) &&
    !line.match(/^\d/) &&
    !line.includes('@') &&
    !line.includes('|') &&
    !line.includes('•') && // Exclude lines with bullet separators like "Title • Full-time"
    !jobTitlePatterns.test(line)) {
    // Check if it looks like a company name (not a sentence, not too many words)
    const wordCount = line.trim().split(/\s+/).length
    if (wordCount <= 4) return true
  }

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
 * Extract dates from a line - preserve original format
 */
function extractDates(line: string): { startDate?: string, endDate?: string, originalText?: string } {
  // Try numeric format first: 01/2020 - 12/2022 or 1/2020 - Present
  const numericMatch = line.match(/(\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|Present|Current)/i)
  if (numericMatch) {
    return { 
      startDate: numericMatch[1], 
      endDate: numericMatch[2],
      originalText: numericMatch[0]
    }
  }

  // Standard format: Jan 2020 - Present, 2019 – 2022, Jan 2020 - Dec 2022, etc.
  const dateMatch = line.match(/(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s*)?(\d{4})\s*[-–—]\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s*)?(\d{4}|Present|Current)/i)
  if (dateMatch) {
    const startMonth = dateMatch[1] || ''
    const startYear = dateMatch[2]
    const endMonth = dateMatch[3] || ''
    const endYear = dateMatch[4]
    return {
      startDate: startMonth ? `${startMonth} ${startYear}` : startYear,
      endDate: endYear === 'Present' || endYear === 'Current' ? 'Present' : (endMonth ? `${endMonth} ${endYear}` : endYear),
      originalText: dateMatch[0]
    }
  }
  
  // Try year-only format: 2020 - 2022 or 2020 - Present
  const yearOnlyMatch = line.match(/(\d{4})\s*[-–—]\s*(\d{4}|Present|Current)/i)
  if (yearOnlyMatch) {
    return {
      startDate: yearOnlyMatch[1],
      endDate: yearOnlyMatch[2],
      originalText: yearOnlyMatch[0]
    }
  }
  
  return {}
}

/**
 * Parse markdown resume content into structured data
 */
export function parseResumeContent(content: string): ParsedResume {
  console.log('[ResumeParser] Parsing content:', {
    contentLength: content.length,
    hasEducation: content.includes('## Education'),
    hasSkills: content.includes('## Skills'),
    hasWorkExperience: content.includes('## Work Experience'),
    preview: content.substring(0, 500),
  })

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
            console.log(`[ResumeParser] Saving subsection for section '${currentSection}' before switching to '${newSection}'`)
            saveSubsection(result, currentSection, currentSubsection, buffer)
          }

          console.log(`[ResumeParser] Detected section: '${newSection}' from header: '${sectionName}'`)
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
        console.log(`[ResumeParser] Saving previous subsection in section '${currentSection}' before new subsection`)
        saveSubsection(result, currentSection, currentSubsection, buffer)
      }

      const subsectionName = line.replace(/^###\s*/, '').trim()
      console.log(`[ResumeParser] Starting new subsection in '${currentSection}': '${subsectionName}'`)
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
        // Check if this is a new job header (### Company or **Bold** format)
        const isNewJobHeader = line.startsWith('### ') || isJobHeader(line)

        // Debug: Log all lines in experience section to understand parsing
        console.log(`[ResumeParser:experience] Line: "${line.substring(0, 80)}" | isNewJobHeader=${isNewJobHeader} | hasSubsection=${!!currentSubsection}`)

        if (isNewJobHeader) {
          // Save the previous job entry if we have one
          if (currentSubsection) {
            console.log(`[ResumeParser] Saving experience entry: "${currentSubsection.headerLine?.substring(0, 50)}" with ${buffer.filter(l => l.startsWith('- ') || l.startsWith('• ')).length} bullets`)
            saveSubsection(result, currentSection, currentSubsection, buffer)
          }
          // Start a new job entry
          console.log(`[ResumeParser] Starting NEW experience entry: "${line.substring(0, 50)}"`)
          currentSubsection = { headerLine: line, bullets: [] }
          buffer = []
        } else if (currentSubsection) {
          // Add line to current job's buffer
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
        console.log(`[ResumeParser] Processing skills line: '${line.substring(0, 100)}'`)
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

  console.log('[ResumeParser] Parsed result:', {
    name: result.contact.name,
    workExperienceCount: result.workExperience.length,
    educationCount: result.education.length,
    skillsCount: result.skills.length,
    certificationsCount: result.certifications.length,
    finalSection: currentSection,
    hasUnprocessedSubsection: !!currentSubsection,
  })

  return result
}

function detectSection(text: string): string {
  const lower = text.toLowerCase().trim()

  // Use regex patterns that match at start of string to prevent false positives
  // e.g., "User Experience Designer" should NOT trigger "experience" section
  if (/^contact|^personal\s+info/i.test(lower)) return 'contact'
  if (/^(professional\s+)?summary|^profile$|^objective$/i.test(lower)) return 'summary'
  if (/^target|^headline/i.test(lower)) return 'target'
  if (/^(work\s+)?experience$|^(professional\s+)?experience$|^employment(\s+history)?$/i.test(lower)) return 'experience'
  if (/^education$|^academic(\s+background)?$/i.test(lower)) return 'education'
  if (/^(technical\s+)?skills?$|^competenc|^expertise$/i.test(lower)) return 'skills'
  if (/^interests?$|^hobbies$/i.test(lower)) return 'interests'
  if (/^certif|^licens/i.test(lower)) return 'certifications'
  if (/^awards?|^honors?|^scholarships?$/i.test(lower)) return 'awards'
  if (/^projects?$/i.test(lower)) return 'projects'
  if (/^volunteer|^leadership$/i.test(lower)) return 'volunteering'
  if (/^publications?|^papers?$/i.test(lower)) return 'publications'

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
  let institution = line.replace(/^###\s*|\*+/g, '').trim()
  // Clean up excessive whitespace (tabs, multiple spaces) - be more aggressive
  institution = institution.replace(/[\s\t]+/g, ' ').trim()
  // Remove trailing location/country if separated by many spaces (e.g., "Akendi UK                     London")
  institution = institution.replace(/\s{3,}.*$/, '') // Remove if 3+ spaces followed by anything
  return institution.trim()
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
    // Extract company name, removing dates that might be on the same line
    let companyName = headerLine.replace(/^###\s*/, '').trim()

    // Remove dates if they appear on the same line (handle various formats)
    // Try multiple patterns to catch dates separated by many spaces
    companyName = companyName.replace(/\s*\|\s*\d{1,2}\/\d{4}.*$/i, '') // Remove "| 01/2021" pattern
    companyName = companyName.replace(/\s{2,}.*\d{1,2}\/\d{4}.*$/i, '') // Remove "  ... 01/2021" (2+ spaces before date)
    companyName = companyName.replace(/\s+\d{1,2}\/\d{4}.*$/i, '') // Remove " 01/2021" pattern  
    companyName = companyName.replace(/\s+[A-Z][a-z]+\s+\d{4}.*$/i, '') // Remove "Jan 2021" pattern
    companyName = companyName.replace(/\s+\d{4}.*$/i, '') // Remove " 2021" pattern

    // More aggressive: if there are 5+ spaces/tabs, likely there's a date or extra info after
    if (companyName.match(/[\s\t]{5,}/)) {
      // Split on large whitespace and take first part
      const parts = companyName.split(/[\s\t]{5,}/)
      companyName = parts[0] || companyName
      // Also try to remove any date patterns that might remain
      companyName = companyName.replace(/\s+\d{1,2}\/\d{4}.*$/i, '')
    }

    // Clean up excessive whitespace (tabs, multiple spaces)
    exp.company = companyName.replace(/[\s\t]+/g, ' ').trim()

    // Final check: if company still looks like it has a date, try one more aggressive cleanup
    if (exp.company.match(/\d{1,2}\/\d{4}/)) {
      console.log(`[ResumeParser] ⚠️ Company name still contains date, attempting cleanup: '${exp.company}'`)
      exp.company = exp.company.replace(/\s+.*\d{1,2}\/\d{4}.*$/i, '').replace(/[\s\t]+/g, ' ').trim()
      console.log(`[ResumeParser] Cleaned company name: '${exp.company}'`)
    }
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
    let companyName = headerLine.replace(/\*+/g, '').trim()
    // Remove dates if they appear on the same line (handle many spaces)
    companyName = companyName.replace(/\s*\|\s*\d{1,2}\/\d{4}.*$/i, '')
    companyName = companyName.replace(/\s{2,}.*\d{1,2}\/\d{4}.*$/i, '') // Remove if 2+ spaces followed by date
    companyName = companyName.replace(/\s+\d{1,2}\/\d{4}.*$/i, '')
    companyName = companyName.replace(/\s+[A-Z][a-z]+\s+\d{4}.*$/i, '')
    // Clean up excessive whitespace (tabs, multiple spaces)
    exp.company = companyName.replace(/[\s\t]+/g, ' ').trim()
  }

  // Process buffer lines - check ALL lines for dates first, then parse other fields
  console.log(`[ResumeParser:parseExp] Processing ${buffer.length} buffer lines for entry: ${exp.company || '(no company yet)'}`)
  
  for (const line of buffer) {
    // Skip empty lines
    if (!line.trim()) continue
    
    // Debug: Log each line being processed
    console.log(`[ResumeParser:parseExp] Processing buffer line: "${line.substring(0, 80)}"`)

    // Priority 1: Bullet points - extract immediately and continue
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      exp.bullets.push(line.replace(/^[-*•]\s*/, '').trim())
      continue
    }

    // Priority 2: Check EVERY line for dates FIRST (most important)
    const dates = extractDates(line)
    if (dates.startDate || dates.endDate) {
      if (dates.startDate && !exp.startDate) {
        exp.startDate = dates.startDate
        console.log(`[ResumeParser:parseExp] ✅ Extracted startDate: "${dates.startDate}"`)
      }
      if (dates.endDate && !exp.endDate) {
        exp.endDate = dates.endDate
        console.log(`[ResumeParser:parseExp] ✅ Extracted endDate: "${dates.endDate}"`)
      }
      
      // If this line is primarily a date, extract title from before the date if present
      if (isDateLine(line)) {
        const titlePart = line.replace(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/\d{4}|\d{4})\s*[-–—].*$/i, '').trim()
        if (titlePart && !exp.title) {
          exp.title = titlePart.replace(/\*+/g, '').replace(/[|,]$/, '').trim()
          console.log(`[ResumeParser:parseExp] ✅ Extracted title from date line: "${exp.title}"`)
        }
        continue // Skip further processing for date-only lines
      }
    }

    // Priority 3: Title | Date | EmploymentType format (pipe-separated)
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim())
      console.log(`[ResumeParser:parseExp] Processing pipe-separated line with ${parts.length} parts`)
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        
        // Extract title from bold or plain text (usually first part)
        if (i === 0 && !exp.title) {
          const titleMatch = part.match(/^\*\*(.+?)\*\*$/) || part.match(/^([A-Z][a-zA-Z\s]+(?:Designer|Developer|Manager|Engineer|Analyst|Lead|Director|Specialist).*)$/i)
          if (titleMatch) {
            exp.title = titleMatch[1].trim()
            console.log(`[ResumeParser:parseExp] ✅ Extracted title from pipe part ${i}: "${exp.title}"`)
          }
        }
        
        // Check ALL parts for dates (not just part[1])
        const partDates = extractDates(part)
        if (partDates.startDate && !exp.startDate) {
          exp.startDate = partDates.startDate
          console.log(`[ResumeParser:parseExp] ✅ Extracted startDate from pipe part ${i}: "${exp.startDate}"`)
        }
        if (partDates.endDate && !exp.endDate) {
          exp.endDate = partDates.endDate
          console.log(`[ResumeParser:parseExp] ✅ Extracted endDate from pipe part ${i}: "${exp.endDate}"`)
        }
        
        // Extract employment type from any part
        if (part.match(/Full-time|Part-time|Contract|Freelance|Internship/i)) {
          const empMatch = part.match(/(Full-time|Part-time|Contract|Freelance|Internship)/i)
          if (empMatch) {
            exp.employmentType = empMatch[1]
            console.log(`[ResumeParser:parseExp] ✅ Extracted employmentType from pipe part ${i}: "${exp.employmentType}"`)
          }
        }
      }
      continue
    }

    // Priority 4: Line with bullet separator (•) - common format: "Title • Full-time Location" or "Title • Date Range"
    if (line.includes('•') && !line.startsWith('•')) {
      const parts = line.split('•').map(p => p.trim())
      console.log(`[ResumeParser:parseExp] Processing bullet-separated line with ${parts.length} parts`)
      
      // First part is usually title
      if (parts[0] && !exp.title) {
        exp.title = parts[0].replace(/\*+/g, '').trim()
        console.log(`[ResumeParser:parseExp] ✅ Extracted title from bullet part 0: "${exp.title}"`)
      }
      
      // Check all parts for dates, employment type, location
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i]
        
        // Check for dates in this part
        const partDates = extractDates(part)
        if (partDates.startDate && !exp.startDate) {
          exp.startDate = partDates.startDate
          console.log(`[ResumeParser:parseExp] ✅ Extracted startDate from bullet part ${i}: "${exp.startDate}"`)
        }
        if (partDates.endDate && !exp.endDate) {
          exp.endDate = partDates.endDate
          console.log(`[ResumeParser:parseExp] ✅ Extracted endDate from bullet part ${i}: "${exp.endDate}"`)
        }
        
        // Extract employment type
        if (part.match(/Full-time|Part-time|Contract|Freelance|Internship/i)) {
          const empMatch = part.match(/(Full-time|Part-time|Contract|Freelance|Internship)/i)
          if (empMatch) {
            exp.employmentType = empMatch[1]
            console.log(`[ResumeParser:parseExp] ✅ Extracted employmentType from bullet part ${i}: "${exp.employmentType}"`)
            // Rest might be location
            const remaining = part.replace(/Full-time|Part-time|Contract|Freelance|Internship/i, '').trim()
            if (remaining && !exp.location) {
              exp.location = remaining
              console.log(`[ResumeParser:parseExp] ✅ Extracted location from bullet part ${i}: "${exp.location}"`)
            }
          }
        } else if (!exp.location && part.length > 2 && part.length < 50 && !isDateLine(part)) {
          // Might be location if not a date
          exp.location = part
          console.log(`[ResumeParser:parseExp] ✅ Extracted location from bullet part ${i}: "${exp.location}"`)
        }
      }
      continue
    }

    // Priority 5: Title line (bold, italic, or plain text with job indicators)
    const cleanLine = line.replace(/\*+/g, '').trim()
    if (cleanLine.match(/^(Senior|Lead|Junior|Principal|Staff|Chief|Head|VP|Director|Manager|Engineer|Designer|Developer|Analyst|Specialist|Consultant|Associate|Intern)/i) ||
      cleanLine.match(/(Engineer|Designer|Developer|Manager|Director|Analyst|Specialist|Consultant|Lead)\s*$/i)) {
      if (!exp.title) {
        // Extract title, removing any trailing dates
        exp.title = cleanLine.replace(/\s*[-–—]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}|Present|Current).*$/i, '').trim()
        console.log(`[ResumeParser:parseExp] ✅ Extracted title: "${exp.title}"`)
      }
      continue
    }

    // Priority 6: Employment type indicators (can be standalone or with dates)
    if (line.includes('Full-time') || line.includes('Part-time') || line.includes('Contract') || line.includes('Freelance') || line.includes('Remote')) {
      if (line.includes('Full-time')) exp.employmentType = 'Full-time'
      else if (line.includes('Part-time')) exp.employmentType = 'Part-time'
      else if (line.includes('Contract')) exp.employmentType = 'Contract'
      else if (line.includes('Freelance')) exp.employmentType = 'Freelance'

      if (line.includes('Remote')) {
        exp.location = exp.location ? `${exp.location}, Remote` : 'Remote'
      }
      
      // Also try to extract dates from this line if present
      const empDates = extractDates(line)
      if (empDates.startDate && !exp.startDate) {
        exp.startDate = empDates.startDate
        console.log(`[ResumeParser:parseExp] ✅ Extracted startDate from employment line: "${exp.startDate}"`)
      }
      if (empDates.endDate && !exp.endDate) {
        exp.endDate = empDates.endDate
        console.log(`[ResumeParser:parseExp] ✅ Extracted endDate from employment line: "${exp.endDate}"`)
      }
      continue
    }

    // Priority 7: Location line (if it's a standalone location and not a date)
    if (line && !exp.location && !isDateLine(line) && 
        line.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2,})?$/) &&
        !line.includes('|') && !line.match(/^\*\*/)) {
      exp.location = line.trim()
      console.log(`[ResumeParser:parseExp] ✅ Extracted location: "${exp.location}"`)
      continue
    }
    
    // Last resort: If we haven't matched anything yet, check if it might be a date line
    if (isDateLine(line) && !exp.startDate && !exp.endDate) {
      const fallbackDates = extractDates(line)
      if (fallbackDates.startDate) {
        exp.startDate = fallbackDates.startDate
        console.log(`[ResumeParser:parseExp] ✅ Extracted startDate (fallback): "${exp.startDate}"`)
      }
      if (fallbackDates.endDate) {
        exp.endDate = fallbackDates.endDate
        console.log(`[ResumeParser:parseExp] ✅ Extracted endDate (fallback): "${exp.endDate}"`)
      }
    }
  }
  
  // Log final parsed result
  console.log(`[ResumeParser:parseExp] Final parsed entry:`, {
    company: exp.company || '(empty)',
    title: exp.title || '(empty)',
    startDate: exp.startDate || '(empty)',
    endDate: exp.endDate || '(empty)',
    location: exp.location || '(empty)',
    employmentType: exp.employmentType || '(empty)',
    bulletsCount: exp.bullets.length,
  })

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
      // Handle both formats: { institution } and { headerLine, name } from general ### handler
      let institution = subsection.institution ||
        (subsection.headerLine ? extractInstitution(subsection.headerLine) : null) ||
        subsection.name ||
        ''

      // Clean up excessive whitespace (tabs, multiple spaces) - be very aggressive
      institution = institution.replace(/[\s\t]+/g, ' ').trim()
      // Remove trailing location/country if separated by many spaces (e.g., "Akendi UK                     London")
      institution = institution.replace(/\s{3,}.*$/, '') // Remove if 3+ spaces followed by anything
      institution = institution.trim()

      // Skip if this looks like a certification (starts with "Certified" or is clearly a cert name)
      const lowerInstitution = institution.toLowerCase()
      const isCertification = lowerInstitution.startsWith('certified') ||
        lowerInstitution.includes('certification') ||
        // Common certification issuer patterns (check start of string)
        /^(AJ & Smart|IDEO U|Google|Microsoft|AWS|Salesforce|Adobe)/i.test(institution) ||
        // Certification course names (check anywhere in string)
        /(Design Strategy|Workshopper|Sprint Facilitator|User Experience Specialist)/i.test(institution)

      if (isCertification) {
        console.log(`[ResumeParser] ⚠️ SKIPPING education entry that looks like certification: '${institution}'`)
        break // Don't add this as education
      }

      // Only proceed if we have a valid institution name
      if (!institution || institution.length < 2) {
        console.log(`[ResumeParser] ⚠️ Skipping education entry with invalid institution: '${institution}'`)
        break
      }

      console.log(`[ResumeParser] Saving education subsection: institution='${institution}', buffer lines=${buffer.length}`, {
        buffer: buffer.slice(0, 5), // First 5 lines of buffer
        subsectionKeys: Object.keys(subsection),
      })

      const edu: EducationItem = {
        institution: institution,
      }

      for (const line of buffer) {
        // Clean up excessive whitespace first (handle tabs and multiple spaces)
        const cleanedLine = line.replace(/[\s\t]+/g, ' ').trim()
        if (!cleanedLine) continue

        // Check for graduation date (year pattern)
        if (cleanedLine.match(/\d{4}/)) {
          const yearMatch = cleanedLine.match(/\d{4}/)
          if (yearMatch) {
            edu.graduationDate = cleanedLine.replace(/\*+/g, '').trim() // Keep full date, remove markdown
          }
        }
        // Check for degree (bold text or contains degree keywords)
        else if (cleanedLine.match(/^\*\*.*\*\*$/) ||
          cleanedLine.toLowerCase().includes('bachelor') ||
          cleanedLine.toLowerCase().includes('master') ||
          cleanedLine.toLowerCase().includes('degree') ||
          cleanedLine.toLowerCase().includes('phd') ||
          cleanedLine.toLowerCase().includes('b.s.') ||
          cleanedLine.toLowerCase().includes('b.a.') ||
          cleanedLine.toLowerCase().includes('m.s.') ||
          cleanedLine.toLowerCase().includes('m.a.')) {
          edu.degree = cleanedLine.replace(/\*+/g, '').trim()
        }
        // Everything else is field or notes (plain text lines)
        else {
          // First non-degree, non-date line is field, rest are notes
          if (!edu.field && cleanedLine) {
            edu.field = cleanedLine
          } else if (cleanedLine) {
            edu.notes = (edu.notes ? edu.notes + ' ' : '') + cleanedLine
          }
        }
      }

      // Only add if we have an institution
      if (edu.institution) {
        result.education.push(edu)
      }
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
