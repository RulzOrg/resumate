import { createExtractionContext } from "./context"
import { getAdapters } from "./registry"
import type { ExtractionOptions, JobExtractionResult } from "./types"

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

export async function extractJobPostingFromUrl(url: string, options: ExtractionOptions = {}): Promise<JobExtractionResult | null> {
  const html = await fetchHtml(url, options)
  if (!html) return null

  const context = createExtractionContext(url, html)
  const adapters = getAdapters()

  for (const adapter of adapters) {
    try {
      const supports = await adapter.supports(context)
      if (!supports) continue

      const result = await adapter.extract(context)
      if (result) {
        return result
      }
    } catch (error) {
      console.error(`[job-extraction] adapter ${adapter.name} failed`, error)
      continue
    }
  }

  return null
}

async function fetchHtml(url: string, options: ExtractionOptions): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000)

    const response = await fetch(url, {
      headers: {
        ...DEFAULT_HEADERS,
        ...(options.userAgent ? { "User-Agent": options.userAgent } : {}),
      },
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.warn(`[job-extraction] failed to fetch ${url} – status ${response.status}`)
      return null
    }

    const html = await response.text()
    return html
  } catch (error) {
    console.error(`[job-extraction] network error while fetching ${url}`, error)
    return null
  }
}
