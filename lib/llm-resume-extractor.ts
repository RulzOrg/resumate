import { type ParsedResume } from "@/lib/resume-parser"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { createLogger } from "@/lib/debug-logger"

const logger = createLogger("LLM-Resume-Extractor")

// Document type detection result
export type DocumentValidationResult = {
  isResume: boolean
  documentType?: 'resume' | 'cover_letter' | 'job_description' | 'bank_statement' | 'invoice' | 'legal_document' | 'academic_paper' | 'other'
  confidence: 'high' | 'medium' | 'low'
  message: string
}

/**
 * Quickly validate if the provided text content is a resume/CV
 * This is a lightweight check meant to be called during upload before full extraction
 *
 * @param rawText - The extracted text content from the uploaded file
 * @param apiKey - Optional Anthropic API key
 * @returns Validation result indicating if the content is a resume
 */
export async function validateResumeContent(
  rawText: string,
  apiKey?: string
): Promise<DocumentValidationResult> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    // If no API key, assume it's valid and let full extraction handle it later
    logger.warn("No API key for content validation, skipping check")
    return {
      isResume: true,
      confidence: 'low',
      message: 'Validation skipped due to missing API key'
    }
  }

  // Basic pre-validation - too short to be a resume
  if (!rawText || rawText.trim().length < 100) {
    return {
      isResume: false,
      documentType: 'other',
      confidence: 'high',
      message: 'The document is too short to be a valid resume. Please upload a complete resume.'
    }
  }

  // Quick pattern-based checks for obviously non-resume documents
  const nonResumePatterns = [
    { pattern: /account\s*(number|no\.?|#)|statement\s*period|opening\s*balance|closing\s*balance|transaction\s*details/i, type: 'bank_statement' as const },
    { pattern: /invoice\s*(number|no\.?|#)|bill\s*to|amount\s*due|payment\s*terms|due\s*date/i, type: 'invoice' as const },
    { pattern: /hereby\s*(agree|certify|declare)|witness\s*whereof|legal\s*agreement|terms\s*and\s*conditions/i, type: 'legal_document' as const },
    { pattern: /dear\s*(hiring\s*manager|recruiter|sir|madam)|i\s*am\s*(writing|applying)\s*(to|for)|please\s*find\s*(attached|enclosed)/i, type: 'cover_letter' as const },
    { pattern: /job\s*(description|requirements|responsibilities)|we\s*are\s*(looking|seeking)|ideal\s*candidate|apply\s*(now|today)|qualifications\s*required/i, type: 'job_description' as const },
    { pattern: /abstract[\s\S]{0,50}(introduction|methodology|results|conclusion)|references[\s\S]{0,100}\[\d+\]|doi:|arxiv:/i, type: 'academic_paper' as const },
  ]

  for (const { pattern, type } of nonResumePatterns) {
    if (pattern.test(rawText)) {
      // Found a strong indicator of non-resume content, but use LLM to confirm
      logger.log(`Pattern match suggests document type: ${type}`)
      break
    }
  }

  // Check for resume indicators
  const resumeIndicators = [
    /work\s*experience|professional\s*experience|employment\s*history/i,
    /education|academic|university|college|degree/i,
    /skills|competencies|expertise|proficiencies/i,
    /\b(resume|curriculum\s*vitae|cv)\b/i,
    /(email|phone|linkedin|contact)/i,
  ]

  const indicatorMatches = resumeIndicators.filter(p => p.test(rawText)).length

  // If no resume indicators found at all, likely not a resume
  if (indicatorMatches === 0) {
    logger.log("No resume indicators found in document")
  }

  try {
    const client = new Anthropic({ apiKey: key })

    // Use a fast, focused prompt for classification
    const truncatedText = rawText.length > 3000 ? rawText.substring(0, 3000) : rawText

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 256,
      system: `You are a document classifier. Your ONLY job is to determine if a document is a resume/CV or something else.

CLASSIFICATION RULES:
- A RESUME/CV must contain: A person's name + contact info + work history OR education
- NOT a resume: bank statements, invoices, cover letters, job descriptions, academic papers, legal documents, receipts, bills, contracts

Respond ONLY with valid JSON in this exact format:
{"is_resume": boolean, "document_type": "resume"|"cover_letter"|"job_description"|"bank_statement"|"invoice"|"legal_document"|"academic_paper"|"other", "confidence": "high"|"medium"|"low", "reason": "brief explanation"}`,
      messages: [
        { role: "user", content: `Classify this document:\n\n${truncatedText}` }
      ]
    })

    // Parse the response
    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error("No text response from classifier")
    }

    // Extract JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse classifier response")
    }

    const result = JSON.parse(jsonMatch[0])

    logger.log(`Document classification result:`, result)

    if (result.is_resume) {
      return {
        isResume: true,
        documentType: 'resume',
        confidence: result.confidence || 'medium',
        message: 'Document validated as a resume'
      }
    }

    // Map document types to user-friendly messages
    const typeMessages: Record<string, string> = {
      'bank_statement': 'This appears to be a bank statement, not a resume. Please upload your actual resume or CV.',
      'invoice': 'This appears to be an invoice or bill, not a resume. Please upload your actual resume or CV.',
      'cover_letter': 'This appears to be a cover letter, not a resume. Please upload your resume or CV instead.',
      'job_description': 'This appears to be a job description, not a resume. Please upload your resume or CV instead.',
      'legal_document': 'This appears to be a legal document, not a resume. Please upload your actual resume or CV.',
      'academic_paper': 'This appears to be an academic paper, not a resume. Please upload your resume or CV instead.',
      'other': 'This document does not appear to be a resume or CV. Please upload a valid resume.',
    }

    return {
      isResume: false,
      documentType: result.document_type || 'other',
      confidence: result.confidence || 'medium',
      message: typeMessages[result.document_type] || typeMessages['other']
    }

  } catch (error: any) {
    logger.error("Content validation error:", error)

    // On error, use pattern-based fallback
    if (indicatorMatches >= 3) {
      return {
        isResume: true,
        confidence: 'low',
        message: 'Document appears to be a resume based on content patterns'
      }
    }

    // If very few indicators and patterns suggest non-resume, reject
    if (indicatorMatches === 0) {
      return {
        isResume: false,
        documentType: 'other',
        confidence: 'low',
        message: 'This document does not appear to be a resume. Please upload a valid resume or CV.'
      }
    }

    // Default to allowing it through if uncertain
    return {
      isResume: true,
      confidence: 'low',
      message: 'Document validation inconclusive, proceeding with processing'
    }
  }
}

