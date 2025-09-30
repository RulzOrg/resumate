/**
 * Client-side upload handler for hardened upload pipeline
 * Handles success, fallback, and error cases from /api/ingest
 */

import type { IngestResponse } from "./schemas"

export interface UploadResult {
  success: boolean
  resumeId?: string
  status: "success" | "fallback" | "error"
  needsReview?: boolean
  rawParagraphs?: string[]
  parsed?: any
  evidenceCount?: number
  error?: string
  fileHash?: string
  // HTTP metadata for error cases
  httpStatus?: number
  responseBody?: any
}

/**
 * Upload a resume file to the hardened ingest endpoint
 *
 * @param file - File to upload
 * @param onProgress - Progress callback (0-100)
 * @returns Upload result with status
 */
export async function uploadResume(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Create form data
    const formData = new FormData()
    formData.append("file", file)

    // Simulate progress during upload
    if (onProgress) {
      onProgress(10)
    }

    // Upload to ingest endpoint
    const response = await fetch("/api/ingest", {
      method: "POST",
      body: formData,
    })

    if (onProgress) {
      onProgress(50)
    }

    // Ensure we only parse JSON on success; otherwise surface structured error
    if (!response.ok) {
      let errorBody: any
      try {
        errorBody = await response.clone().json()
      } catch {
        try {
          errorBody = await response.text()
        } catch {
          errorBody = null
        }
      }

      const message =
        (errorBody && (errorBody.error || errorBody.message)) ||
        (typeof errorBody === "string" && errorBody) ||
        "Upload failed"

      return {
        success: false,
        status: "error",
        error: `[${response.status}] ${message}`,
        httpStatus: response.status,
        responseBody: errorBody,
      }
    }

    const data: IngestResponse = await response.json()

    if (onProgress) {
      onProgress(100)
    }

    // Handle response based on status
    switch (data.status) {
      case "success":
        // Success - evidence extracted and indexed
        return {
          success: true,
          resumeId: data.resumeId,
          status: "success",
          parsed: data.parsed,
          evidenceCount: data.evidenceCount,
          fileHash: data.fileHash,
        }

      case "fallback":
        // Fallback - needs manual review and raw indexing
        // Automatically trigger raw indexing
        await indexRawParagraphs(data.resumeId, data.rawParagraphs)

        return {
          success: true,
          resumeId: data.resumeId,
          status: "fallback",
          needsReview: true,
          rawParagraphs: data.rawParagraphs,
          fileHash: data.fileHash,
        }

      case "error":
        // Error case
        return {
          success: false,
          status: "error",
          error: data.error,
        }

      default:
        return {
          success: false,
          status: "error",
          error: "Unknown response status",
        }
    }
  } catch (error: any) {
    console.error("[UploadHandler] Upload failed:", error)
    return {
      success: false,
      status: "error",
      error: error.message || "Upload failed",
    }
  }
}

/**
 * Index raw paragraphs for fallback case
 *
 * @param resumeId - Resume ID
 * @param paragraphs - Raw paragraphs to index
 */
async function indexRawParagraphs(resumeId: string, paragraphs: string[]): Promise<void> {
  try {
    const response = await fetch("/api/index-raw", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resumeId,
        paragraphs,
      }),
    })

    if (!response.ok) {
      console.error("[UploadHandler] Failed to index raw paragraphs:", await response.text())
    }
  } catch (error: any) {
    console.error("[UploadHandler] Error indexing raw paragraphs:", error)
  }
}

/**
 * Convert a paragraph to bullet points
 *
 * @param paragraph - Paragraph text
 * @returns Bullet points and suggestions
 */
export async function convertToBullets(paragraph: string): Promise<{
  bullets: string[]
  improved: boolean
  suggestions: string[]
  error?: string
}> {
  try {
    const response = await fetch("/api/paragraph-to-bullet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paragraph }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        bullets: [],
        improved: false,
        suggestions: [],
        error: errorData.error || "Conversion failed",
      }
    }

    const data = await response.json()
    return {
      bullets: data.bullets,
      improved: data.improved,
      suggestions: data.suggestions || [],
    }
  } catch (error: any) {
    console.error("[UploadHandler] Bullet conversion failed:", error)
    return {
      bullets: [],
      improved: false,
      suggestions: [],
      error: error.message || "Conversion failed",
    }
  }
}