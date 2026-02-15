import { createHash } from "crypto"
import {
  type ExtractProviderResult,
  type ExtractionProvider,
  normalizeExtractionType,
} from "@/lib/services/extraction/providers/base"
import { PdfLlamaParseProvider } from "@/lib/services/extraction/providers/pdf-llamaparse"
import { PdfFallbackProvider } from "@/lib/services/extraction/providers/pdf-fallback"
import { DocxProvider } from "@/lib/services/extraction/providers/docx"
import { PlainTextProvider } from "@/lib/services/extraction/providers/plaintext"
import { incrementMetric } from "@/lib/services/extraction/metrics"

export type ExtractionQuality = {
  printableRatio: number
  sectionSignals: number
  minLengthSatisfied: boolean
}

export type ExtractionServiceResult = {
  text: string
  totalChars: number
  pageCount: number
  warnings: string[]
  modeUsed: string
  coverage: number
  confidence: number
  fileType: string
  provider: string
  retries: number
  quality: ExtractionQuality
}

type RetryConfig = {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
}

const RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 4000,
}

const providers: ExtractionProvider[] = [
  new PdfLlamaParseProvider(),
  new DocxProvider(),
  new PlainTextProvider(),
]

const pdfFallbackProvider = new PdfFallbackProvider()

export async function extractTextWithService(
  fileBuffer: Buffer,
  fileType: string,
  fileName?: string
): Promise<ExtractionServiceResult> {
  const normalizedType = normalizeExtractionType(fileType)
  const requestId = createHash("sha1")
    .update(fileBuffer.subarray(0, Math.min(512, fileBuffer.length)))
    .digest("hex")
    .slice(0, 12)

  const matchingProvider = providers.find((provider) => provider.supports(normalizedType))
  if (!matchingProvider) {
    return buildEmptyResult({
      normalizedType,
      warnings: [`Unsupported file type for extraction: ${fileType}`],
      mode: "unsupported",
      provider: "none",
    })
  }

  const start = Date.now()
  let retries = 0
  let primaryResult: ExtractProviderResult | null = null
  let primaryError: string | null = null

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      primaryResult = await matchingProvider.extract({
        fileBuffer,
        fileType: normalizedType,
        fileName,
      })
      break
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      primaryError = message
      retries = attempt - 1
      incrementMetric("extraction_provider_failures")
      if (attempt === RETRY_CONFIG.maxAttempts) {
        break
      }
      await sleep(backoff(attempt))
    }
  }

  let selectedResult = primaryResult
  let selectedProvider = matchingProvider.name
  const warnings: string[] = []

  if (!selectedResult && normalizedType === "application/pdf") {
    incrementMetric("fallback_rate")
    const fallback = await safeFallback(fileBuffer, normalizedType, fileName)
    selectedResult = fallback.result
    selectedProvider = fallback.provider
    retries = Math.max(retries, RETRY_CONFIG.maxAttempts - 1)
    if (primaryError) {
      warnings.push(`Primary provider failed: ${primaryError}`)
    }
  } else if (!selectedResult && primaryError) {
    warnings.push(`Extraction failed: ${primaryError}`)
  }

  if (!selectedResult) {
    return buildEmptyResult({
      normalizedType,
      warnings,
      mode: "error",
      provider: selectedProvider,
      retries,
    })
  }

  const resultWarnings = [...warnings, ...selectedResult.warnings]
  const normalizedText = normalizeOutputText(selectedResult.text)
  const quality = assessQuality(normalizedText)
  const latencyMs = Date.now() - start

  if (!quality.minLengthSatisfied) {
    resultWarnings.push("Extracted content is short; document may be image-based or low quality")
  }

  const coverage = normalizedText.length > 0 ? Math.min(1, normalizedText.length / 2500) : 0
  const confidence = Math.max(0, Math.min(1, (selectedResult.confidence + quality.printableRatio) / 2))

  console.info("[ExtractionService] Extraction completed", {
    requestId,
    provider: selectedProvider,
    normalizedType,
    latencyMs,
    retries,
    chars: normalizedText.length,
    mode: selectedResult.mode,
    confidence,
    quality,
  })

  return {
    text: normalizedText,
    totalChars: normalizedText.length,
    pageCount: selectedResult.pageCount,
    warnings: resultWarnings,
    modeUsed: selectedResult.mode,
    coverage,
    confidence,
    fileType: normalizedType,
    provider: selectedProvider,
    retries,
    quality,
  }
}

async function safeFallback(fileBuffer: Buffer, fileType: string, fileName?: string): Promise<{
  result: ExtractProviderResult | null
  provider: string
}> {
  try {
    const fallback = await pdfFallbackProvider.extract({ fileBuffer, fileType, fileName })
    return {
      result: fallback,
      provider: pdfFallbackProvider.name,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[ExtractionService] Fallback provider failed", { message })
    return {
      result: null,
      provider: pdfFallbackProvider.name,
    }
  }
}

function buildEmptyResult(input: {
  normalizedType: string
  warnings: string[]
  mode: string
  provider: string
  retries?: number
}): ExtractionServiceResult {
  return {
    text: "",
    totalChars: 0,
    pageCount: 0,
    warnings: input.warnings,
    modeUsed: input.mode,
    coverage: 0,
    confidence: 0,
    fileType: input.normalizedType,
    provider: input.provider,
    retries: input.retries || 0,
    quality: {
      printableRatio: 0,
      sectionSignals: 0,
      minLengthSatisfied: false,
    },
  }
}

function assessQuality(text: string): ExtractionQuality {
  if (!text) {
    return { printableRatio: 0, sectionSignals: 0, minLengthSatisfied: false }
  }

  const printableChars = text.split("").filter((char) => {
    const code = char.charCodeAt(0)
    return code === 10 || code === 13 || code === 9 || (code >= 32 && code <= 126)
  }).length
  const printableRatio = printableChars / text.length

  const sectionPatterns = [
    /experience/i,
    /education/i,
    /skills?/i,
    /summary|profile/i,
    /certifications?/i,
  ]
  const sectionSignals = sectionPatterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0)

  return {
    printableRatio,
    sectionSignals,
    minLengthSatisfied: text.length >= 50,
  }
}

function normalizeOutputText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function backoff(attempt: number): number {
  const exp = Math.min(RETRY_CONFIG.maxDelayMs, RETRY_CONFIG.initialDelayMs * 2 ** (attempt - 1))
  const jitter = Math.floor(Math.random() * 120)
  return exp + jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