// Define the schema using Zod for validation and tool definition
// This matches the ParsedResume interface but with Zod validation
const ContactInfoSchema = z.object({
  name: z.string().describe("Full name of the candidate"),
  location: z.string().nullish().describe("City, State/Country"),
  phone: z.string().nullish().describe("Phone number"),
  email: z.string().nullish().describe("Email address"),
  linkedin: z.string().nullish().describe("LinkedIn profile URL"),
  website: z.string().nullish().describe("Personal website or portfolio URL"),
})

const WorkExperienceItemSchema = z.object({
  company: z.string().describe("Company name"),
  title: z.string().describe("Job title"),
  location: z.string().nullish().describe("Job location"),
  startDate: z.string().nullish().describe("Start date (e.g., 'Jan 2020')"),
  endDate: z.string().nullish().describe("End date (e.g., 'Present', 'Dec 2022')"),
  employmentType: z.string().nullish().describe("Full-time, Contract, etc."),
  bullets: z.array(z.string()).describe("List of work responsibilities and achievements"),
})

const EducationItemSchema = z.object({
  institution: z.string().describe("University or School name"),
  degree: z.string().nullish().describe("Degree name (e.g., BS Computer Science)"),
  field: z.string().nullish().describe("Field of study"),
  graduationDate: z.string().nullish().describe("Graduation date/year"),
  notes: z.string().nullish().describe("GPA, Honors, etc."),
})

const CertificationItemSchema = z.object({
  name: z.string().describe("Name of certification"),
  issuer: z.string().nullish().describe("Issuing organization"),
  date: z.string().nullish().describe("Date obtained"),
})

const ProjectItemSchema = z.object({
  name: z.string().describe("Project name"),
  description: z.string().nullish().describe("Project description"),
  technologies: z.array(z.string()).optional().describe("Technologies used"),
  bullets: z.array(z.string()).describe("Details about the project"),
})

const VolunteerItemSchema = z.object({
  organization: z.string().describe("Organization name"),
  role: z.string().nullish().describe("Role title"),
  dates: z.string().nullish().describe("Dates of service"),
  description: z.string().nullish().describe("Description of volunteer work"),
})

const PublicationItemSchema = z.object({
  title: z.string().describe("Publication title"),
  publisher: z.string().nullish().describe("Publisher or conference name"),
  date: z.string().nullish().describe("Publication date"),
  description: z.string().nullish().describe("Description"),
})

