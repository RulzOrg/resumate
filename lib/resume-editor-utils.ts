/**
 * Resume Editor Utilities
 * Helper functions for extracting and transforming resume data
 */

import type { Resume } from './db'

// Editor State Types
export interface ContactField {
  value: string
  include: boolean
}

export interface EditorContact {
  firstName: ContactField
  lastName: ContactField
  email: ContactField
  phone: ContactField
  linkedin: ContactField
  location: ContactField
}

export interface EditorSummary {
  id: string
  value: string
  include: boolean
}

export interface EditorBullet {
  id: string
  value: string
  include: boolean
}

export interface EditorExperience {
  id: string
  include: boolean
  company: string
  role: string
  dates: string
  bullets: EditorBullet[]
}

export interface EditorEducation {
  id: string
  include: boolean
  institution: string
  degree: string
  field: string
  location: string
  start: string
  end: string
  gpa?: string
  notes?: string
}

export interface EditorCertification {
  id: string
  include: boolean
  name: string
  issuer: string
  date: string
}

export interface EditorSkill {
  id: string
  value: string
  include: boolean
}

export interface EditorInterest {
  id: string
  value: string
  include: boolean
}

export interface EditorState {
  contact: EditorContact
  targetTitle: ContactField
  summaries: EditorSummary[]
  experience: EditorExperience[]
  education: EditorEducation[]
  certifications: EditorCertification[]
  skills: EditorSkill[]
  interests: EditorInterest[]
}

/**
 * Split full name into first and last name
 */
export function splitFullName(fullName: string): [string, string] {
  if (!fullName) return ['', '']
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return ['', '']
  if (parts.length === 1) return [parts[0], '']
  
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  return [firstName, lastName]
}

/**
 * Format date from YYYY-MM to "Mon YYYY" or handle "Present"
 */
