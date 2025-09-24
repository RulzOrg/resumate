/**
 * Content processing utilities for job descriptions
 * Handles intelligent truncation, section extraction, and content optimization
 */

export interface ContentSection {
  type: 'title' | 'company' | 'requirements' | 'skills' | 'benefits' | 'culture' | 'other'
  content: string
  priority: number // 1-5, where 1 is highest priority
}

export interface TruncationResult {
  truncatedContent: string
  wasTruncated: boolean
  originalLength: number
  truncatedLength: number
  removedSections: string[]
  preservedSections: string[]
}

/**
 * Intelligently truncate job description while preserving important sections
 */
export function intelligentTruncate(
  content: string, 
  maxLength: number = 4000,
  preserveStructure: boolean = true
): TruncationResult {
  const original = content.trim()
  const originalLength = original.length

  if (originalLength <= maxLength) {
    return {
      truncatedContent: original,
      wasTruncated: false,
      originalLength,
      truncatedLength: originalLength,
      removedSections: [],
      preservedSections: ['all']
    }
  }

  if (!preserveStructure) {
    // Simple truncation
    return {
      truncatedContent: original.substring(0, maxLength - 50) + "\n\n[Content truncated for analysis]",
      wasTruncated: true,
      originalLength,
      truncatedLength: maxLength,
      removedSections: ['end-content'],
      preservedSections: ['beginning']
    }
  }

  // Extract and prioritize sections
  const sections = extractSections(original)
  const result = prioritizedTruncation(sections, maxLength, originalLength)
  
  return result
}

/**
 * Extract different sections from job description with priority scoring
 */
function extractSections(content: string): ContentSection[] {
  const sections: ContentSection[] = []
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
  
  let currentSection: ContentSection | null = null
  let currentContent: string[] = []
  
  for (const line of lines) {
    const sectionType = identifySectionType(line)
    
    if (sectionType !== 'other' && (!currentSection || currentSection.type !== sectionType)) {
      // Finish previous section
      if (currentSection && currentContent.length > 0) {
        currentSection.content = currentContent.join('\n').trim()
        if (currentSection.content) {
          sections.push(currentSection)
        }
      }
      
      // Start new section
      currentSection = {
        type: sectionType,
        content: '',
        priority: getSectionPriority(sectionType)
      }
      currentContent = [line]
    } else {
      // Continue current section
      currentContent.push(line)
    }
  }
  
  // Add final section
  if (currentSection && currentContent.length > 0) {
    currentSection.content = currentContent.join('\n').trim()
    if (currentSection.content) {
      sections.push(currentSection)
    }
  }
  
  // If no structured sections found, treat as single section
  if (sections.length === 0) {
    sections.push({
      type: 'other',
      content: content.trim(),
      priority: 3
    })
  }
  
  return sections
}

/**
 * Identify section type based on content patterns
 */
function identifySectionType(line: string): ContentSection['type'] {
  // Requirements indicators
  
  // Requirements indicators
  if (/(requirements?|qualifications?|must have|required|essential):/i.test(line) ||
      /(what you.ll need|what we.re looking for|ideal candidate)/i.test(line)) {
    return 'requirements'
  }
  
  // Skills indicators
  if (/(skills?|technologies?|tech stack|tools?):/i.test(line) ||
      /(experience with|proficiency in|knowledge of)/i.test(line)) {
    return 'skills'
  }
  
  // Benefits indicators
  if (/(benefits?|perks?|compensation|salary|we offer):/i.test(line) ||
      /(health|dental|vision|401k|remote|flexible)/i.test(line)) {
    return 'benefits'
  }
  
  // Culture indicators
  if (/(culture|values?|team|company|mission|vision):/i.test(line) ||
      /(our team|join us|work environment)/i.test(line)) {
    return 'culture'
  }
  
  // Company/title (usually at the beginning)
  if (/(job title|position|role):/i.test(line) ||
      /(company|organization|about us):/i.test(line)) {
    return 'company'
  }
  
  return 'other'
}

/**
 * Get priority score for section types (1 = highest priority)
 */
