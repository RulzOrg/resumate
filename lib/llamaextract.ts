/**
 * LlamaExtract client for structured resume extraction
 * One-step extraction: PDF -> Structured JSON (no secondary LLM needed)
 */

import type { ExtractResult } from "./llamaparse"

export interface LlamaExtractResult {
  data: any // Structured data matching schema
  success: boolean
  error?: string
  warnings: string[]
  mode_used: string
  processing_time_ms?: number
}

/**
 * Resume schema for LlamaExtract
 * Matches our existing StructuredResumeSchema
 */
const RESUME_EXTRACTION_SCHEMA = {
  type: "object",
  required: ["personal_info"],
  properties: {
    personal_info: {
      type: "object",
      description: "Basic personal information",
      properties: {
        name: {
          type: "string",
          description: "Full name of the candidate",
        },
        email: {
          anyOf: [{ type: "string" }, { type: "null" }],
          description: "Email address",
        },
        phone: {
          anyOf: [{ type: "string" }, { type: "null" }],
          description: "Phone number",
        },
        location: {
          anyOf: [{ type: "string" }, { type: "null" }],
          description: "City, State or full address",
        },
        linkedin: {
          anyOf: [{ type: "string" }, { type: "null" }],
          description: "LinkedIn profile URL",
        },
        portfolio: {
          anyOf: [{ type: "string" }, { type: "null" }],
          description: "Personal website or portfolio URL",
        },
      },
    },
    professional_summary: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description:
        "Professional summary, objective, or about me section. Usually at the top of the resume.",
    },
    experience: {
      type: "array",
      description: "Work experience entries in chronological order (most recent first)",
      items: {
        type: "object",
        properties: {
          company: {
            type: "string",
            description: "Company or organization name",
          },
          title: {
            type: "string",
            description: "Job title or position",
          },
          location: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Job location (city, state)",
          },
          start_date: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Start date in YYYY-MM format if possible, or as written",
          },
          end_date: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "End date in YYYY-MM format, or 'Present' if currently employed",
          },
          description: {
            anyOf: [
              {
                type: "array",
                items: { type: "string" },
              },
              { type: "null" },
            ],
            description: "Array of bullet points describing responsibilities and achievements",
          },
        },
      },
    },
    education: {
      type: "array",
      description: "Education history",
      items: {
        type: "object",
        properties: {
          institution: {
            type: "string",
            description: "School, university, or educational institution name",
          },
          degree: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Degree or certification name (e.g., B.S., M.S., Ph.D.)",
          },
          field: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Field of study or major",
          },
          start_date: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Start date in YYYY-MM format if available",
          },
          end_date: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "End date or expected graduation date",
          },
          gpa: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "GPA if listed",
          },
        },
      },
    },
    skills: {
      anyOf: [
        {
          type: "array",
          items: { type: "string" },
        },
        { type: "null" },
      ],
      description:
        "Technical skills, programming languages, tools, frameworks, and technologies",
    },
    certifications: {
      anyOf: [
        {
          type: "array",
          items: { type: "string" },
        },
        { type: "null" },
      ],
      description: "Professional certifications and licenses",
    },
    projects: {
      anyOf: [
        {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Project name" },
              description: {
                anyOf: [{ type: "string" }, { type: "null" }],
                description: "Project description",
              },
              technologies: {
                anyOf: [
                  {
                    type: "array",
                    items: { type: "string" },
                  },
                  { type: "null" },
                ],
                description: "Technologies used",
              },
              url: {
                anyOf: [{ type: "string" }, { type: "null" }],
                description: "Project URL or repository link",
              },
            },
          },
        },
        { type: "null" },
      ],
      description: "Personal or professional projects",
    },
  },
  additionalProperties: false,
}

/**
 * Extract structured resume data using LlamaExtract
 * One-step extraction that returns structured JSON directly
 *
 * @param fileBuffer - Resume file buffer
 * @param fileType - MIME type
 * @param userId - User ID for logging
 * @param mode - Extraction mode (fast, balanced, multimodal, premium)
 * @returns LlamaExtractResult with structured data
 */
