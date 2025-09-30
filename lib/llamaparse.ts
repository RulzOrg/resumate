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
    escalateMode: process.env.LLAMAPARSE_ESCALATE_MODE || "premium",
    timeoutMs: parseInt(process.env.LLAMAPARSE_TIMEOUT_MS || "600000", 10), // 10 minutes default
    maxPages: parseInt(process.env.LLAMAPARSE_MAX_PAGES || "50", 10),
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
 * Poll for job completion with timeout and detailed logging
 */
async function pollJobStatus(
  jobId: string,
  apiKey: string,
  timeoutMs: number
): Promise<LlamaParseResponse> {
  const startTime = Date.now()
  const pollInterval = 2000 // 2 seconds
  let pollCount = 0

  console.info("[LlamaParse] Starting poll loop:", {
    jobId,
    maxTimeout: `${timeoutMs / 1000}s`,
    pollInterval: `${pollInterval / 1000}s`,
  })

  while (Date.now() - startTime < timeoutMs) {
    pollCount++
    const elapsed = Math.floor((Date.now() - startTime) / 1000)

    try {
      const response = await fetch(`${LLAMAPARSE_API_BASE}/job/${jobId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        console.error("[LlamaParse] Status check failed:", {
          pollCount,
          elapsed: `${elapsed}s`,
          status: response.status,
          statusText: response.statusText,
        })
        throw new Error(`Failed to check job status: ${response.statusText}`)
      }

      const data: LlamaParseResponse = await response.json()

      // Log every 5 polls (10 seconds) or on status change
      if (pollCount % 5 === 0 || data.status !== "processing") {
        console.info("[LlamaParse] Poll status:", {
          pollCount,
          elapsed: `${elapsed}s`,
          status: data.status,
          hasPages: !!data.pages,
          hasMarkdown: !!data.markdown,
          hasText: !!data.text,
        })
      }

      // Check status (case-insensitive - API returns uppercase)
      const statusLower = data.status.toLowerCase()
      
      if (statusLower === "success") {
        console.info("[LlamaParse] Job succeeded!", {
          pollCount,
          elapsed: `${elapsed}s`,
          pages: data.pages,
        })
        return data
      }

      if (statusLower === "error") {
        console.error("[LlamaParse] Job failed:", {
          pollCount,
          elapsed: `${elapsed}s`,
          error: data.error,
        })
        throw new Error(data.error || "LlamaParse job failed")
      }

      // Still processing, wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    } catch (fetchError: any) {
      console.error("[LlamaParse] Poll request error:", {
        pollCount,
        elapsed: `${elapsed}s`,
        error: fetchError.message,
      })
      throw fetchError
    }
  }

  const finalElapsed = Math.floor((Date.now() - startTime) / 1000)
  console.error("[LlamaParse] Polling timed out!", {
    pollCount,
    elapsed: `${finalElapsed}s`,
    maxTimeout: `${timeoutMs / 1000}s`,
  })
  throw new Error(`LlamaParse job timed out after ${timeoutMs}ms (${pollCount} polls)`)
}

/**
 * Extract text from document using LlamaParse REST API
 *
 * @param fileBuffer - Document file buffer
 * @param fileType - MIME type of the document
 * @param userId - User ID for logging
 * @param mode - Extraction mode ("fast", "premium", or "accurate")
 * @returns ExtractResult with text and metadata
 */
export async function llamaParseExtract(
  fileBuffer: Buffer,
  fileType: string,
  userId: string,
  mode?: string
): Promise<ExtractResult> {
  console.log("[LlamaParse] llamaParseExtract called:", {
    userId: userId.substring(0, 8),
    fileSize: fileBuffer.length,
    fileType,
    mode,
  })
  
  const config = getConfig()
  const extractionMode = mode || config.mode
  const usePremiumMode = extractionMode === "premium" || extractionMode === "accurate"

  // Validate API key
  if (!config.apiKey) {
    console.error("[LlamaParse] API key not configured!")
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
    
    // Set premium mode if requested (correct parameter name)
    if (usePremiumMode) {
      formData.append("premium_mode", "true")
    }
    
    // Specify output format
    formData.append("result_type", "markdown")

    // Upload and start parsing job
    console.info("[LlamaParse] Starting extraction:", {
      userId: userId.substring(0, 8),
      mode: usePremiumMode ? "premium" : "fast",
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
    console.info("[LlamaParse] Polling for job completion:", {
      userId: userId.substring(0, 8),
      jobId,
      timeoutMs: config.timeoutMs,
    })
    
    const jobStatus = await pollJobStatus(jobId, config.apiKey, config.timeoutMs)

    // CRITICAL FIX: Fetch the actual parsed result from the result endpoint
    console.info("[LlamaParse] Job completed, fetching result:", {
      userId: userId.substring(0, 8),
      jobId,
    })
    
    const resultUrl = `${LLAMAPARSE_API_BASE}/job/${jobId}/result/markdown`
    let resultResponse: Response | undefined
    let retryCount = 0
    const maxRetries = 3

    // Retry loop for result fetching (sometimes endpoint needs a moment)
    while (retryCount < maxRetries) {
      try {
        resultResponse = await fetch(resultUrl, {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        })

        if (resultResponse.ok) {
          break // Success!
        }

        console.warn("[LlamaParse] Result fetch failed, retrying:", {
          attempt: retryCount + 1,
          status: resultResponse.status,
        })
        retryCount++
        
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2s before retry
        }
      } catch (fetchError) {
        console.error("[LlamaParse] Result fetch error:", {
          attempt: retryCount + 1,
          error: fetchError instanceof Error ? fetchError.message : fetchError,
        })
        retryCount++
        
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        } else {
          throw fetchError
        }
      }
    }

    if (!resultResponse || !resultResponse.ok) {
      const errorText = resultResponse ? await resultResponse.text() : "No response"
      console.error("[LlamaParse] Failed to fetch result after retries:", {
        status: resultResponse?.status,
        error: errorText,
      })
      throw new Error(`Failed to fetch result: ${resultResponse?.statusText || "No response"}`)
    }

    // Get the actual parsed text (this is what we were missing!)
    const extractedText = await resultResponse.text()

    console.info("[LlamaParse] Result fetched successfully:", {
      userId: userId.substring(0, 8),
      chars: extractedText.length,
      preview: extractedText.substring(0, 100).replace(/\n/g, " "),
    })
    const pageCount = jobStatus.pages || 1
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
      mode: usePremiumMode ? "premium" : "fast",
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
      mode_used: usePremiumMode ? "llamaparse_premium" : "llamaparse_fast",
      truncated,
      coverage,
    }
  } catch (error: any) {
    console.error("[LlamaParse] Extraction failed:", {
      userId: userId.substring(0, 8),
      mode: usePremiumMode ? "premium" : "fast",
      error: error.message,
    })

    return {
      text: "",
      total_chars: 0,
      page_count: 0,
      warnings: [error.message],
      mode_used: usePremiumMode ? "llamaparse_premium" : "llamaparse_fast",
      truncated: false,
      coverage: 0,
      error: error.message,
    }
  }
}
