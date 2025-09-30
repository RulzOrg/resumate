/**
 * LlamaParse REST API client for document extraction
 * Provides high-quality PDF and document text extraction with OCR support
 */

export interface ExtractResult {
  text: string
  total_chars: number
  page_count: number
  warnings: string[]
  mode_used: string
  truncated: boolean
  coverage: number
  error?: string
}

interface LlamaParseResponse {
  id: string
  status: "pending" | "processing" | "success" | "error"
  markdown?: string
  text?: string
  pages?: number
  error?: string
}

const LLAMAPARSE_API_BASE = "https://api.cloud.llamaindex.ai/api/parsing"

/**
 * Get configuration from environment variables with defaults
 */
function getConfig() {
  return {
    apiKey: process.env.LLAMACLOUD_API_KEY || "",
    mode: process.env.LLAMAPARSE_MODE || "fast",
    escalateMode: process.env.LLAMAPARSE_ESCALATE_MODE || "accurate",
    timeoutMs: parseInt(process.env.LLAMAPARSE_TIMEOUT_MS || "45000", 10),
    maxPages: parseInt(process.env.LLAMAPARSE_MAX_PAGES || "20", 10),
    minChars: parseInt(process.env.LLAMAPARSE_MIN_CHARS || "100", 10),
    minCharsPerPage: parseInt(process.env.LLAMAPARSE_MIN_CHARS_PER_PAGE || "200", 10),
  }
}

/**
 * Calculate coverage score based on extracted chars and page count
 */
function calculateCoverage(totalChars: number, pageCount: number, minCharsPerPage: number): number {
  if (pageCount === 0) return 0
  const expectedChars = pageCount * minCharsPerPage
  return Math.min(1, totalChars / expectedChars)
}

/**
 * Poll for job completion with timeout
 */
async function pollJobStatus(
  jobId: string,
  apiKey: string,
  timeoutMs: number
): Promise<LlamaParseResponse> {
  const startTime = Date.now()
  const pollInterval = 2000 // 2 seconds

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${LLAMAPARSE_API_BASE}/job/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.statusText}`)
    }

    const data: LlamaParseResponse = await response.json()

    if (data.status === "success") {
      return data
    }

    if (data.status === "error") {
      throw new Error(data.error || "LlamaParse job failed")
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  throw new Error(`LlamaParse job timed out after ${timeoutMs}ms`)
}

/**
 * Extract text from document using LlamaParse REST API
 *
 * @param fileBuffer - Document file buffer
 * @param fileType - MIME type of the document
 * @param userId - User ID for logging
 * @param mode - Extraction mode ("fast" or "accurate")
 * @returns ExtractResult with text and metadata
 */
export async function llamaParseExtract(
  fileBuffer: Buffer,
  fileType: string,
  userId: string,
  mode?: string
): Promise<ExtractResult> {
  const config = getConfig()
  const extractionMode = mode || config.mode

  // Validate API key
  if (!config.apiKey) {
    return {
      text: "",
      total_chars: 0,
      page_count: 0,
      warnings: ["LLAMACLOUD_API_KEY not configured"],
      mode_used: "none",
      truncated: false,
      coverage: 0,
      error: "API key not configured",
    }
  }

  const warnings: string[] = []
  let truncated = false

  try {
    // Prepare form data for upload
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: fileType })
    formData.append("file", blob, "document.pdf")
    formData.append("parsing_instruction", extractionMode)

    // Upload and start parsing job
    console.info("[LlamaParse] Starting extraction:", {
      userId: userId.substring(0, 8),
      mode: extractionMode,
      fileSize: fileBuffer.length,
    })

    const uploadResponse = await fetch(`${LLAMAPARSE_API_BASE}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error("[LlamaParse] Upload failed:", {
        status: uploadResponse.status,
        error: errorText,
      })
      throw new Error(`Upload failed: ${uploadResponse.statusText}`)
    }

    const uploadData = await uploadResponse.json()
    const jobId = uploadData.id

    if (!jobId) {
      throw new Error("No job ID returned from upload")
    }

    // Poll for completion
    const result = await pollJobStatus(jobId, config.apiKey, config.timeoutMs)

    // Extract text from result
    const extractedText = result.text || result.markdown || ""
    const pageCount = result.pages || 1
    const totalChars = extractedText.length

    // Check for truncation
    if (pageCount > config.maxPages) {
      truncated = true
      warnings.push(`Document has ${pageCount} pages, limited to ${config.maxPages}`)
    }

    // Validate minimum content
    if (totalChars < config.minChars) {
      warnings.push(`Extracted only ${totalChars} chars, below minimum ${config.minChars}`)
    }

    // Calculate coverage
    const coverage = calculateCoverage(totalChars, pageCount, config.minCharsPerPage)

    if (coverage < 0.6) {
      warnings.push(`Low coverage: ${(coverage * 100).toFixed(0)}%`)
    }

    console.info("[LlamaParse] Extraction completed:", {
      userId: userId.substring(0, 8),
      mode: extractionMode,
      chars: totalChars,
      pages: pageCount,
      coverage: coverage.toFixed(2),
      warnings: warnings.length,
    })

    return {
      text: extractedText,
      total_chars: totalChars,
      page_count: pageCount,
      warnings,
      mode_used: extractionMode,
      truncated,
      coverage,
    }
  } catch (error: any) {
    console.error("[LlamaParse] Extraction failed:", {
      userId: userId.substring(0, 8),
      mode: extractionMode,
      error: error.message,
    })

    return {
      text: "",
      total_chars: 0,
      page_count: 0,
      warnings: [error.message],
      mode_used: extractionMode,
      truncated: false,
      coverage: 0,
      error: error.message,
    }
  }
}
