import type { ExtractionProvider, ExtractProviderInput, ExtractProviderResult } from "./base"
import { normalizeExtractionType } from "./base"
import { PDFParse } from "pdf-parse"

export class PdfFallbackProvider implements ExtractionProvider {
  readonly name = "pdf-fallback"

  supports(fileType: string): boolean {
    return normalizeExtractionType(fileType) === "application/pdf"
  }

  async extract(input: ExtractProviderInput): Promise<ExtractProviderResult> {
    const warnings: string[] = ["Primary PDF parser failed; using fallback extraction"]

    try {
      const parser = new PDFParse({ data: input.fileBuffer })
      const parsed = await parser.getText()
      await parser.destroy()
      const parsedText = (parsed.text || "").trim()
      if (parsedText.length >= 50) {
        return {
          text: normalizeWhitespace(parsedText),
          pageCount: parsed.pages?.length || 1,
          warnings,
          mode: "pdf-fallback-pdf-parse",
          confidence: 0.7,
        }
      }
      warnings.push("pdf-parse returned very little text; applying low-level fallback")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      warnings.push(`pdf-parse fallback failed: ${message}`)
    }

    const text = extractTextFromPdfBinary(input.fileBuffer)
    return {
      text,
      pageCount: 1,
      warnings,
      mode: "pdf-fallback-regex",
      confidence: text.length >= 50 ? 0.4 : 0.2,
    }
  }
}

function extractTextFromPdfBinary(buffer: Buffer): string {
  const content = buffer.toString("latin1")
  const textParts: string[] = []

  const btPattern = /BT[\s\S]*?ET/g
  const matches = content.match(btPattern) || []

  for (const match of matches) {
    const tjMatches = match.match(/\(([^)]*)\)\s*Tj/g) || []
    for (const tj of tjMatches) {
      const textMatch = tj.match(/\(([^)]*)\)/)
      if (textMatch?.[1]) {
        textParts.push(decodePdfEscapes(textMatch[1]))
      }
    }

    const tjArrayMatches = match.match(/\[([^\]]*)\]\s*TJ/g) || []
    for (const tjArray of tjArrayMatches) {
      const innerMatch = tjArray.match(/\[([^\]]*)\]/)
      if (!innerMatch?.[1]) {
        continue
      }
      const parts = innerMatch[1].match(/\(([^)]*)\)/g) || []
      for (const part of parts) {
        const textMatch = part.match(/\(([^)]*)\)/)
        if (textMatch?.[1]) {
          textParts.push(decodePdfEscapes(textMatch[1]))
        }
      }
    }
  }

  if (!textParts.length) {
    const readableText = content.match(/[\x20-\x7E]{20,}/g) || []
    return normalizeWhitespace(
      readableText.filter((t) => !t.includes("obj") && !t.includes("stream") && !t.includes("/")).join("\n")
    )
  }

  return normalizeWhitespace(textParts.join(" "))
}

function decodePdfEscapes(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}