const ParsedResumeSchema = z.object({
  contact: ContactInfoSchema,
  targetTitle: z.string().nullish().describe("Target job title or headline from resume"),
  summary: z.string().nullish().describe("Professional summary"),
  workExperience: z.array(WorkExperienceItemSchema),
  education: z.array(EducationItemSchema),
  skills: z.array(z.string()).describe("List of skills"),
  interests: z.array(z.string()).optional().default([]),
  certifications: z.preprocess(
    (val) => {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
        return val.map(name => ({ name }));
      }
      return val;
    },
    z.array(CertificationItemSchema).optional().default([])
  ),
  awards: z.array(z.string()).optional().default([]),
  projects: z.array(ProjectItemSchema).optional().default([]),
  volunteering: z.array(VolunteerItemSchema).optional().default([]),
  publications: z.array(PublicationItemSchema).optional().default([]),
})

export type StructuredResume = z.infer<typeof ParsedResumeSchema>

export type ExtractionResult = {
  success: boolean
  resume?: ParsedResume
  error?: {
    code: 'NOT_A_RESUME' | 'INCOMPLETE' | 'EXTRACTION_FAILED' | 'INVALID_INPUT'
    documentType?: string
    message: string
  }
  metadata?: {
    truncated?: boolean
    originalLength?: number
    truncatedLength?: number
  }
}

/**
 * Extract structured resume data from raw text using Anthropic LLM
 * Handles diverse formats, layouts, and languages
 */