function getSectionPriority(type: ContentSection['type']): number {
  const priorities = {
    title: 1,
    requirements: 1,
    skills: 1,
    company: 2,
    benefits: 3,
    culture: 4,
    other: 3
  }
  return priorities[type]
}

/**
 * Perform prioritized truncation of sections
 */
function prioritizedTruncation(sections: ContentSection[], maxLength: number, originalLength: number): TruncationResult {
  // Sort by priority (lower number = higher priority)
  const sortedSections = [...sections].sort((a, b) => a.priority - b.priority)
  
  let totalLength = 0
  const preservedSections: string[] = []
  const removedSections: string[] = []
  const finalContent: string[] = []
  
  // Add sections in priority order until we reach the limit
  for (const section of sortedSections) {
    const sectionLength = section.content.length + 2 // +2 for newlines
    
    if (totalLength + sectionLength <= maxLength - 100) { // Reserve 100 chars for truncation notice
      finalContent.push(section.content)
      preservedSections.push(section.type)
      totalLength += sectionLength
    } else {
      // Try to fit a truncated version of this section
      const availableSpace = maxLength - totalLength - 100
      if (availableSpace > 200 && section.priority <= 2) { // Only truncate high-priority sections
        const truncatedSection = section.content.substring(0, availableSpace - 50) + "..."
        finalContent.push(truncatedSection)
        preservedSections.push(`${section.type}(partial)`)
        totalLength += truncatedSection.length + 2
      } else {
        removedSections.push(section.type)
      }
    }
  }
  
  // Add truncation notice
  const truncationNotice = "\n\n[Content truncated for analysis - full content will be used for final analysis]"
  const result = finalContent.join('\n\n') + truncationNotice
  
  return {
    truncatedContent: result,
    wasTruncated: true,
    originalLength: originalLength,
    truncatedLength: result.length,
    removedSections,
    preservedSections
  }
}

/**
 * Summarize content that's too long for analysis
 */
export function summarizeContent(content: string, maxLength: number = 2000): string {
  if (content.length <= maxLength) return content
  
  const sections = extractSections(content)
  const highPrioritySections = sections
    .filter(s => s.priority <= 2)
    .map(s => s.content)
    .join('\n\n')
  
  if (highPrioritySections.length <= maxLength) {
    return highPrioritySections + "\n\n[Lower priority sections summarized]"
  }
  
  // If even high priority sections are too long, truncate them
  return intelligentTruncate(highPrioritySections, maxLength, false).truncatedContent
}

/**
 * Validate content length and provide recommendations
 */
export interface ContentAnalysis {
  isValid: boolean
  length: number
  recommendation: string
  suggestedAction: 'none' | 'truncate' | 'summarize' | 'edit'
  issues: string[]
}

export function analyzeContentLength(content: string, context: 'preview' | 'analysis' = 'preview'): ContentAnalysis {
  const length = content.trim().length
  const limits = {
    preview: { min: 50, ideal: 2000, max: 4000 },
    analysis: { min: 100, ideal: 3000, max: 50000 }
  }
  
  const limit = limits[context]
  const issues: string[] = []
  let recommendation = ""
  let suggestedAction: ContentAnalysis['suggestedAction'] = 'none'
  
  if (length < limit.min) {
    issues.push(`Content too short (${length} chars, minimum ${limit.min})`)
    recommendation = "Add more details about requirements, skills, and responsibilities"
    suggestedAction = 'edit'
  } else if (length > limit.max) {
    issues.push(`Content too long (${length} chars, maximum ${limit.max})`)
    recommendation = "Content will be automatically truncated to preserve key sections"
    suggestedAction = context === 'preview' ? 'truncate' : 'summarize'
  } else if (length > limit.ideal) {
    recommendation = "Content is long but manageable. Consider condensing for better analysis."
    suggestedAction = 'truncate'
  } else {
    recommendation = "Content length is optimal for analysis"
  }
  
  return {
    isValid: length >= limit.min && length <= limit.max,
    length,
    recommendation,
    suggestedAction,
    issues
  }
}