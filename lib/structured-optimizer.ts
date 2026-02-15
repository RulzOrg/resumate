import { parseResumeContent, type ParsedResume } from "@/lib/resume-parser"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { debugLog, debugWarn } from "@/lib/debug-logger"

const optimizedExperienceSchema = z.object({
  optimized_bullets: z.array(z.string()).describe("Optimized bullet points for this work experience entry"),
  keywords_added: z.array(z.string()).describe("Keywords that were added to this entry"),
  changes_made: z.array(z.string()).describe("Specific changes made to this entry"),
})

const optimizationResultSchema = z.object({
  optimized_summary: z.string().describe("Optimized or newly created professional summary"),
  target_title: z.string().optional().describe("Target job title - use existing if present, otherwise generate from job description"),
  optimized_experiences: z.array(optimizedExperienceSchema).describe("Optimized work experience entries, one per original entry"),
  changes_made: z.array(z.string()).describe("Overall changes made to the resume"),
  keywords_added: z.array(z.string()).describe("Keywords that were added"),
  match_score_before: z.number().min(0).max(100),
  match_score_after: z.number().min(0).max(100),
  recommendations: z.array(z.string()),
  summary_was_created: z.boolean().describe("Whether the summary was newly created (true) or optimized (false)"),
  target_title_was_created: z.boolean().describe("Whether the target title was newly created (true) or preserved (false)"),
})

export interface StructuredOptimizationResult {
  optimizedResume: ParsedResume
  optimizationDetails: {
    changes_made: string[]
    keywords_added: string[]
    match_score_before: number
    match_score_after: number
    recommendations: string[]
    summary_was_created: boolean
    target_title_was_created: boolean
  }
}

/**
 * Optimize resume using structured approach
 * PRESERVES: Contact, Education, Skills, Interests, Certifications, Awards, Projects, Volunteering, Publications
 * OPTIMIZES: Professional Summary, Work Experience bullets, Target Title
 */