export function formatMonthYear(date: string | undefined): string {
  if (!date) return ''
  if (date.toLowerCase() === 'present') return 'Present'
  
  try {
    const [year, month] = date.split('-')
    if (!year || !month) return date
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthIndex = parseInt(month, 10) - 1
    
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNames[monthIndex]} ${year}`
    }
    return date
  } catch {
    return date
  }
}

/**
 * Format date range for experience/education
 */
export function formatDates(start?: string, end?: string): string {
  if (!start && !end) return ''
  
  const startFormatted = formatMonthYear(start)
  const endFormatted = end ? formatMonthYear(end) : 'Present'
  
  if (!startFormatted) return endFormatted
  if (!endFormatted) return startFormatted
  
  return `${startFormatted} – ${endFormatted}`
}

/**
 * Flatten skills object into array of strings
 */
export function flattenSkills(skills?: any): string[] {
  if (!skills) return []
  
  const allSkills: string[] = []
  
  if (Array.isArray(skills.technical)) {
    allSkills.push(...skills.technical)
  }
  if (Array.isArray(skills.tools)) {
    allSkills.push(...skills.tools)
  }
  if (Array.isArray(skills.other)) {
    allSkills.push(...skills.other)
  }
  
  return allSkills.filter(Boolean)
}

/**
 * Extract job title from first experience entry
 */
export function extractTitleFromExperience(experience?: any[]): string {
  if (!experience || experience.length === 0) return ''
  return experience[0]?.job_title || ''
}

/**
 * Generate a simple summary from content if none exists
 */
export function generateSummaryFromContent(content: string): string {
  if (!content) return ''
  
  // Try to find a summary/objective section
  const summaryMatch = content.match(/(?:summary|objective|profile)[\s\S]{0,50}?[:\n]+([\s\S]+?)(?:\n\n|\n[A-Z])/i)
  if (summaryMatch && summaryMatch[1]) {
    return summaryMatch[1].trim().slice(0, 300)
  }
  
  // Otherwise return first 200 characters
  return content.trim().slice(0, 200) + '...'
}

/**
 * Initialize editor state from resume data
 */
export function initializeEditorState(resume: Resume): EditorState {
  const parsed = resume.parsed_sections || {}
  const personalInfo = parsed.personal_info || {}
  
  // Split full name
  const [firstName, lastName] = splitFullName(personalInfo.full_name || '')
  
  // Initialize contact
  const contact: EditorContact = {
    firstName: { value: firstName, include: !!firstName },
    lastName: { value: lastName, include: !!lastName },
    email: { value: personalInfo.email || '', include: !!personalInfo.email },
    phone: { value: personalInfo.phone || '', include: !!personalInfo.phone },
    linkedin: { value: personalInfo.linkedin || '', include: !!personalInfo.linkedin },
    location: { value: personalInfo.location || '', include: !!personalInfo.location }
  }
  
  // Initialize target title
  const titleValue = resume.title || extractTitleFromExperience(parsed.experience)
  const targetTitle: ContactField = {
    value: titleValue,
    include: !!titleValue
  }
  
  // Initialize summaries
  const summaryValue = parsed.summary || generateSummaryFromContent(resume.content_text || '')
  const summaries: EditorSummary[] = summaryValue ? [{
    id: 'summary-1',
    value: summaryValue,
    include: true
  }] : []
  
  // Initialize experience
  const experience: EditorExperience[] = (parsed.experience || []).map((exp: any, idx: number) => {
    const roleParts = [exp.job_title, exp.location].filter(Boolean)
    const role = roleParts.length > 0 ? roleParts.join(' · ') : ''
    
    return {
      id: `exp-${idx}-${Date.now()}`,
      include: true,
      company: exp.company || '',
      role: role,
      dates: formatDates(exp.start_date, exp.end_date),
      bullets: (exp.highlights || []).map((highlight: string, bidx: number) => ({
        id: `exp-${idx}-bullet-${bidx}-${Date.now()}`,
        value: highlight,
        include: true
      }))
    }
  })
  
  // Initialize education
  const education: EditorEducation[] = (parsed.education || []).map((edu: any, idx: number) => ({
    id: `edu-${idx}-${Date.now()}`,
    include: true,
    institution: edu.institution || '',
    degree: edu.degree || '',
    field: edu.field || '',
    location: edu.location || '',
    start: edu.start_date || '',
    end: edu.end_date || '',
    gpa: edu.gpa,
    notes: edu.notes
  }))
  
  // Initialize certifications (empty for now, user can add)
  const certifications: EditorCertification[] = []
  
  // Initialize skills
  const skillsList = flattenSkills(parsed.skills)
  const skills: EditorSkill[] = skillsList.map((skill, idx) => ({
    id: `skill-${idx}-${Date.now()}`,
    value: skill,
    include: true
  }))
  
  // Initialize interests (empty for now, user can add)
  const interests: EditorInterest[] = []
  
  return {
    contact,
    targetTitle,
    summaries,
    experience,
    education,
    certifications,
    skills,
    interests
  }
}

/**
 * Generate plain text from editor state for database storage
 */
export function generatePlainText(state: EditorState): string {
  const lines: string[] = []
  
  // Name
  if (state.contact.firstName.include || state.contact.lastName.include) {
    const name = [
      state.contact.firstName.include ? state.contact.firstName.value : '',
      state.contact.lastName.include ? state.contact.lastName.value : ''
    ].filter(Boolean).join(' ')
    if (name) lines.push(name)
  }
  
  // Title
  if (state.targetTitle.include && state.targetTitle.value) {
    lines.push(state.targetTitle.value)
  }
  
  // Contact info
  const contactInfo = [
    state.contact.email.include ? state.contact.email.value : '',
    state.contact.phone.include ? state.contact.phone.value : '',
    state.contact.linkedin.include ? state.contact.linkedin.value : '',
    state.contact.location.include ? state.contact.location.value : ''
  ].filter(Boolean).join(' | ')
  
  if (contactInfo) {
    lines.push(contactInfo)
  }
  
  lines.push('') // Empty line
  
  // Summaries
  const includedSummaries = state.summaries.filter(s => s.include && s.value)
  if (includedSummaries.length > 0) {
    lines.push('PROFESSIONAL SUMMARY')
    includedSummaries.forEach(summary => {
      lines.push(summary.value)
    })
    lines.push('')
  }
  
  // Experience
  const includedExperience = state.experience.filter(e => e.include)
  if (includedExperience.length > 0) {
    lines.push('WORK EXPERIENCE')
    includedExperience.forEach(exp => {
      lines.push(`${exp.company} - ${exp.role}`)
      if (exp.dates) lines.push(exp.dates)
      
      const includedBullets = exp.bullets.filter(b => b.include && b.value)
      includedBullets.forEach(bullet => {
        lines.push(`• ${bullet.value}`)
      })
      lines.push('')
    })
  }
  
  // Education
  const includedEducation = state.education.filter(e => e.include)
  if (includedEducation.length > 0) {
    lines.push('EDUCATION')
    includedEducation.forEach(edu => {
      const degreeLine = [edu.degree, edu.field].filter(Boolean).join(' in ')
      lines.push(`${edu.institution}${degreeLine ? ' - ' + degreeLine : ''}`)
      if (edu.location) lines.push(edu.location)
      if (edu.start || edu.end) lines.push(formatDates(edu.start, edu.end))
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`)
      if (edu.notes) lines.push(edu.notes)
      lines.push('')
    })
  }
  
  // Certifications
  const includedCertifications = state.certifications.filter(c => c.include)
  if (includedCertifications.length > 0) {
    lines.push('CERTIFICATIONS')
    includedCertifications.forEach(cert => {
      const certLine = [cert.name, cert.issuer].filter(Boolean).join(' - ')
      lines.push(`${certLine}${cert.date ? ` (${formatMonthYear(cert.date)})` : ''}`)
    })
    lines.push('')
  }
  
  // Skills
  const includedSkills = state.skills.filter(s => s.include && s.value)
  if (includedSkills.length > 0) {
    lines.push('SKILLS')
    lines.push(includedSkills.map(s => s.value).join(', '))
    lines.push('')
  }
  
  // Interests
  const includedInterests = state.interests.filter(i => i.include && i.value)
  if (includedInterests.length > 0) {
    lines.push('INTERESTS')
    lines.push(includedInterests.map(i => i.value).join(', '))
  }
  
  return lines.join('\n')
}

