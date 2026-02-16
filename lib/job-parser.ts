export interface ParsedJob {
  jobTitle: string
  companyName: string
  jobDescription: string
  location?: string
}

/**
 * Detect if pasted text is a URL (used client-side on paste).
 * Returns the URL if the text is a single URL (with optional whitespace), null otherwise.
 */
export function detectJobUrl(text: string): string | null {
  const trimmed = text.trim()
  // Must be a single URL — no spaces or newlines in the middle
  if (/\s/.test(trimmed)) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol === "http:" || url.protocol === "https:") {
      return trimmed
    }
  } catch {
    // Not a valid URL
  }
  return null
}

/**
 * JSON Schema for job posting extraction via Firecrawl.
 */
const jobPostingSchema = {
  type: "object",
  properties: {
    jobTitle: {
      type: "string",
      description: "The job title or position name",
    },
    companyName: {
      type: "string",
      description: "The name of the hiring company",
    },
    jobDescription: {
      type: "string",
      description:
        "The full job description including responsibilities, requirements, and qualifications. Preserve formatting with newlines.",
    },
    location: {
      type: "string",
      description: "The job location if mentioned (city, state, remote, etc.)",
    },
  },
  required: ["jobTitle", "companyName", "jobDescription"],
}

/**
 * Fetch a job posting URL and extract structured data using Firecrawl API.
 * Firecrawl handles JavaScript rendering, anti-bot, and HTML cleanup.
 * Server-side only.
 */
export async function parseJobFromUrl(url: string): Promise<ParsedJob> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured")
  }

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["extract"],
      extract: {
        schema: jobPostingSchema,
        prompt:
          "Extract the job posting details from this page. Include the full job description with responsibilities, requirements, and qualifications.",
      },
      timeout: 45000,
    }),
    signal: AbortSignal.timeout(55000),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.error || `Firecrawl API error (HTTP ${response.status})`
    throw new Error(message)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || "Failed to scrape job posting")
  }

  const extracted = result.data?.extract
  if (!extracted?.jobTitle || !extracted?.companyName || !extracted?.jobDescription) {
    throw new Error("Could not extract required job details from the page")
  }

  return {
    jobTitle: extracted.jobTitle,
    companyName: extracted.companyName,
    jobDescription: extracted.jobDescription,
    location: extracted.location || undefined,
  }
}
