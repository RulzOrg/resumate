"use client"

import React, { useState, useEffect, useMemo } from "react"
import { ChevronDown, Wand2, Plus, Trash2, Save, Download, FileText, Copy as CopyIcon, Check } from "lucide-react"
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
  included: boolean
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
  const lines = markdown.split('\n').filter(line => line.trim())
  
  // Default structure
  const data: ResumeData = {
    contactInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      location: '',
      included: true
    },
    targetTitle: { text: '', included: true },
    summaries: [],
    workExperience: [],
    education: [],
    certifications: [],
    skills: [],
    interests: []
  }

  // Parse contact info from first few lines
  if (lines[0]) {
    const nameParts = lines[0].replace(/^#+\s*/, '').trim().split(' ')
    data.contactInfo.firstName = nameParts[0] || ''
    data.contactInfo.lastName = nameParts.slice(1).join(' ') || ''
  }

  // Parse the rest section by section
  let currentSection = ''
  let currentExperience: WorkExperience | null = null
  let currentEducation: Education | null = null
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Check for section headers
    if (line.match(/^#+\s*(professional\s*summary|summary)/i)) {
      currentSection = 'summary'
      continue
    } else if (line.match(/^#+\s*(work\s*experience|experience)/i)) {
      currentSection = 'experience'
      continue
    } else if (line.match(/^#+\s*education/i)) {
      currentSection = 'education'
      continue
    } else if (line.match(/^#+\s*skills/i)) {
      currentSection = 'skills'
      continue
    } else if (line.match(/^#+\s*interests/i)) {
      currentSection = 'interests'
      continue
    }

    // Parse based on current section
    if (currentSection === 'summary' && line && !line.startsWith('#')) {
      data.summaries.push({
        id: generateId(),
        text: line.replace(/^[*-]\s*/, ''),
        included: true
      })
    } else if (currentSection === 'experience') {
      if (line.match(/^###\s/) || (line && !line.startsWith('-') && !line.startsWith('*') && currentExperience === null)) {
        // New experience entry
        if (currentExperience) {
          data.workExperience.push(currentExperience)
        }
        currentExperience = {
          id: generateId(),
          company: line.replace(/^###\s*/, '').split('—')[0]?.trim() || '',
          role: line.replace(/^###\s*/, '').split('—')[1]?.trim() || '',
          dates: '',
          location: '',
          bullets: [],
          included: true
        }
      } else if (line.startsWith('-') || line.startsWith('*')) {
        // Bullet point
        if (currentExperience) {
          currentExperience.bullets.push({
            id: generateId(),
            text: line.replace(/^[*-]\s*/, ''),
            included: true
          })
        }
      }
    } else if (currentSection === 'skills' && line) {
      // Parse comma-separated skills
      const skillText = line.replace(/^[*-]\s*/, '')
      skillText.split(',').forEach(skill => {
        const trimmed = skill.trim()
        if (trimmed) {
          data.skills.push({
            id: generateId(),
            name: trimmed,
            included: true
          })
        }
      })
    }
  }

  // Add last experience if exists
  if (currentExperience) {
    data.workExperience.push(currentExperience)
  }

  // Add default summary if none found
  if (data.summaries.length === 0) {
    data.summaries.push({
      id: generateId(),
      text: markdown.slice(0, 500),
      included: true
    })
  }

  return data
}

function convertToMarkdown(data: ResumeData): string {
  let md = ''

  // Contact info
  if (data.contactInfo.included) {
    md += `# ${data.contactInfo.firstName} ${data.contactInfo.lastName}\n\n`
    const contact = [
      data.contactInfo.email,
      data.contactInfo.phone,
      data.contactInfo.linkedin,
      data.contactInfo.location
    ].filter(Boolean).join(' • ')
    md += `${contact}\n\n`
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

  // Initialize resume data from markdown
  useEffect(() => {
    if (optimizedContent && !resumeData) {
      const parsed = parseMarkdownToStructured(optimizedContent)
      setResumeData(parsed)
    }
  }, [optimizedContent, resumeData])

  // Build preview HTML
  const previewHtml = useMemo(() => {
    if (!resumeData) return ''

    let html = ''

    // Contact info
    if (resumeData.contactInfo.included) {
      html += `<div class="text-2xl font-semibold tracking-tight mb-1">${resumeData.contactInfo.firstName} ${resumeData.contactInfo.lastName}</div>`
      const contact = [
        resumeData.contactInfo.email,
        resumeData.contactInfo.phone,
        resumeData.contactInfo.linkedin,
        resumeData.contactInfo.location
      ].filter(Boolean).join(' • ')
      html += `<div class="text-sm text-neutral-400 mb-4">${contact}</div>`
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
    if (resumeData.contactInfo.included) count++
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

  return (
    <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 pt-8 pb-8">
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
          <div className="rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
              <button
                type="button"
                onClick={() => toggleSection('contact')}
                className="group inline-flex items-center gap-3"
              >
                <span className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.contact ? '' : '-rotate-90'}`} />
                </span>
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold">Contact Information</h3>
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-medium">
                <Wand2 className="h-4 w-4" />
                Enhance
              </button>
            </div>
            {expandedSections.contact && (
              <div className="px-4 sm:px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">First name</label>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={resumeData.contactInfo.included}
                        onChange={(e) => updateContactInfo('included', e.target.checked)}
                      />
                      <span className="h-5 w-5 rounded-md border border-white/20 bg-black/40 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                        <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                      </span>
                    </label>
                    <input
                      type="text"
                      value={resumeData.contactInfo.firstName}
                      onChange={(e) => updateContactInfo('firstName', e.target.value)}
                      className="w-full rounded-lg bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Last name</label>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={resumeData.contactInfo.included}
                        onChange={(e) => updateContactInfo('included', e.target.checked)}
                      />
                      <span className="h-5 w-5 rounded-md border border-white/20 bg-black/40 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                        <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                      </span>
                    </label>
                    <input
                      type="text"
                      value={resumeData.contactInfo.lastName}
                      onChange={(e) => updateContactInfo('lastName', e.target.value)}
                      className="w-full rounded-lg bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Contact details */}
                <div className="sm:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {(['email', 'phone', 'linkedin', 'location'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-sm text-white/60 mb-2 capitalize">{field}</label>
                      <input
                        type="text"
                        value={resumeData.contactInfo[field]}
                        onChange={(e) => updateContactInfo(field, e.target.value)}
                        className="w-full rounded-lg bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Target Title */}
          <div className="rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
              <button
                type="button"
                onClick={() => toggleSection('title')}
                className="group inline-flex items-center gap-3"
              >
                <span className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.title ? '' : '-rotate-90'}`} />
                </span>
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold">Target Title</h3>
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-medium">
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
                    <span className="h-5 w-5 rounded-md border border-white/20 bg-black/40 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                      <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                    </span>
                  </label>
                  <input
                    type="text"
                    value={resumeData.targetTitle.text}
                    onChange={(e) => setResumeData({ ...resumeData, targetTitle: { ...resumeData.targetTitle, text: e.target.value } })}
                    className="w-full rounded-lg bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g., Senior Product Manager"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Work Experience */}
          <div className="rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
              <button
                type="button"
                onClick={() => toggleSection('work')}
                className="group inline-flex items-center gap-3"
              >
                <span className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.work ? '' : '-rotate-90'}`} />
                </span>
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold">Work Experience</h3>
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-medium">
                <Wand2 className="h-4 w-4" />
                Generate bullets
              </button>
            </div>
            {expandedSections.work && (
              <div className="px-4 sm:px-6 py-5 space-y-5">
                {resumeData.workExperience.map((exp, idx) => (
                  <div key={exp.id} className="rounded-xl border border-white/10 bg-black/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
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
                          <span className="h-5 w-5 rounded-md border border-white/20 bg-black/40 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
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
                          className="bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-sm"
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
                          className="bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-sm"
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
                          className="bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-sm"
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
                            <span className="h-5 w-5 rounded-md border border-white/20 bg-black/40 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                              <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                            </span>
                          </label>
                          <textarea
                            rows={2}
                            value={bullet.text}
                            onChange={(e) => updateWorkBullet(exp.id, bullet.id, e.target.value)}
                            className="w-full rounded-lg bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                            placeholder="Describe your achievement or responsibility"
                          />
                          <button
                            onClick={() => removeWorkBullet(exp.id, bullet.id)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 mt-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      <div className="flex pt-2 items-center justify-between">
                        <button
                          onClick={() => addWorkBullet(exp.id)}
                          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
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
          <div className="rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
              <button
                type="button"
                onClick={() => toggleSection('skills')}
                className="group inline-flex items-center gap-3"
              >
                <span className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.skills ? '' : '-rotate-90'}`} />
                </span>
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold">Skills</h3>
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-medium">
                <Wand2 className="h-4 w-4" />
                Generate
              </button>
            </div>
            {expandedSections.skills && (
              <div className="px-4 sm:px-6 py-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.map((skill) => (
                    <div key={skill.id} className="group relative">
                      <label className="inline-block cursor-pointer">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={skill.included}
                          onChange={(e) => setResumeData({
                            ...resumeData,
                            skills: resumeData.skills.map(s =>
                              s.id === skill.id ? { ...s, included: e.target.checked } : s
                            )
                          })}
                        />
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-black/40 hover:bg-white/10 text-sm transition peer-checked:border-emerald-600 peer-checked:ring-1 peer-checked:ring-emerald-600/40">
                          {skill.name}
                        </span>
                      </label>
                      <button
                        onClick={() => removeSkill(skill.id)}
                        className="absolute -top-2 -right-2 hidden group-hover:inline-flex items-center justify-center h-6 w-6 rounded-md text-white/70 hover:text-white hover:bg-white/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex pt-2">
                  <button
                    onClick={() => {
                      const name = prompt('Add skill')
                      if (name) addSkill(name)
                    }}
                    className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add skill
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
    </div>
  )
}