/**
 * Count included fields for preview panel
 */
export function countIncludedFields(state: EditorState): number {
  let count = 0
  
  // Contact fields
  Object.values(state.contact).forEach(field => {
    if (field.include && field.value) count++
  })
  
  // Target title
  if (state.targetTitle.include && state.targetTitle.value) count++
  
  // Summaries
  count += state.summaries.filter(s => s.include && s.value).length
  
  // Experience + bullets
  state.experience.forEach(exp => {
    if (exp.include) {
      count++
      count += exp.bullets.filter(b => b.include && b.value).length
    }
  })
  
  // Education
  count += state.education.filter(e => e.include).length
  
  // Certifications
  count += state.certifications.filter(c => c.include).length
  
  // Skills
  count += state.skills.filter(s => s.include && s.value).length
  
  // Interests
  count += state.interests.filter(i => i.include && i.value).length
  
  return count
}

/**
 * Generate unique ID for new items
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Parse date string to YYYY-MM format for database
 */
export function parseDateToYYYYMM(dateStr: string): string {
  if (!dateStr || dateStr === 'Present') return dateStr
  
  // If already in YYYY-MM format, return as-is
  if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr
  
  // Parse "Mon YYYY" format (e.g., "Jan 2020")
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'June': '06', 'July': '07', 'August': '08', 'September': '09',
    'October': '10', 'November': '11', 'December': '12'
  }
  
  const match = dateStr.match(/^(\w+)\s+(\d{4})$/)
  if (match && months[match[1]]) {
    return `${match[2]}-${months[match[1]]}`
  }
  
  // If just year, use YYYY-01 format
  if (/^\d{4}$/.test(dateStr)) {
    return `${dateStr}-01`
  }
  
  return dateStr
}

