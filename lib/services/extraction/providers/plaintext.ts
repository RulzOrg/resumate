import type { ExtractionProvider, ExtractProviderInput, ExtractProviderResult } from "./base"
import { normalizeExtractionType } from "./base"

export class PlainTextProvider implements ExtractionProvider {
  readonly name = "plaintext"

  supports(fileType: string): boolean {
    return normalizeExtractionType(fileType) === "text/plain"
  }

  async extract(input: ExtractProviderInput): Promise<ExtractProviderResult> {
    const text = input.fileBuffer.toString("utf-8").trim()
    return {
      text,
      pageCount: 1,
      warnings: [],
      mode: "plaintext",
      confidence: text.length >= 50 ? 0.9 : 0.5,
    }
  }
}
