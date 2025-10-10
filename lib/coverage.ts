export interface CoverageThresholds {
  totalChars: number
  perPageChars: number
}

export interface PerPageCoverage {
  page: number
  chars: number
  coverage: number | null
}

export interface CoverageStats {
  thresholds: CoverageThresholds
  totalChars: number
  pageCount: number
  avgCharsPerPage: number
  minCharsPerPage: number
  perPageStats: PerPageCoverage[]
  meetsTotalChars: boolean
  meetsPerPageAvg: boolean
  meetsEitherThreshold: boolean
  pagesBelowThreshold: number[]
}

export const DEFAULT_COVERAGE_THRESHOLDS: CoverageThresholds = {
  totalChars: 10_000,
  perPageChars: 800,
}

export function computeCoverageStats(result: {
  total_chars?: number
  page_count?: number
  per_page?: Array<{ page?: number; chars?: number; char_count?: number; coverage?: number }>
  coverage?: number
}, thresholds: CoverageThresholds = DEFAULT_COVERAGE_THRESHOLDS): CoverageStats {
  const totalChars = Number(result?.total_chars || 0)
  const pageCount = Number(result?.page_count || (Array.isArray(result?.per_page) ? result!.per_page!.length : 0))
  const perPageRaw = Array.isArray(result?.per_page) ? result!.per_page! : []

  const perPageStats: PerPageCoverage[] = perPageRaw.length
    ? perPageRaw.map((entry, index) => ({
        page: entry?.page ?? index + 1,
        chars: Number(entry?.chars ?? entry?.char_count ?? 0),
        coverage: typeof entry?.coverage === "number" ? entry.coverage : null,
      }))
    : pageCount > 0
      ? Array.from({ length: pageCount }).map((_, index) => ({
          page: index + 1,
          chars: Math.round(totalChars / pageCount),
          coverage: typeof result?.coverage === "number" ? result.coverage : null,
        }))
      : []

  const avgCharsPerPage = pageCount > 0 ? totalChars / pageCount : totalChars
  const minCharsPerPage = perPageStats.length
    ? perPageStats.reduce((min, item) => Math.min(min, item.chars), Number.POSITIVE_INFINITY)
    : avgCharsPerPage

  const meetsTotalChars = totalChars >= thresholds.totalChars
  const meetsPerPageAvg = avgCharsPerPage >= thresholds.perPageChars
  const pagesBelowThreshold = perPageStats
    .filter((item) => item.chars < thresholds.perPageChars)
    .map((item) => item.page)

  return {
    thresholds,
    totalChars,
    pageCount,
    avgCharsPerPage,
    minCharsPerPage,
    perPageStats,
    meetsTotalChars,
    meetsPerPageAvg,
    meetsEitherThreshold: meetsTotalChars || meetsPerPageAvg,
    pagesBelowThreshold,
  }
}

export interface SectionCoverage {
  flags: {
    summary: boolean
    experience: boolean
    education: boolean
    skills: boolean
    contact: boolean
  }
  sectionsMet: number
  missing: string[]
  meetsMinimum: boolean
}

export function computeSectionCoverage(structured: any): SectionCoverage {
  const experience = Array.isArray(structured?.experience) ? structured.experience : []
  const education = Array.isArray(structured?.education) ? structured.education : []
  const skillsNode = structured?.skills
  const skillBuckets = skillsNode && typeof skillsNode === "object"
    ? Object.values(skillsNode).flat().filter((item: any) => typeof item === "string" && item.trim().length > 0)
    : []

  const personalInfo = structured?.personal_info || {}
  const contactFields = [personalInfo.full_name, personalInfo.email, personalInfo.phone, personalInfo.location].filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  )

  const flags = {
    summary: typeof structured?.summary === "string" && structured.summary.trim().length > 0,
    experience: experience.length > 0,
    education: education.length > 0,
    skills: skillBuckets.length > 0,
    contact: contactFields.length > 0,
  }

  const sectionsMet = Object.values(flags).filter(Boolean).length
  const missing = Object.entries(flags)
    .filter(([, present]) => !present)
    .map(([section]) => section)

  return {
    flags,
    sectionsMet,
    missing,
    meetsMinimum: sectionsMet >= 3,
  }
}
