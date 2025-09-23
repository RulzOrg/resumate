import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

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

    // Fetch the job posting content
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch job posting" }, { status: 400 })
    }

    const html = await response.text()

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
    const title = (structuredTitle || (titleMatch ? titleMatch[1].trim() : "Job Posting")).replace(/\s+\|\s+.*/, "")

    // Best-effort description
    const textContent = structuredDescription || stripTags(html)

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
      title,
      company: companyName,
      content: (metaDesc ? `${metaDesc}\n\n` : "") + textContent.substring(0, 12000),
      url,
    })
  } catch (error) {
    console.error("URL fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch job posting content" }, { status: 500 })
  }
}
