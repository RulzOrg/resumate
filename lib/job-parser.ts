import Anthropic from "@anthropic-ai/sdk"

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
 * Strip HTML to plain text for LLM extraction.
 * Removes scripts, styles, nav/footer noise, and HTML tags.
 */
function stripHtml(html: string): string {
  let text = html
  // Remove script and style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "")
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "")
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
  // Remove nav, footer, header blocks (common noise)
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "")
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "")
  // Replace <br>, <p>, <div>, <li>, <h*> with newlines for readability
  text = text.replace(/<br\s*\/?>/gi, "\n")
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ")
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&")
  text = text.replace(/&lt;/g, "<")
  text = text.replace(/&gt;/g, ">")
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&nbsp;/g, " ")
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ")
  text = text.replace(/\n{3,}/g, "\n\n")
  return text.trim()
}

/**
 * Fetch a job posting URL and extract structured data using LLM.
 * Server-side only.
 */
export async function parseJobFromUrl(url: string): Promise<ParsedJob> {
  // Fetch the page HTML
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch job posting (HTTP ${response.status})`)
  }

  const contentType = response.headers.get("content-type") || ""
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error("URL does not point to a web page")
  }

  const html = await response.text()
  const plainText = stripHtml(html)

  if (plainText.length < 100) {
    throw new Error("Page content too short — this may not be a job posting, or the page requires JavaScript to render")
  }

  // Truncate to ~8000 chars for LLM (enough context, stays cheap)
  const truncated = plainText.slice(0, 8000)

  // Use Claude Haiku for fast/cheap structured extraction
  const client = new Anthropic()
  const model = process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-4-5-20241022"

  const result = await client.messages.create({
    model,
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Extract the job posting details from the following web page text. Return ONLY a JSON object with these fields:
- "jobTitle": the job title (required)
- "companyName": the hiring company name (required)
- "jobDescription": the full job description including responsibilities, requirements, and qualifications (required, preserve formatting with newlines)
- "location": the job location if mentioned (optional)

If you cannot identify a job posting in the text, return: {"error": "Not a job posting"}

Web page text:
${truncated}`,
      },
    ],
  })

  const content = result.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected LLM response format")
  }

  // Extract JSON from the response (handle markdown code blocks)
  let jsonStr = content.text.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  let parsed: Record<string, string>
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error("Failed to parse job posting data from page content")
  }

  if (parsed.error) {
    throw new Error(parsed.error)
  }

  if (!parsed.jobTitle || !parsed.companyName || !parsed.jobDescription) {
    throw new Error("Could not extract required job details from the page")
  }

  return {
    jobTitle: parsed.jobTitle,
    companyName: parsed.companyName,
    jobDescription: parsed.jobDescription,
    location: parsed.location || undefined,
  }
}
