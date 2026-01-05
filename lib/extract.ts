/**
 * Text extraction for resumes
 * Uses LlamaParse for high-quality extraction, with fallbacks
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

const LLAMAPARSE_API_URL = "https://api.cloud.llamaindex.ai/api/parsing"

/**
 * Extract text from file buffer using LlamaParse (primary) or fallbacks
 */
export async function extractText(
  fileBuffer: Buffer,
  fileType: string
): Promise<ExtractResult> {
  try {
    let text = ""
    let warnings: string[] = []
    let pageCount = 1
    let modeUsed = "llamaparse"

    const llamaApiKey = process.env.LLAMACLOUD_API_KEY

    if (fileType === "application/pdf" || fileType.includes("pdf")) {
      // Try LlamaParse first (best quality)
      if (llamaApiKey) {
        try {
          console.log("[Extract] Using LlamaParse for PDF extraction...")
          const result = await extractWithLlamaParse(fileBuffer, llamaApiKey)
          text = result.text
          pageCount = result.pageCount
          modeUsed = "llamaparse"
          console.log(`[Extract] LlamaParse success: ${text.length} chars, ${pageCount} pages`)
        } catch (llamaError: any) {
          console.error("[Extract] LlamaParse failed:", llamaError.message)
          warnings.push(`LlamaParse failed: ${llamaError.message}`)
          // Fall back to regex extraction
          text = extractTextFromPDFBufferFallback(fileBuffer)
          modeUsed = "fallback-regex"
        }
      } else {
        console.log("[Extract] LLAMACLOUD_API_KEY not set, using fallback...")
        text = extractTextFromPDFBufferFallback(fileBuffer)
        modeUsed = "fallback-regex"
        warnings.push("LlamaParse not configured - using basic extraction")
      }

      // Check if we got enough text
      if (text.length < 100) {
        warnings.push("PDF text extraction may be incomplete. Consider uploading a DOCX file for better results.")
      }
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType.includes("docx")
    ) {
      text = await extractTextFromDOCX(fileBuffer)
      modeUsed = "docx"
    } else if (fileType === "text/plain" || fileType.includes("text")) {
      text = fileBuffer.toString("utf-8")
      modeUsed = "plaintext"
    } else {
      warnings.push(`Unsupported file type: ${fileType}`)
    }

    const totalChars = text.trim().length
    console.log(`[Extract] Final result: ${totalChars} chars using ${modeUsed}`)

    return {
      text: text.trim(),
      total_chars: totalChars,
      page_count: pageCount,
      warnings,
      mode_used: modeUsed,
      truncated: false,
      coverage: totalChars > 0 ? 1 : 0,
    }
  } catch (error: any) {
    console.error("[Extract] Extraction failed:", error.message)
    return {
      text: "",
      total_chars: 0,
      page_count: 0,
      warnings: [error.message],
      mode_used: "error",
      truncated: false,
      coverage: 0,
      error: error.message,
    }
  }
}

/**
 * Extract text using LlamaCloud API (LlamaParse)
 */
async function extractWithLlamaParse(
  buffer: Buffer,
  apiKey: string
): Promise<{ text: string; pageCount: number }> {
  // Step 1: Upload the file
  const formData = new FormData()
  const blob = new Blob([buffer], { type: "application/pdf" })
  formData.append("file", blob, "resume.pdf")

  const uploadResponse = await fetch(`${LLAMAPARSE_API_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new Error(`LlamaParse upload failed: ${uploadResponse.status} - ${errorText}`)
  }

  const uploadResult = await uploadResponse.json()
  const jobId = uploadResult.id

  if (!jobId) {
    throw new Error("LlamaParse did not return a job ID")
  }

  console.log(`[Extract] LlamaParse job created: ${jobId}`)

  // Step 2: Poll for completion (max 60 seconds)
  const maxWaitTime = 60000
  const pollInterval = 2000
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitTime) {
    const statusResponse = await fetch(`${LLAMAPARSE_API_URL}/job/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!statusResponse.ok) {
      throw new Error(`LlamaParse status check failed: ${statusResponse.status}`)
    }

    const statusResult = await statusResponse.json()
    console.log(`[Extract] LlamaParse job status: ${statusResult.status}`)

    if (statusResult.status === "SUCCESS") {
      // Step 3: Get the result
      const resultResponse = await fetch(`${LLAMAPARSE_API_URL}/job/${jobId}/result/text`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!resultResponse.ok) {
        throw new Error(`LlamaParse result fetch failed: ${resultResponse.status}`)
      }

      const text = await resultResponse.text()
      return {
        text,
        pageCount: statusResult.pages || 1,
      }
    }

    if (statusResult.status === "ERROR" || statusResult.status === "FAILED") {
      throw new Error(`LlamaParse job failed: ${statusResult.error || "Unknown error"}`)
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  throw new Error("LlamaParse job timed out")
}

/**
 * Fallback PDF text extraction using regex
 */
function extractTextFromPDFBufferFallback(buffer: Buffer): string {
  const content = buffer.toString("latin1")
  const textParts: string[] = []

  // Look for text between BT (begin text) and ET (end text) markers
  const btPattern = /BT[\s\S]*?ET/g
  const matches = content.match(btPattern) || []

  for (const match of matches) {
    // Extract text from Tj and TJ operators
    const tjMatches = match.match(/\(([^)]*)\)\s*Tj/g) || []
    for (const tj of tjMatches) {
      const textMatch = tj.match(/\(([^)]*)\)/)
      if (textMatch && textMatch[1]) {
        textParts.push(decodeString(textMatch[1]))
      }
    }

    // Also try to get text from TJ arrays
    const tjArrayMatches = match.match(/\[([^\]]*)\]\s*TJ/g) || []
    for (const tjArray of tjArrayMatches) {
      const innerMatch = tjArray.match(/\[([^\]]*)\]/)
      if (innerMatch) {
        const parts = innerMatch[1].match(/\(([^)]*)\)/g) || []
        for (const part of parts) {
          const textMatch = part.match(/\(([^)]*)\)/)
          if (textMatch && textMatch[1]) {
            textParts.push(decodeString(textMatch[1]))
          }
        }
      }
    }
  }

  // Also try to find readable ASCII text blocks
  const readableText = content.match(/[\x20-\x7E]{20,}/g) || []

  let result = textParts.join(" ")

  // If we didn't get much from structured extraction, use readable text
  if (result.length < 100 && readableText.length > 0) {
    result = readableText
      .filter((t) => !t.includes("obj") && !t.includes("stream") && !t.includes("/"))
      .join("\n")
  }

  return result.replace(/\s+/g, " ").trim()
}

/**
 * Decode PDF string escapes
 */
function decodeString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
}

/**
 * Extract text from DOCX buffer
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const JSZip = (await import("jszip")).default
    const zip = await JSZip.loadAsync(buffer)

    const documentXml = await zip.file("word/document.xml")?.async("string")
    if (!documentXml) {
      return ""
    }

    const text = documentXml
      .replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, "$1")
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<w:p[^>]*>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n\s*\n/g, "\n\n")
      .trim()

    return text
  } catch (error: any) {
    console.error("[Extract] DOCX extraction failed:", error.message)
    return ""
  }
}
