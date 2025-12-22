/**
 * Simplified text extraction for MVP
 * Extracts text from PDF and DOCX files synchronously
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

/**
 * Simple text extraction from file buffer
 * Uses basic parsing for PDF and DOCX files
 */
export async function extractText(
  fileBuffer: Buffer,
  fileType: string
): Promise<ExtractResult> {
  try {
    let text = ""
    let warnings: string[] = []
    let pageCount = 1

    if (fileType === "application/pdf" || fileType.includes("pdf")) {
      // For PDF, we'll extract using a simple approach
      // In MVP, we rely on the AI to work with whatever text we can get
      text = extractTextFromPDFBuffer(fileBuffer)
      pageCount = Math.max(1, Math.ceil(text.length / 3000))
      if (text.length < 100) {
        warnings.push("PDF text extraction may be incomplete. Consider uploading a DOCX file for better results.")
      }
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType.includes("docx")
    ) {
      // For DOCX, extract text from the document
      text = await extractTextFromDOCX(fileBuffer)
    } else if (fileType === "text/plain" || fileType.includes("text")) {
      // Plain text - just decode
      text = fileBuffer.toString("utf-8")
    } else {
      warnings.push(`Unsupported file type: ${fileType}`)
    }

    const totalChars = text.trim().length

    return {
      text: text.trim(),
      total_chars: totalChars,
      page_count: pageCount,
      warnings,
      mode_used: "simple",
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
      mode_used: "simple",
      truncated: false,
      coverage: 0,
      error: error.message,
    }
  }
}

/**
 * Basic PDF text extraction
 * Looks for text streams in the PDF buffer
 */
function extractTextFromPDFBuffer(buffer: Buffer): string {
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
      .filter(t => !t.includes("obj") && !t.includes("stream") && !t.includes("/"))
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
 * DOCX is a ZIP file with XML content
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    // DOCX files are ZIP archives containing XML
    // The main content is in word/document.xml
    const JSZip = (await import("jszip")).default
    const zip = await JSZip.loadAsync(buffer)
    
    const documentXml = await zip.file("word/document.xml")?.async("string")
    if (!documentXml) {
      return ""
    }

    // Extract text from XML tags
    // Remove XML tags and get text content
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
