/**
 * Unified extraction layer for resume documents
 * Orchestrates LlamaParse primary extraction with OSS fallback
 */

import { llamaParseExtract, type ExtractResult } from "./llamaparse"

const COVERAGE_THRESHOLD = 0.6

/**
 * Primary extraction using LlamaParse with automatic escalation
 *
 * @param fileBuffer - Document file buffer
 * @param fileType - MIME type of the document
 * @param userId - User ID for logging
 * @returns ExtractResult with best available extraction
 */
export async function primaryExtract(
  fileBuffer: Buffer,
  fileType: string,
  userId: string
): Promise<ExtractResult> {
  const config = {
    mode: process.env.LLAMAPARSE_MODE || "fast",
    escalateMode: process.env.LLAMAPARSE_ESCALATE_MODE || "accurate",
  }

  // First attempt with primary mode
  console.info("[Extract] Starting primary extraction:", {
    userId: userId.substring(0, 8),
    mode: config.mode,
  })

  const firstResult = await llamaParseExtract(fileBuffer, fileType, userId, config.mode)

  // If successful with good coverage, return immediately
  if (!firstResult.error && firstResult.coverage >= COVERAGE_THRESHOLD) {
    console.info("[Extract] Primary extraction succeeded:", {
      userId: userId.substring(0, 8),
      coverage: firstResult.coverage.toFixed(2),
    })
    return firstResult
  }

  // Escalate to higher quality mode if coverage is low
  console.warn("[Extract] Low coverage, escalating to higher quality mode:", {
    userId: userId.substring(0, 8),
    firstCoverage: firstResult.coverage.toFixed(2),
    escalateMode: config.escalateMode,
  })

  const escalatedResult = await llamaParseExtract(
    fileBuffer,
    fileType,
    userId,
    config.escalateMode
  )

  // Return the better result (higher total_chars)
  if (escalatedResult.total_chars > firstResult.total_chars) {
    console.info("[Extract] Escalation improved extraction:", {
      userId: userId.substring(0, 8),
      improvement: escalatedResult.total_chars - firstResult.total_chars,
      finalCoverage: escalatedResult.coverage.toFixed(2),
    })
    return escalatedResult
  }

  console.info("[Extract] First attempt was better, using it:", {
    userId: userId.substring(0, 8),
    coverage: firstResult.coverage.toFixed(2),
  })
  return firstResult
}

/**
 * Fallback extraction using existing OSS extractor
 *
 * @param fileBuffer - Document file buffer  
 * @param fileType - MIME type of the document
 * @param fileUrl - Optional pre-signed URL for the file
 * @returns ExtractResult from OSS extractor
 */
export async function fallbackExtract(
  fileBuffer: Buffer,
  fileType: string,
  fileUrl?: string
): Promise<ExtractResult> {
  const extractorUrl = process.env.EXTRACTOR_URL

  if (!extractorUrl) {
    console.warn("[Extract] EXTRACTOR_URL not configured, cannot use fallback")
    return {
      text: "",
      total_chars: 0,
      page_count: 0,
      warnings: ["Fallback extractor not configured"],
      mode_used: "oss_fallback",
      truncated: false,
      coverage: 0,
      error: "Fallback extractor not configured",
    }
  }

  try {
    console.info("[Extract] Starting OSS fallback extraction:", {
      extractorUrl,
      fileSize: fileBuffer.length,
    })

    // If we have a URL, use it; otherwise we'd need to upload the buffer
    // The existing extractor expects a URL parameter
    if (!fileUrl) {
      console.warn("[Extract] No file URL provided for fallback extractor")
      return {
        text: "",
        total_chars: 0,
        page_count: 0,
        warnings: ["No file URL available for fallback"],
        mode_used: "oss_fallback",
        truncated: false,
        coverage: 0,
        error: "No file URL available",
      }
    }

    const response = await fetch(`${extractorUrl}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ url: fileUrl }),
    })

    if (!response.ok) {
      throw new Error(`Extractor returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const extractedText = String(data.html ?? data.text ?? "").trim()
    const totalChars = extractedText.length

    // Estimate page count (rough estimate: 3000 chars per page)
    const estimatedPages = Math.max(1, Math.ceil(totalChars / 3000))

    const warnings: string[] = []
    if (totalChars < 100) {
      warnings.push("Very short extraction from fallback")
    }

    console.info("[Extract] OSS fallback completed:", {
      chars: totalChars,
      estimatedPages,
    })

    return {
      text: extractedText,
      total_chars: totalChars,
      page_count: estimatedPages,
      warnings,
      mode_used: "oss_fallback",
      truncated: false,
      coverage: totalChars > 0 ? 1 : 0, // Assume full coverage if we got content
    }
  } catch (error: any) {
    console.error("[Extract] OSS fallback failed:", {
      error: error.message,
    })

    return {
      text: "",
      total_chars: 0,
      page_count: 0,
      warnings: [error.message],
      mode_used: "oss_fallback",
      truncated: false,
      coverage: 0,
      error: error.message,
    }
  }
}
