/**
 * Resume Indexing Utility
 *
 * Splits resume content into searchable chunks (bullets/sections) and indexes them
 * into Qdrant vector database for evidence-based scoring.
 */

import { createHash } from "crypto"
import { embedTexts } from "./embeddings"
import { upsertPoints, deletePoints } from "./qdrant"

export interface IndexResumeInput {
  resumeId: string
  userId: string
  content: string
  metadata?: Record<string, any>
}

/**
 * Split resume content into meaningful chunks (bullets, sentences, or sections)
 * Prioritizes extracting clean experience bullets over other resume sections
 */
export function splitResumeIntoChunks(content: string): string[] {
  const chunks: string[] = []
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)

  // Common section headers to identify resume structure
  const experienceHeaders = /^(work\s+)?experience|employment|professional\s+background|career\s+history/i
  const educationHeaders = /^education|academic|degrees?/i
  const skillsHeaders = /^skills|competencies|expertise|technical\s+skills/i
  const certHeaders = /^certifications?|certificates?|licenses?/i
  const projectHeaders = /^projects?|portfolio/i

  let currentSection = 'unknown'

  // Action verbs that indicate quality experience bullets
  const actionVerbs = /^(led|managed|designed|developed|created|implemented|built|launched|drove|established|improved|increased|reduced|achieved|delivered|spearheaded|coordinated|executed|analyzed|optimized|architected|engineered|mentored|scaled|initiated|transformed)/i

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect section changes
    if (experienceHeaders.test(line)) {
      currentSection = 'experience'
      continue
    } else if (educationHeaders.test(line)) {
      currentSection = 'education'
      continue
    } else if (skillsHeaders.test(line)) {
      currentSection = 'skills'
      continue
    } else if (certHeaders.test(line)) {
      currentSection = 'certifications'
      continue
    } else if (projectHeaders.test(line)) {
      currentSection = 'projects'
      continue
    }

    // Skip very short lines, headers, and pure uppercase lines (likely section titles)
    if (line.length < 15 || (/[A-Za-z]/.test(line) && line === line.toUpperCase())) continue

    // Detect bullet points (•, -, *, or numbered lists)
    const bulletMatch = line.match(/^[\s]*[•\-*◦▪▫‣⁃∙][\s]+(.+)$/) ||
                       line.match(/^[\s]*\d+\.[\s]+(.+)$/)

    if (bulletMatch) {
      const bulletText = bulletMatch[1].trim()

      // For experience section: only keep bullets with action verbs
      if (currentSection === 'experience') {
        if (bulletText.length >= 20 && bulletText.length <= 250 && actionVerbs.test(bulletText)) {
          chunks.push(bulletText)
        }
      }
      // For projects: similar to experience
      else if (currentSection === 'projects') {
        if (bulletText.length >= 20 && bulletText.length <= 250 && actionVerbs.test(bulletText)) {
          chunks.push(bulletText)
        }
      }
      // For skills: extract if it's a meaningful skill statement (not just "Python, Java")
      else if (currentSection === 'skills') {
        // Only keep skill bullets that are full sentences with context, not just lists
        if (bulletText.length >= 30 && bulletText.length <= 150 && /\s+/.test(bulletText)) {
          chunks.push(bulletText)
        }
      }
    } else {
      // Not a bullet - check if it's a standalone achievement or responsibility
      // Look for sentences that start with action verbs in experience section
      if (currentSection === 'experience' && actionVerbs.test(line)) {
        if (line.length >= 25 && line.length <= 250) {
          chunks.push(line)
        }
      }
    }
  }

  // If we found very few chunks, use a less strict fallback
  if (chunks.length < 5) {
    console.warn('[resume-indexer] Found <5 chunks with strict filtering, using fallback...')

    for (const line of lines) {
      // Skip very short, very long, or all-caps lines
      if (line.length < 20 || line.length > 300 || (/[A-Za-z]/.test(line) && line === line.toUpperCase())) continue

      // Skip lines that are likely headers/metadata
      if (/^(name|email|phone|address|linkedin|github|portfolio)/i.test(line)) continue

      // Look for lines with action verbs or meaningful content indicators
      const hasActionVerb = actionVerbs.test(line)
      const hasDescriptiveContent = /\b(responsible for|worked on|managed|led|created|developed|contributed|participated|collaborated|assisted)\b/i.test(line)
      const hasMetrics = /\d+%|\d+\+|\$\d+|increased|decreased|improved|reduced/i.test(line)
      const seemsLikeBullet = line.match(/^[•\-*◦▪▫‣⁃∙]/) || (line.split(/\s+/).length >= 6 && line.split(/\s+/).length <= 40)

      if (hasActionVerb || hasDescriptiveContent || (hasMetrics && seemsLikeBullet)) {
        if (!chunks.includes(line)) {
          chunks.push(line)
        }
      }
    }
  }

  // If still very few chunks, be even more lenient
  if (chunks.length < 3) {
    console.warn('[resume-indexer] Still <3 chunks, using very lenient fallback...')

    for (const line of lines) {
      if (line.length < 25 || line.length > 350) continue
      if (/[A-Za-z]/.test(line) && line === line.toUpperCase()) continue
      if (/^(name|email|phone|address|linkedin|github|portfolio):/i.test(line)) continue

      // Accept any line that looks like a sentence (has multiple words)
      const words = line.split(/\s+/)
      if (words.length >= 6 && words.length <= 50 && !chunks.includes(line)) {
        chunks.push(line)
      }
    }
  }

  // Deduplicate and filter out noise
  const uniqueChunks = Array.from(new Set(chunks))
    .filter(chunk => {
      // Remove chunks that are just URLs, emails, phone numbers
      if (/^(https?:\/\/|www\.|[\w.-]+@[\w.-]+|\+?\d{10,})/.test(chunk)) return false

      // Remove chunks that are likely headers or metadata
      if (chunk.split(/\s+/).length < 4) return false

      return true
    })

  console.log(`[resume-indexer] Extracted ${uniqueChunks.length} quality chunks from resume`)

  return uniqueChunks
}