export async function llamaExtractResume(
  fileBuffer: Buffer,
  fileType: string,
  userId: string,
  mode: "fast" | "balanced" | "multimodal" | "premium" = "balanced"
): Promise<LlamaExtractResult> {
  const startTime = Date.now()
  const warnings: string[] = []

  try {
    // Check if API key is configured
    if (!process.env.LLAMACLOUD_API_KEY) {
      console.error("[LlamaExtract] API key not configured!")
      return {
        data: null,
        success: false,
        error: "LLAMACLOUD_API_KEY not configured",
        warnings: ["LlamaExtract requires LLAMACLOUD_API_KEY"],
        mode_used: "none",
      }
    }

    console.info("[LlamaExtract] Starting structured extraction:", {
      userId: userId.substring(0, 8),
      mode,
      fileSize: fileBuffer.length,
      apiKeySet: !!process.env.LLAMACLOUD_API_KEY,
      apiKeyPrefix: process.env.LLAMACLOUD_API_KEY?.substring(0, 8),
    })

    // Dynamic import - use function-based API
    const { createAgent, extract } = await import("llama-cloud-services/extract")

    // Prepare extraction configuration
    const config = {
      extraction_mode: mode.toUpperCase(),
      use_reasoning: mode !== "fast",
      cite_sources: false,
    } as any

    console.info("[LlamaExtract] Creating extraction agent:", {
      mode: mode.toUpperCase(),
      useReasoning: mode !== "fast",
    })

    // Create extraction agent with our resume schema
    const agent = await createAgent(
      `resume-extract-${Date.now()}`,
      RESUME_EXTRACTION_SCHEMA as any,
      config
    )

    if (!agent || !agent.id) {
      throw new Error("Failed to create extraction agent")
    }

    console.info("[LlamaExtract] Agent created successfully:", {
      agentId: agent.id,
    })

    // Extract using the agent
    let result
    try {
      result = await extract(
        agent.id,
        undefined, // filePath
        fileBuffer, // fileContent
        "resume.pdf" // fileName
      )
      
      console.info("[LlamaExtract] extract() returned:", {
        hasResult: !!result,
        hasData: !!result?.data,
        dataType: result?.data ? typeof result.data : "none",
      })
    } catch (extractError: any) {
      console.error("[LlamaExtract] extract() threw error:", {
        error: extractError.message,
        stack: extractError.stack?.substring(0, 500),
        name: extractError.name,
      })
      throw extractError
    }

    const processingTime = Date.now() - startTime

    // Check if extraction returned a result
    if (!result) {
      warnings.push("Extraction returned undefined")
      return {
        data: null,
        success: false,
        error: "No result returned from extraction",
        warnings,
        mode_used: `llamaextract_${mode}`,
        processing_time_ms: processingTime,
      }
    }

    console.info("[LlamaExtract] Extraction completed:", {
      userId: userId.substring(0, 8),
      mode,
      processingTime: `${processingTime}ms`,
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : [],
    })

    // Check if we got valid data
    if (!result.data || typeof result.data !== "object") {
      warnings.push("Extraction returned no data")
      return {
        data: null,
        success: false,
        error: "No data extracted",
        warnings,
        mode_used: `llamaextract_${mode}`,
        processing_time_ms: processingTime,
      }
    }

    return {
      data: result.data,
      success: true,
      warnings,
      mode_used: `llamaextract_${mode}`,
      processing_time_ms: processingTime,
    }
  } catch (error: any) {
    const processingTime = Date.now() - startTime

    console.error("[LlamaExtract] Extraction failed:", {
      userId: userId.substring(0, 8),
      mode,
      processingTime: `${processingTime}ms`,
      error: error.message,
      stack: error.stack,
    })

    return {
      data: null,
      success: false,
      error: error.message || "Unknown extraction error",
      warnings: [...warnings, "LlamaExtract failed"],
      mode_used: `llamaextract_${mode}`,
      processing_time_ms: processingTime,
    }
  }
}

/**
 * Convert LlamaExtract result to ExtractResult format
 * For compatibility with existing code
 */
export function llamaExtractToExtractResult(
  llamaResult: LlamaExtractResult
): ExtractResult {
  if (!llamaResult.success || !llamaResult.data) {
    return {
      text: "",
      total_chars: 0,
      page_count: 0,
      warnings: llamaResult.warnings,
      mode_used: llamaResult.mode_used,
      truncated: false,
      coverage: 0,
      error: llamaResult.error,
    }
  }

  // Convert structured data to text representation
  // This is for the content_text field in the database
  const textRepresentation = JSON.stringify(llamaResult.data, null, 2)

  return {
    text: textRepresentation,
    total_chars: textRepresentation.length,
    page_count: 1, // LlamaExtract processes whole document
    warnings: llamaResult.warnings,
    mode_used: llamaResult.mode_used,
    truncated: false,
    coverage: 1, // Full document processed
  }
}
