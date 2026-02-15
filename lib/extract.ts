/**
 * Text extraction for resumes
 * Adapter for extraction service v2.
 */
import { extractTextWithService } from "@/lib/services/extraction-service"

export interface ExtractResult {
  text: string
  total_chars: number
  page_count: number
  warnings: string[]
  mode_used: string
  truncated: boolean
  coverage: number
  provider?: string
  retries?: number
  confidence?: number
  error?: string
}

/**
 * Extract text from file buffer using LlamaParse (primary) or fallbacks
 */
export async function extractText(
  fileBuffer: Buffer,
  fileType: string
): Promise<ExtractResult> {
  try {
    const serviceResult = await extractTextWithService(fileBuffer, fileType)
    const totalChars = serviceResult.totalChars

    return {
      text: serviceResult.text,
      total_chars: totalChars,
      page_count: serviceResult.pageCount,
      warnings: serviceResult.warnings,
      mode_used: serviceResult.modeUsed,
      truncated: false,
      coverage: serviceResult.coverage,
      provider: serviceResult.provider,
      retries: serviceResult.retries,
      confidence: serviceResult.confidence,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[Extract] Extraction failed:", message)
    return {
      text: "",
      total_chars: 0,
      page_count: 0,
      warnings: [message],
      mode_used: "error",
      truncated: false,
      coverage: 0,
      error: message,
    }
  }
}
