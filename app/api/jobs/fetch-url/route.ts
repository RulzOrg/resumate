import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
const COMMON_HEADERS = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
} as const

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Skip structured extraction pipeline (module not available)
    // Proceed directly to fallback extraction methods

    // Fetch the job posting content (non-fatal if blocked; we'll fallback)
    let html = ""
    const hostname = new URL(url).hostname.toLowerCase()
    const preferRendered =
      [
        "metacareers.com",
        "facebookcareers.com",
        "myworkdayjobs.com",
        "greenhouse.io",
        "lever.co",
        "smartrecruiters.com",
        "bamboohr.com",
        "workday.com",
      ].some((d) => hostname.endsWith(d))
    try {
      const response = await fetch(url, {
        headers: {
          ...COMMON_HEADERS,
          Referer: new URL(url).origin,
        },
        redirect: "follow",
        cache: "no-store",
      })
      if (response.ok) {
        html = await response.text()
      }
    } catch {}

    const stripTags = (input: string) =>
      input
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()

    // Try structured data first (JSON-LD JobPosting)
    let structuredTitle: string | undefined
    let structuredCompany: string | undefined
    let structuredDescription: string | undefined
    try {
      const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
      for (const match of scriptMatches) {
        const raw = match[1]
        // Some sites wrap multiple objects/arrays
        const parsed = JSON.parse(raw)
        const candidates = Array.isArray(parsed) ? parsed : [parsed]
        for (const obj of candidates) {
          if (!obj) continue
          const type = (obj["@type"] || obj["@graph"]?.[0]?.["@type"]) as string | undefined
          if (type === "JobPosting") {
            const jp = obj["@type"] === "JobPosting" ? obj : obj["@graph"][0]
            structuredTitle = jp.title || structuredTitle
            structuredCompany = jp.hiringOrganization?.name || structuredCompany
            const desc = jp.description || jp.responsibilities || jp.qualifications
            if (typeof desc === "string") structuredDescription = stripTags(desc)
          }
          // Some sites put JobPosting under @graph
          if (obj["@graph"]) {
            for (const node of obj["@graph"]) {
              if (node["@type"] === "JobPosting") {
                structuredTitle = node.title || structuredTitle
                structuredCompany = node.hiringOrganization?.name || structuredCompany
                if (typeof node.description === "string") structuredDescription = stripTags(node.description)
              }
            }
          }
        }
        if (structuredDescription) break
      }
    } catch {}

    // Fall back to meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
    const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : undefined

    // Title fallback
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const rawTitle = structuredTitle || (titleMatch ? titleMatch[1].trim() : "")
    let title = sanitizeTitle(rawTitle)

    if (!title || title.length < 4) {
      const derivedFromUrl = deriveTitleFromUrl(url)
      if (derivedFromUrl) {
        title = derivedFromUrl
      }
    }

    if (!title || title.length < 4) {
      title = ""
    }

    // Best-effort description
    let textContent = structuredDescription || (html ? stripTags(html) : "")

    // Detect blocked/thin content and fall back to external extractors
    if (preferRendered || isBlocked(html) || textContent.length < 300) {
      const firecrawlKey = process.env.FIRECRAWL_API_KEY
      if (firecrawlKey) {
        try {
          const fcResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${firecrawlKey}`,
            },
            body: JSON.stringify({
              url,
              formats: ["markdown", "html", "text"],
              onlyMainContent: true,
            }),
          })
          if (fcResp.ok) {
            const data: any = await fcResp.json()
            const fcText =
              data?.markdown || data?.content || data?.text || (typeof data === "string" ? data : "")
            if (fcText && fcText.trim().length > textContent.length) {
              textContent = fcText.trim()
            }
            // If Firecrawl returned HTML, attempt structured extraction again for better title/company
            const fcHtml = data?.html
            if (fcHtml && (!structuredDescription || !structuredTitle)) {
              try {
                let sTitle: string | undefined
                let sCompany: string | undefined
                let sDesc: string | undefined
                const matches = [
                  ...String(fcHtml).matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
                ]
                for (const m of matches) {
                  const raw = m[1]
                  const parsed = JSON.parse(raw)
                  const candidates = Array.isArray(parsed) ? parsed : [parsed]
                  for (const obj of candidates) {
                    if (!obj) continue
                    const type = (obj["@type"] || obj["@graph"]?.[0]?.["@type"]) as string | undefined
                    if (type === "JobPosting") {
                      const jp = obj["@type"] === "JobPosting" ? obj : obj["@graph"][0]
                      sTitle = jp.title || sTitle
                      sCompany = jp.hiringOrganization?.name || sCompany
                      const desc = jp.description || jp.responsibilities || jp.qualifications
                      if (typeof desc === "string") sDesc = stripTags(desc)
                    }
                    if (obj["@graph"]) {
                      for (const node of obj["@graph"]) {
                        if (node["@type"] === "JobPosting") {
                          sTitle = node.title || sTitle
                          sCompany = node.hiringOrganization?.name || sCompany
                          if (typeof node.description === "string") sDesc = stripTags(node.description)
                        }
                      }
                    }
                  }
                  if (sDesc) break
                }
                if (sDesc && sDesc.length > textContent.length) textContent = sDesc
                if (sTitle) structuredTitle = sTitle
                if (sCompany) structuredCompany = sCompany
              } catch {}
            }
          }
        } catch {}
      }

      // Zero-config backup: Jina Reader
      if (textContent.length < 300) {
        try {
          const jr = await fetch(`https://r.jina.ai/${url}`, {
            headers: { ...COMMON_HEADERS, Accept: "text/plain" },
            cache: "no-store",
          })
          if (jr.ok) {
            const jinaText = (await jr.text()).trim()
            if (jinaText.length > textContent.length) {
              textContent = jinaText
            }
          }
        } catch {}
      }
    }

    // Fallback company extraction from URL if not found in structured data
    let companyName = structuredCompany
    if (!companyName) {
      try {
        const urlObj = new URL(url)
        const hostname = urlObj.hostname.toLowerCase()
        
        // Remove common prefixes and TLDs
        let domain = hostname
          .replace(/^(www\.|careers\.|jobs\.|apply\.|workday\.|greenhouse\.|lever\.|bamboohr\.|smartrecruiters\.)/, '')
          .replace(/\.(com|org|net|io|co|jobs|careers)(\.[a-z]{2})?$/, '')
        
        // Handle specific ATS patterns
        if (domain.includes('.')) {
          const parts = domain.split('.')
          if (parts.length >= 2 && ['workday', 'greenhouse', 'lever', 'bamboohr', 'smartrecruiters'].includes(parts[1])) {
            domain = parts[0]
          } else {
            domain = parts[parts.length - 2] || parts[0]
          }
        }
        
        // Clean up and format
        domain = domain
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim()
        
        // Use if it looks like a valid company name
        if (domain.length >= 2 && !['Jobs', 'Careers', 'Apply', 'Work'].includes(domain)) {
          companyName = domain
        }
      } catch {}
    }

    return NextResponse.json({
      title: title || null,
      company: companyName,
      content: (metaDesc ? `${metaDesc}\n\n` : "") + textContent.substring(0, 12000),
      url,
    })
  } catch (error) {
    console.error("URL fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch job posting content" }, { status: 500 })
  }
}

function sanitizeTitle(value: string | undefined): string {
  if (!value) return ""
  return value
    .replace(/\s+\|\s+.*/, "")
    .replace(/-\s+[A-Z\s]{2,}$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function deriveTitleFromUrl(jobUrl: string): string | null {
  try {
    const { pathname } = new URL(jobUrl)
    const segments = pathname.split("/").filter(Boolean)
    const candidate = segments.reverse().find((segment) => segment && segment.length > 3)

    if (!candidate) return null

    const cleaned = decodeURIComponent(candidate)
      .replace(/[-_]+/g, " ")
      .replace(/\d+/g, "")
      .trim()

    if (!cleaned || cleaned.length < 4) return null

    return cleaned
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  } catch {
    return null
  }
}

function isBlocked(html: string): boolean {
  const h = html.toLowerCase()
  const signals = [
    "enable javascript",
    "please enable cookies",
    "access denied",
    "are you a robot",
    "captcha",
    "cloudflare",
    "bot detection",
    "request blocked",
    "temporarily unavailable",
  ]
  return signals.some((s) => h.includes(s)) || h.length < 1500
}
