export interface JobExtractionResult {
  title: string | null
  company: string | null
  description: string
  location?: string | null
  compensation?: string | null
  metadata?: Record<string, unknown>
  extractedBy: {
    adapter: string
    confidence: number
    notes?: string[]
  }
}

export interface ExtractionContext {
  url: URL
  html: string
  /** Lazily initialised DOM representation */
  getDom(): Promise<import("jsdom").JSDOM>
}

export interface JobExtractionAdapter {
  name: string
  priority?: number
  supports(context: ExtractionContext): Promise<boolean> | boolean
  extract(context: ExtractionContext): Promise<JobExtractionResult | null>
}

export interface ExtractionOptions {
  userAgent?: string
  timeoutMs?: number
}