/**
 * Index a resume into Qdrant for vector search
 */
export async function indexResume(input: IndexResumeInput): Promise<{
  success: boolean
  chunksIndexed: number
  error?: string
}> {
  try {
    const { resumeId, userId, content, metadata = {} } = input

    if (!content || content.trim().length < 50) {
      return {
        success: false,
        chunksIndexed: 0,
        error: 'Resume content too short to index'
      }
    }

    // Extract plain text from content (handle JSON format with "markdown" key)
    let plainText = content
    try {
      const parsed = JSON.parse(content)
      if (parsed.markdown) {
        plainText = parsed.markdown
      } else if (parsed.text) {
        plainText = parsed.text
      }
    } catch (e) {
      // Not JSON, use as-is
      plainText = content
    }

    if (!plainText || plainText.trim().length < 50) {
      return {
        success: false,
        chunksIndexed: 0,
        error: 'Resume content too short after extraction'
      }
    }

    // Split into searchable chunks
    const chunks = splitResumeIntoChunks(plainText)

    if (chunks.length === 0) {
      return {
        success: false,
        chunksIndexed: 0,
        error: 'No meaningful content chunks found'
      }
    }

    // Generate embeddings for all chunks
    console.log(`[resume-indexer] Generating embeddings for ${chunks.length} chunks...`)
    const embeddings = await embedTexts(chunks)

    // Prepare points for Qdrant
    // Note: Qdrant requires point IDs to be either integers or UUIDs
    // We'll use full SHA-256 hash as a UUID to avoid collision risks with 32-bit truncation
    const points = chunks.map((text, index) => {
      // Create a stable UUID from resumeId + index using SHA-256
      const hashString = `${resumeId}-${index}`
      const sha256Hash = createHash('sha256').update(hashString).digest()
      // Use full SHA-256 hash as hex-encoded UUID (no truncation to avoid collisions)
      const pointId = sha256Hash.toString('hex')

      const evidenceId = `${resumeId}:${index}` // Keep this for payload/metadata

      return {
        id: pointId, // Use full hash UUID for Qdrant
        vector: embeddings[index],
        payload: {
          text,
          userId,
          resume_id: resumeId,
          evidence_id: evidenceId, // Keep string format in payload
          section: detectSection(text),
          chunk_index: index,
          ...metadata
        }
      }
    })

    // Upsert to Qdrant
    console.log(`[resume-indexer] Upserting ${points.length} points to Qdrant...`)
    await upsertPoints(points)

    console.log(`[resume-indexer] Successfully indexed resume ${resumeId}: ${points.length} chunks`)

    return {
      success: true,
      chunksIndexed: points.length
    }
  } catch (error: any) {
    console.error('[resume-indexer] Error indexing resume:', error)
    return {
      success: false,
      chunksIndexed: 0,
      error: error.message || 'Unknown indexing error'
    }
  }
}

/**
 * Detect which section a chunk likely belongs to
 */
function detectSection(text: string): string {
  const lower = text.toLowerCase()

  if (lower.includes('led') || lower.includes('managed') || lower.includes('developed') ||
      lower.includes('designed') || lower.includes('implemented') || lower.includes('created')) {
    return 'experience'
  }

  if (lower.includes('bachelor') || lower.includes('master') || lower.includes('degree') ||
      lower.includes('university') || lower.includes('college')) {
    return 'education'
  }

  if (lower.includes('skill') || lower.includes('proficient') || lower.includes('experienced in') ||
      lower.includes('expertise')) {
    return 'skills'
  }

  if (lower.includes('certified') || lower.includes('certification')) {
    return 'certifications'
  }

  if (lower.includes('project') || lower.includes('portfolio')) {
    return 'projects'
  }

  return 'other'
}

/**
 * Delete all indexed chunks for a resume
 */
export async function deleteResumeIndex(resumeId: string): Promise<void> {
  try {
    await deletePoints({ resume_id: resumeId })
    console.log(`[resume-indexer] Successfully deleted index for resume ${resumeId}`)
    return
  } catch (error: any) {
    console.error(`[resume-indexer] Error deleting index for resume ${resumeId}:`, error)
    throw error
  }
}
