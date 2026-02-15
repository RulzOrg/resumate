export type ExtractProviderInput = {
  fileBuffer: Buffer
  fileType: string
  fileName?: string
}

export type ExtractProviderResult = {
  text: string
  pageCount: number
  warnings: string[]
  mode: string
  confidence: number
}

export interface ExtractionProvider {
  readonly name: string
  supports(fileType: string): boolean
  extract(input: ExtractProviderInput): Promise<ExtractProviderResult>
}

export function normalizeExtractionType(fileType: string): string {
  const value = fileType.toLowerCase().trim()

  if (value.includes("pdf") || value === "pdf") {
    return "application/pdf"
  }
  if (value.includes("wordprocessingml") || value.includes("docx") || value === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
  if (value.includes("msword") || value === "doc") {
    return "application/msword"
  }
  if (value.includes("text") || value === "txt" || value === "plain") {
    return "text/plain"
  }

  return value
}