/**
 * Convert EditorState back to database parsed_sections format
 * This is the reverse of initializeEditorState()
 */
export function convertEditorStateToDatabase(state: EditorState): Record<string, any> {
  // Build full name from first and last name
  const fullName = [
    state.contact.firstName.include && state.contact.firstName.value ? state.contact.firstName.value : '',
    state.contact.lastName.include && state.contact.lastName.value ? state.contact.lastName.value : ''
  ].filter(Boolean).join(' ')

  // Convert contact info
  const personal_info: any = {}
  if (fullName) personal_info.full_name = fullName
  if (state.contact.email.include && state.contact.email.value) {
    personal_info.email = state.contact.email.value
  }
  if (state.contact.phone.include && state.contact.phone.value) {
    personal_info.phone = state.contact.phone.value
  }
  if (state.contact.location.include && state.contact.location.value) {
    personal_info.location = state.contact.location.value
  }
  if (state.contact.linkedin.include && state.contact.linkedin.value) {
    personal_info.linkedin = state.contact.linkedin.value
  }

  // Get first included summary
  const includedSummaries = (state.summaries || []).filter(s => s && s.include && s.value)
  const summary = includedSummaries.length > 0 ? includedSummaries[0].value : ''

  // Convert experience
  const experience = (state.experience || [])
    .filter(exp => exp && exp.include)
    .map(exp => {
      // Parse role back into job_title and location
      const roleParts = (exp.role || '').split(' · ')
      const job_title = roleParts[0]?.trim() || ''
      const location = roleParts[1]?.trim() || ''
      
      // Parse dates back into start_date and end_date
      const datesParts = (exp.dates || '').split(' – ')
      const start_date = datesParts[0] ? parseDateToYYYYMM(datesParts[0].trim()) : ''
      const end_date = datesParts[1] 
        ? (datesParts[1].trim() === 'Present' ? 'Present' : parseDateToYYYYMM(datesParts[1].trim()))
        : ''
      
      return {
        company: exp.company || '',
        job_title,
        location,
        start_date,
        end_date,
        highlights: (exp.bullets || [])
          .filter(b => b && b.include && b.value)
          .map(b => b.value)
      }
    })

  // Convert education
  const education = (state.education || [])
    .filter(edu => edu && edu.include)
    .map(edu => {
      const eduData: any = {
        institution: edu.institution || '',
        degree: edu.degree || '',
        field: edu.field || '',
        location: edu.location || '',
        start_date: edu.start || '',
        end_date: edu.end || ''
      }
      
      if (edu.gpa) eduData.gpa = edu.gpa
      if (edu.notes) eduData.notes = edu.notes
      
      return eduData
    })

  // Convert skills - put all in technical array for simplicity
  const includedSkills = (state.skills || [])
    .filter(s => s && s.include && s.value)
    .map(s => s.value)
  
  const skills = {
    technical: includedSkills,
    tools: [],
    other: []
  }

  // Convert certifications
  const certifications = (state.certifications || [])
    .filter(cert => cert && cert.include)
    .map(cert => ({
      name: cert.name || '',
      issuer: cert.issuer || '',
      date: cert.date || ''
    }))

  // Convert interests
  const interests = (state.interests || [])
    .filter(i => i && i.include && i.value)
    .map(i => i.value)

  // Build final object
  const result: Record<string, any> = {}
  
  if (Object.keys(personal_info).length > 0) {
    result.personal_info = personal_info
  }
  if (summary) {
    result.summary = summary
  }
  if (experience.length > 0) {
    result.experience = experience
  }
  if (education.length > 0) {
    result.education = education
  }
  if (includedSkills.length > 0) {
    result.skills = skills
  }
  if (certifications.length > 0) {
    result.certifications = certifications
  }
  if (interests.length > 0) {
    result.interests = interests
  }

  return result
}
