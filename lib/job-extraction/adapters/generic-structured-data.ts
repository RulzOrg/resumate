import { load } from "cheerio"
import { extractReadabilityContent, normalizeWhitespace } from "../utils"
import type { ExtractionContext, JobExtractionAdapter, JobExtractionResult } from "../types"

interface StructuredJobPosting {
  title?: string
  name?: string
  description?: string
  hiringOrganization?: { name?: string }
  jobLocation?: Array<{ address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } }>
  baseSalary?: { currency?: string; value?: { value?: number; minValue?: number; maxValue?: number } }
}

function findJobPosting(data: unknown): StructuredJobPosting | null {
  if (!data || typeof data !== "object") return null

  const candidate = data as Record<string, unknown>
  const type = candidate["@type"]

  if (Array.isArray(type) ? type.includes("JobPosting") : type === "JobPosting") {
    return candidate as StructuredJobPosting
  }

  if (Array.isArray(candidate["@graph"])) {
    for (const node of candidate["@graph"] as unknown[]) {
      const result = findJobPosting(node)
      if (result) return result
    }
  }

  if (Array.isArray(candidate)) {
    for (const entry of candidate as unknown[]) {
      const result = findJobPosting(entry)
      if (result) return result
    }
  }

  return null
}

export const GenericStructuredDataAdapter: JobExtractionAdapter = {
  name: "generic-structured-data",
  priority: 50,
  supports: (context) => {
    const $ = load(context.html)
    return $("script[type='application/ld+json']").length > 0
  },
  extract: async (context): Promise<JobExtractionResult | null> => {
    const $ = load(context.html)
    const scripts = $("script[type='application/ld+json']")

    for (const script of scripts.toArray()) {
      try {
        const raw = $(script).contents().text()
        if (!raw) continue
        const json = JSON.parse(raw)
        const posting = findJobPosting(json)
        if (!posting) continue

        const description = posting.description ? normalizeWhitespace(stripHtml(posting.description)) : null
        const title = posting.title || posting.name || null
        const company = posting.hiringOrganization?.name || null
        const location = posting.jobLocation?.[0]?.address
          ? [posting.jobLocation[0].address.addressLocality, posting.jobLocation[0].address.addressRegion, posting.jobLocation[0].address.addressCountry]
              .filter(Boolean)
              .join(", ") || null
          : null

        if (!description) continue

        return {
          title,
          company,
          description,
          location,
          extractedBy: {
            adapter: "generic-structured-data",
            confidence: 0.7,
          },
        }
      } catch {
        continue
      }
    }

    // Fallback to readability to ensure the pipeline returns something helpful
    const readability = await extractReadabilityContent(context)
    if (!readability.content) {
      return null
    }

    return {
      title: readability.title ? normalizeWhitespace(readability.title) : null,
      company: null,
      description: normalizeWhitespace(readability.content),
      extractedBy: {
        adapter: "generic-readability-fallback",
        confidence: 0.3,
        notes: ["Structured data not found"],
      },
    }
  },
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}