export async function optimizeResumeStructured(
  resumeInput: string | ParsedResume,
  jobTitle: string,
  companyName: string | null,
  jobDescription: string,
  apiKey: string
): Promise<StructuredOptimizationResult> {
  let parsed: ParsedResume;

  // Step 1: Parse or use provided structure
  if (typeof resumeInput === 'string') {
    // Legacy behavior for string input
    let actualContent = resumeInput?.trim() || ''

    // Check if content is JSON-encoded (starts with {)
    if (actualContent.startsWith('{')) {
      try {
        const jsonContent = JSON.parse(actualContent)
        // Try multiple possible field names for the resume text
        const extractedText = jsonContent.text || jsonContent.content || jsonContent.resume || jsonContent.data
        if (extractedText && typeof extractedText === 'string') {
          actualContent = extractedText
          debugLog('[StructuredOptimizer] Extracted text from JSON-encoded content')
        }
      } catch (e) {
        // If JSON parsing fails, content might not be JSON - continue with original
        debugWarn('[StructuredOptimizer] Content starts with { but is not valid JSON, using as-is')
      }
    }

    // Validate we have usable resume content
    if (!actualContent || actualContent.length < 100) {
      throw new Error('Invalid resume content: content is too short (minimum 100 characters required)')
    }
    if (actualContent.trim().startsWith('{')) {
      throw new Error('Invalid resume content: content appears to be JSON data, not resume text')
    }

    debugLog('[StructuredOptimizer] Received string content:', {
      contentLength: actualContent.length,
      contentPreview: actualContent.substring(0, 500),
      contentType: typeof actualContent,
    })

    // Step 2: Parse master resume into structured data (using legacy regex parser for string input)
    parsed = parseResumeContent(actualContent)
  } else {
    // Use provided structured data directly
    debugLog('[StructuredOptimizer] Using provided structured resume data')
    parsed = resumeInput
  }

  // Normalize parsed data - ensure all required arrays exist
  parsed = {
    contact: parsed.contact || { name: '' },
    targetTitle: parsed.targetTitle,
    summary: parsed.summary,
    workExperience: parsed.workExperience || [],
    education: parsed.education || [],
    skills: parsed.skills || [],
    interests: parsed.interests || [],
    certifications: parsed.certifications || [],
    awards: parsed.awards || [],
    projects: parsed.projects || [],
    volunteering: parsed.volunteering || [],
    publications: parsed.publications || [],
  }

  // Step 2.1: Validate parsed data has minimum required content
  if (parsed.workExperience.length === 0) {
    throw new Error('No work experience found in resume. Please ensure your resume includes work experience section.')
  }
  if (!parsed.workExperience.some(exp => exp.bullets.length > 0)) {
    throw new Error('No bullet points found in work experience entries. Resume may not be formatted correctly.')
  }

  // Step 2.5: Clean up parsed data (fix any parsing issues)
  // Clean work experience company names (remove dates, excessive whitespace)
  parsed.workExperience.forEach(exp => {
    if (exp.company) {
      // Remove dates from company names
      let cleaned = exp.company.replace(/\s+.*\d{1,2}\/\d{4}.*$/i, '')
      cleaned = cleaned.replace(/[\s\t]{5,}.*$/, '') // Remove if 5+ spaces followed by anything
      cleaned = cleaned.replace(/[\s\t]+/g, ' ').trim()
      if (cleaned !== exp.company) {
        debugLog(`[StructuredOptimizer] Cleaned company name: '${exp.company}' → '${cleaned}'`)
        exp.company = cleaned
      }
    }
  })

  // Filter out certifications from education
  const originalEducationCount = parsed.education.length
  parsed.education = parsed.education.filter(edu => {
    if (!edu.institution) return false

    const institution = edu.institution.replace(/[\s\t]+/g, ' ').trim()
    const lowerInstitution = institution.toLowerCase()

    const isCertification = lowerInstitution.startsWith('certified') ||
      lowerInstitution.includes('certification') ||
      /^(AJ & Smart|IDEO U|Google|Microsoft|AWS|Salesforce|Adobe)/i.test(institution) ||
      /(Design Strategy|Workshopper|Sprint Facilitator|User Experience Specialist)/i.test(institution)

    if (isCertification) {
      debugLog(`[StructuredOptimizer] ⚠️ Filtering out certification from education: '${institution}'`)
      return false
    }

    // Clean up institution name
    let cleaned = institution.replace(/\s{3,}.*$/, '') // Remove trailing location if separated by 3+ spaces
    cleaned = cleaned.replace(/[\s\t]+/g, ' ').trim()
    if (cleaned !== edu.institution) {
      edu.institution = cleaned
    }

    return true
  })

  if (parsed.education.length !== originalEducationCount) {
    debugLog(`[StructuredOptimizer] Filtered ${originalEducationCount - parsed.education.length} certifications from education`)
  }

  debugLog('[StructuredOptimizer] Parsed resume:', {
    name: parsed.contact.name,
    hasSummary: !!parsed.summary,
    hasTargetTitle: !!parsed.targetTitle,
    experienceCount: parsed.workExperience.length,
    skillsCount: parsed.skills.length,
    educationCount: parsed.education.length,
    certificationsCount: parsed.certifications.length,
    projectsCount: parsed.projects.length,
    volunteeringCount: parsed.volunteering.length,
  })

  // Log detailed parsing results to identify issues
  debugLog('[StructuredOptimizer] Detailed parsing results:', {
    workExperience: parsed.workExperience.map(exp => ({
      company: exp.company?.substring(0, 100),
      title: exp.title,
      bulletsCount: exp.bullets.length,
      startDate: exp.startDate,
      endDate: exp.endDate,
    })),
    education: parsed.education.map(edu => ({
      institution: edu.institution?.substring(0, 100),
      degree: edu.degree,
    })),
    certifications: parsed.certifications.map(cert => ({
      name: cert.name?.substring(0, 100),
      issuer: cert.issuer,
    })),
  })

  // Step 3: Prepare work experience data for optimization
  const experienceData = parsed.workExperience.map((exp, idx) => ({
    index: idx,
    company: exp.company, // PRESERVE - will not be modified
    title: exp.title,    // PRESERVE - will not be modified
    location: exp.location,
    startDate: exp.startDate,
    endDate: exp.endDate,
    currentBullets: exp.bullets, // Only bullets will be optimized
  }))

  // Step 4: Call LLM to optimize only work experience bullets, summary, and target title
  const anthropic = new Anthropic({ apiKey })

  const messageContent = `You are an expert ATS resume optimization specialist. Your task is to optimize ONLY the professional summary, work experience bullet points, and target title to match a job description. You must PRESERVE all other sections exactly as they are.

**ORIGINAL RESUME DATA:**

Target Title (if exists): ${parsed.targetTitle || "NOT PROVIDED - generate one based on job description"}

Professional Summary (if exists): ${parsed.summary || "NOT PROVIDED - create one based on work experience and job description"}

Work Experience Entries:
${JSON.stringify(experienceData, null, 2)}

**TARGET JOB:**
Title: ${jobTitle}
Company: ${companyName || "Not specified"}
Description:
${jobDescription}

**CRITICAL PRESERVATION RULES - DO NOT MODIFY THESE SECTIONS:**
The following sections MUST be preserved EXACTLY as they appear in the original resume. If they don't exist in the original, DO NOT create them:
- Contact Information (name, email, phone, location, LinkedIn, website)
- Education (institution, degree, field, graduation date, notes)
- Skills (all skills exactly as listed)
- Interests
- Certifications
- Awards & Scholarships
- Projects
- Volunteering & Leadership
- Publications

**OPTIMIZATION RULES:**

1. **Target Title:**
   - If target title exists in original resume: Use it EXACTLY as provided (set target_title_was_created: false)
   - If target title does NOT exist: Generate a target job title based on the job title from the job description (set target_title_was_created: true)
   - The target title should be a concise job title that matches the role being applied for

2. **Professional Summary:**
   - If summary EXISTS in original resume: Optimize it to match job requirements while maintaining authenticity (set summary_was_created: false)
   - If summary does NOT exist: Create a new professional summary (2-4 sentences) based on:
     * The candidate's work experience
     * The job description requirements
     * Key qualifications and achievements
     (set summary_was_created: true)
   - Include relevant keywords from job description naturally
   - Keep it authentic to candidate's actual background

3. **Work Experience:**
   - CRITICAL: You must optimize EACH work experience entry SEPARATELY - DO NOT combine multiple entries into one
   - CRITICAL: The "optimized_experiences" array MUST have exactly the same number of entries as the input array
   - CRITICAL: Each entry in "optimized_experiences" corresponds to the entry at the SAME INDEX in the input array
   - PRESERVE company name (place of work) EXACTLY as provided - each entry keeps its own company
   - PRESERVE job title EXACTLY as provided - each entry keeps its own title
   - PRESERVE dates, location, and employment type for each entry
   - For bullet points optimization:
     * CRITICAL: Each entry MUST have the EXACT SAME NUMBER of bullets as the original entry
     * If original entry has 4 bullets, optimized entry MUST have exactly 4 bullets - no more, no less
     * If original entry has 6 bullets, optimized entry MUST have exactly 6 bullets - no more, no less
     * DO NOT add new bullets - only rewrite existing ones to be more impactful
     * DO NOT remove bullets - optimize all of them
     * Add relevant keywords from job description naturally into the existing bullets
     * Emphasize achievements that match job requirements
     * Use strong action verbs and quantifiable metrics
     * Reorder bullets to prioritize most relevant achievements
     * Maintain truthfulness - don't fabricate achievements
     * Each entry's bullets should reflect ONLY that specific job/company

**OUTPUT FORMAT:**

Provide a JSON object with this structure:
\`\`\`json
{
  "optimized_summary": "The optimized or newly created professional summary",
  "target_title": "Target job title (preserved if existed, generated if not)",
  "optimized_experiences": [
    {
      "optimized_bullets": ["bullet 1", "bullet 2", "..."],
      "keywords_added": ["keyword1", "keyword2"],
      "changes_made": ["change description 1", "change description 2"]
    },
    // ... one entry per work experience
  ],
  "changes_made": ["Overall change 1", "Overall change 2"],
  "keywords_added": ["keyword1", "keyword2", "..."],
  "match_score_before": 65,
  "match_score_after": 85,
  "recommendations": ["recommendation 1", "recommendation 2"],
  "summary_was_created": false,
  "target_title_was_created": true
}
\`\`\`

**CRITICAL REQUIREMENTS:**
- The "optimized_experiences" array MUST have EXACTLY the SAME LENGTH as the input work experience array
- If input has 3 entries, output MUST have 3 entries - no more, no less
- Each entry in "optimized_experiences" corresponds to the work experience at the SAME INDEX (0, 1, 2, etc.)
- Entry at index 0 in output corresponds to entry at index 0 in input
- Entry at index 1 in output corresponds to entry at index 1 in input
- And so on...
- Company names and job titles are PRESERVED - only bullets are optimized
- Each entry must maintain its own separate identity - DO NOT combine entries
- Each entry MUST have the EXACT SAME bullet count as the original (3 bullets → 3 bullets, NOT 4 or 5)
- Do not add skills, education, or other sections that don't exist in the original
- If a section doesn't exist in original, it should remain empty (not generated)

**EXAMPLE:**
If input has:
- Entry 0: Company A, Title A, 3 bullets
- Entry 1: Company B, Title B, 4 bullets

Then output MUST have:
- optimized_experiences[0]: EXACTLY 3 bullets (for Company A, Title A)
- optimized_experiences[1]: EXACTLY 4 bullets (for Company B, Title B)

NOT:
- optimized_experiences[0]: 5 bullets ❌ (added bullets)
- optimized_experiences[0]: 2 bullets ❌ (removed bullets)
- optimized_experiences[0]: 15 bullets ❌ (combined entries)`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: messageContent,
    }],
  })

  // Step 5: Parse LLM response
  if (!response.content || response.content.length === 0) {
    throw new Error('Empty response from Anthropic')
  }

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error(`Unexpected response format: ${content.type}`)
  }

  let jsonText = content.text.trim()

  // Extract JSON from response
  const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1]
  } else {
    const firstBrace = jsonText.indexOf('{')
    const lastBrace = jsonText.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1)
    }
  }

  const parsedResult = JSON.parse(jsonText.trim())
  const optimization = optimizationResultSchema.parse(parsedResult)

  // Validate that we have the right number of optimized experiences
  if (optimization.optimized_experiences.length !== parsed.workExperience.length) {
    throw new Error(
      `Mismatch: expected ${parsed.workExperience.length} optimized experiences, got ${optimization.optimized_experiences.length}`
    )
  }

  // Validate that each entry maintains reasonable bullet count (not merged)
  optimization.optimized_experiences.forEach((optExp, idx) => {
    const originalExp = parsed.workExperience[idx]
    const originalBulletCount = originalExp.bullets.length
    const optimizedBulletCount = optExp.optimized_bullets.length

    // Log for debugging
    debugLog(`[StructuredOptimizer] Entry ${idx}: ${originalExp.company} - ${originalExp.title} - bullets: ${originalBulletCount} → ${optimizedBulletCount}`)

    // Only flag as merged if optimized has significantly more bullets than original (3x+ is suspicious)
    // This catches cases where LLM combined multiple jobs into one
    // Note: removed hard 8-bullet limit since some jobs legitimately have many accomplishments
    if (optimizedBulletCount > originalBulletCount * 3 && optimizedBulletCount > 15) {
      debugWarn(`[StructuredOptimizer] Entry ${idx} (${originalExp.company}) has suspicious bullet count: ${originalBulletCount} → ${optimizedBulletCount}. May indicate merged entries.`)
    }
  })

  // Step 6: Reconstruct optimized resume
  const optimizedResume: ParsedResume = {
    // PRESERVE contact info exactly
    contact: { ...parsed.contact },

    // Use optimized or preserved target title
    targetTitle: optimization.target_title || parsed.targetTitle,

    // Use optimized or newly created summary
    summary: optimization.optimized_summary,

    // Reconstruct work experience with PRESERVED company/title/dates, optimized bullets
    workExperience: parsed.workExperience.map((exp, idx) => {
      const optimized = {
        company: exp.company, // PRESERVED EXACTLY
        title: exp.title,    // PRESERVED EXACTLY
        location: exp.location, // PRESERVED EXACTLY
        startDate: exp.startDate, // PRESERVED EXACTLY
        endDate: exp.endDate, // PRESERVED EXACTLY
        employmentType: exp.employmentType, // PRESERVED EXACTLY
        bullets: optimization.optimized_experiences[idx].optimized_bullets, // OPTIMIZED ONLY
      }

      // Log to verify preservation
      debugLog(`[StructuredOptimizer] Preserving entry ${idx}:`, {
        company: optimized.company || '(empty)',
        title: optimized.title || '(empty)',
        dates: `${optimized.startDate || 'N/A'} - ${optimized.endDate || 'N/A'}`,
        location: optimized.location || 'N/A',
        employmentType: optimized.employmentType || 'N/A',
        bulletsCount: optimized.bullets.length,
        originalBulletsCount: exp.bullets.length,
      })

      return optimized
    }),

    // PRESERVE all other sections EXACTLY (if they exist, otherwise empty arrays)
    education: [...parsed.education],
    skills: [...parsed.skills],
    certifications: [...parsed.certifications],
    projects: [...parsed.projects],
    volunteering: [...parsed.volunteering],
    publications: [...parsed.publications],
    interests: [...parsed.interests],
    awards: [...parsed.awards],
  }

  return {
    optimizedResume,
    optimizationDetails: {
      changes_made: optimization.changes_made,
      keywords_added: optimization.keywords_added,
      match_score_before: optimization.match_score_before,
      match_score_after: optimization.match_score_after,
      recommendations: optimization.recommendations,
      summary_was_created: optimization.summary_was_created,
      target_title_was_created: optimization.target_title_was_created,
    },
  }
}