export async function extractResumeWithLLM(
  rawText: string,
  apiKey?: string
): Promise<ExtractionResult> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is required for resume extraction")
  }

  // Basic pre-validation
  if (!rawText || rawText.trim().length < 50) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Input text is too short to be a resume',
      },
    }
  }

  // Check for placeholder/template content
  const placeholderPatterns = [
    /\[your (name|email|phone)\]/i,
    /lorem ipsum/i,
    /\[company name\]/i,
    /xxx-xxx-xxxx/i,
    /example@email\.com/i,
  ]

  if (placeholderPatterns.some(p => p.test(rawText))) {
    return {
      success: false,
      error: {
        code: 'NOT_A_RESUME',
        documentType: 'template',
        message: 'This appears to be a resume template with placeholder text. Please upload a real resume.',
      }
    }
  }

  const extractionStartTime = Date.now()

  try {
    const client = new Anthropic({ apiKey: key })

    // Check for truncation before processing
    const MAX_LENGTH = 30000
    const originalLength = rawText.length
    const wasTruncated = originalLength > MAX_LENGTH
    const truncatedText = wasTruncated ? rawText.substring(0, MAX_LENGTH) : rawText

    if (wasTruncated) {
      logger.warn(
        `Resume text truncated: original length ${originalLength} characters, truncated to ${MAX_LENGTH} characters`
      )
    }

    logger.log(`Starting LLM extraction: length=${originalLength}, truncated=${wasTruncated}`)

    const toolName = "extract_resume_data"
    const truncationNotice = wasTruncated
      ? `\n\nNOTE: This document was truncated from ${originalLength} to ${MAX_LENGTH} characters due to length limits. Some content may be missing.`
      : ""

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      tools: [
        {
          name: toolName,
          description: "Extract structured data from a resume document. If the document is NOT a resume (e.g. cover letter, job description), return error in the metadata field.",
          input_schema: {
            type: "object",
            properties: {
              is_resume: {
                type: "boolean",
                description: "True if this document is a resume/CV, false if it is something else (cover letter, etc)"
              },
              document_type: {
                type: "string",
                description: "If not a resume, what type of document is it? (cover_letter, job_description, other)"
              },
              data: {
                // We'll trust the LLM to follow the structure based on extensive description
                // Use a simplified description to save tokens, the detailed work is done by the system prompt + robust parsing
                type: "object",
                description: "The structured resume data matching the schema defined in system prompt",
              }
            },
            required: ["is_resume"]
          }
        }
      ],
      tool_choice: { type: "tool", name: toolName },
      system: `You are an expert resume parser. Your task is to extract structured data from the provided text into a JSON object.
      
      CONTEXT:
      The text comes from a parsed file (PDF/DOCX) which may have scrambled layout, non-standard section names, or be in a foreign language.
      
      RULES:
      1. CRITICAL: Determine if this is actually a resume. 
         - A resume MUST have: Name, Contact Info, Work Experience (or Education for fresh grads).
         - If it's a cover letter, job description, or homework assignment, set is_resume=false.
         
      2. Structure Preservation:
         - Extract content EXACTLY as written. Do not summarize or rewrite.
         - Maintain the original language of the resume.
         - All bullet points must be preserved verbatim.
         
      3. Ambiguity Handling:
         - If a section is missing, do not invent it.
         - If dates are ambiguous, make a best guess or leave as original string.
         - Detect "Work Experience" even if labeled "Career History", "Professional Background", "Berufserfahrung", etc.
         
      4. Schema:
         Extract the data into a JSON object with these fields:
         - contact (name, email, phone, location, linkedin, website)
         - targetTitle (if mentioned as a headline)
         - summary
         - workExperience (array of objects, each containing):
           * company: Company/organization name (REQUIRED)
           * title: Job title/position held (REQUIRED - e.g., "Senior Product Designer", "Software Engineer")
           * location: Geographic location of the job (OPTIONAL - e.g., "Amsterdam", "Nigeria", "Remote")
           * startDate, endDate: Employment dates
           * bullets: Array of achievements/responsibilities (REQUIRED - must have at least one bullet)
           * employmentType: Full-time, Contract, etc.
           
           CRITICAL RULES FOR WORK EXPERIENCE:
           - Each work experience entry MUST have bullets (achievements/responsibilities). If there are no bullets, it's not a valid job entry.
           - Do NOT create separate work experience entries for locations that appear on their own line in the resume.
           - If you see a pattern like: "Company Name", "Job Title", "City Name", then City Name goes in the location field of that same entry, NOT as a separate entry.
           - Geographic locations (cities, states, countries) should ONLY go in the location field, NEVER in company or title fields.
           - Do NOT confuse location (city/country) with job title or company name.
           
           Examples of CORRECT parsing:
           - Company: "Booking.com", Title: "Senior UX Designer", Location: "Amsterdam", Bullets: [list of achievements]
           - Company: "Etisalat Telecoms", Title: "Senior UX Designer", Location: "Nigeria", Bullets: [list of achievements]
           
           Examples of INCORRECT parsing (DO NOT DO THIS):
           - Company: "Amsterdam", Title: "", Bullets: [] ❌
           - Company: "Nigeria", Title: "Senior Designer", Bullets: [] ❌
           - Company: "", Title: "Lagos", Bullets: [] ❌
           
         - education (array of objects, each containing):
           * institution: School/University name (REQUIRED - extract EXACTLY as written)
           * degree: Degree name (OPTIONAL - only if explicitly stated, e.g., "B.Sc.", "HND", "MBA")
           * field: Field of study (OPTIONAL - only if explicitly stated)
           * graduationDate: Graduation date/year (OPTIONAL - only if explicitly stated)
           * notes: GPA, honors, etc. (OPTIONAL - only if explicitly stated)
           
           CRITICAL RULES FOR EDUCATION:
           - Extract ONLY what is explicitly written in the document
           - DO NOT invent, guess, or hallucinate any details (dates, GPA, location, honors)
           - If a field is not clearly present in the document, leave it as null/empty
           - DO NOT add fictional dates like "03/2025 - 09/2025"
           - DO NOT add fictional GPAs like "GPA: 4.0" unless explicitly stated
           - DO NOT add fictional locations or notes
           - If only the institution name is present, only extract the institution name
           
         - skills (array of strings)
         - interests, certifications, awards, projects, volunteering, publications (arrays)
         
      5. Special Cases:
         - Mixed content (Resume + Cover Letter): Extract ONLY the resume part.
         - Academic CV: Extract the top 20 most relevant publications if list is huge.
         - If a work experience entry has the location on a separate line or in a different position, still parse it correctly as the location field, not as a separate job entry.
      `,
      messages: [
        { role: "user", content: `Extract data from this document:${truncationNotice}\n\n${truncatedText}` }
      ]
    })

    // Parse tool execution
    const content = response.content.find(c => c.type === 'tool_use')
    if (!content || content.type !== 'tool_use') {
      throw new Error("Model did not call the extraction tool")
    }

    const result = content.input as any

    if (!result.is_resume) {
      return {
        success: false,
        error: {
          code: 'NOT_A_RESUME',
          documentType: result.document_type || 'unknown',
          message: `This document appears to be a ${result.document_type || 'non-resume document'}. Please upload a resume.`,
        }
      }
    }

    // validate the data structure using Zod
    // The LLM output might be inside 'data' property or flat, depending on how it interpreted schema
    // We try to locate the data
    const resumeData = result.data || result;

    // Attempt to validate - allow partial failures by defaults in schema
    const validation = ParsedResumeSchema.safeParse(resumeData)

    if (!validation.success) {
      console.error("[LLM Extraction] Schema validation failed:", validation.error)
      // If validation fails, we might still want to return what we have if it's "good enough"
      // But for now, let's treat it as a failure or try to fix common issues
      return {
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: 'Failed to extract valid resume structure',
        }
      }
    }

    // Logic checks for "Incomplete" resume
    const data = validation.data
    const hasWork = data.workExperience.length > 0
    const hasEdu = data.education.length > 0
    const hasSkills = data.skills.length > 0

    if (!hasWork && !hasEdu && !hasSkills) {
      const extractionDuration = Date.now() - extractionStartTime
      logger.warn(`Extraction failed: incomplete resume (no work/education/skills)`, {
        duration: `${extractionDuration}ms`,
        hasWork,
        hasEdu,
        hasSkills,
      })
      return {
        success: false,
        error: {
          code: 'INCOMPLETE',
          message: 'Resume seems to be empty or missing key sections (Work, Education, Skills).',
        }
      }
    }

    // Post-processing: Fix common extraction mistakes
    // Remove work experience entries that look like they're just locations or have no content
    const locationKeywords = ['nigeria', 'amsterdam', 'london', 'uk', 'usa', 'remote', 'united states', 'united kingdom', 'india', 'canada', 'australia', 'berlin', 'paris', 'tokyo', 'singapore', 'dubai', 'new york', 'san francisco', 'seattle', 'lagos', 'nairobi']
    
    data.workExperience = data.workExperience.filter((exp) => {
      const titleLower = (exp.title || '').toLowerCase().trim()
      const companyLower = (exp.company || '').toLowerCase().trim()
      const hasBullets = exp.bullets && exp.bullets.length > 0
      
      // RULE 1: Remove entries with NO bullets (most important - if there are no bullets, it's not a real job entry)
      if (!hasBullets) {
        logger.warn(`Removing work experience entry with no bullets: Company="${exp.company}", Title="${exp.title}"`)
        return false
      }
      
      // RULE 2: Check if title is just a location keyword
      const isTitleJustLocation = locationKeywords.some(keyword => {
        // Check exact match or if the entire title is just the location
        return titleLower === keyword || 
               titleLower === keyword + ', ' || 
               titleLower === keyword + '.'
      })
      
      if (isTitleJustLocation) {
        logger.warn(`Removing work experience entry where title is a location: "${exp.title}"`)
        return false
      }
      
      // RULE 3: Check if company is just a location keyword
      const isCompanyJustLocation = locationKeywords.some(keyword => {
        return companyLower === keyword || 
               companyLower === keyword + ', ' || 
               companyLower === keyword + '.'
      })
      
      if (isCompanyJustLocation) {
        logger.warn(`Removing work experience entry where company is a location: "${exp.company}"`)
        return false
      }
      
      // RULE 4: If both title AND company are very short (< 4 chars) and look suspicious, remove
      if (titleLower.length < 4 && companyLower.length < 4) {
        logger.warn(`Removing work experience entry with suspiciously short title and company: "${exp.company}" / "${exp.title}"`)
        return false
      }
      
      return true
    })
    
    logger.log(`Post-processing complete: ${data.workExperience.length} work experience entries remaining`)

    const extractionDuration = Date.now() - extractionStartTime
    logger.log(`Extraction successful`, {
      duration: `${extractionDuration}ms`,
      workExperienceCount: data.workExperience.length,
      educationCount: data.education.length,
      skillsCount: data.skills.length,
      wasTruncated,
    })

    return {
      success: true,
      resume: data as ParsedResume,
      metadata: wasTruncated
        ? {
          truncated: true,
          originalLength,
          truncatedLength: MAX_LENGTH,
        }
        : undefined,
    }

  } catch (error: any) {
    const extractionDuration = Date.now() - extractionStartTime
    logger.error(`Extraction failed with exception`, {
      duration: `${extractionDuration}ms`,
      error: error.message || String(error),
      errorType: error.constructor?.name || 'Unknown',
      status: error.status,
    })
    console.error("[LLM Extraction] Error:", error)

    // Handle specific API errors
    if (error.status === 404) {
      return {
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: 'Model not found. Please check API configuration.',
        }
      }
    }

    if (error.status === 401) {
      return {
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: 'Invalid API key. Please check your Anthropic API configuration.',
        }
      }
    }

    if (error.status === 429) {
      return {
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: 'API rate limit exceeded. Please try again later.',
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: error.message || 'Unknown error during extraction',
      }
    }
  }
}
