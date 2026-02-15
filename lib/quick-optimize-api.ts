import type { WorkExperienceItem } from "@/lib/resume-parser"

export type ApiIssue = {
  path?: Array<string | number>
  message?: string
}

export type ApiErrorPayload = {
  code?: string
  message?: string
  error?: string
  details?: unknown
  optimized_resume?: { id?: string }
  work_experience?: WorkExperienceItem[]
  summary?: string
}

export async function parseApiResponse(
  response: Response
): Promise<{ data: ApiErrorPayload | null; rawText: string }> {
  const rawText = await response.text()
  if (!rawText) return { data: null, rawText: "" }

  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    try {
      return { data: JSON.parse(rawText) as ApiErrorPayload, rawText }
    } catch {
      return { data: null, rawText }
    }
  }

  try {
    const parsed = JSON.parse(rawText) as ApiErrorPayload
    return { data: parsed, rawText }
  } catch {
    return { data: null, rawText }
  }
}

function normalizePath(path: Array<string | number>): string {
  return path.map((part) => String(part)).join(".")
}

function mapValidationIssueToMessage(issue: ApiIssue): string | null {
  const path = normalizePath(issue.path || [])

  if (path === "contact.location") {
    return "Your contact location is invalid. Please review it and try again."
  }
  if (/^workExperience\.\d+\.location$/.test(path)) {
    return "One work experience item has an invalid location. Please review and try again."
  }
  if (/^workExperience\.\d+\.employmentType$/.test(path)) {
    return "One work experience item has an invalid employment type. Please review and try again."
  }
  if (/^education\.\d+\.graduationDate$/.test(path)) {
    return "One education item has an invalid graduation date. Please review and try again."
  }
  if (/^education\.\d+\.field$/.test(path)) {
    return "One education item has an invalid field of study. Please review and try again."
  }
  if (/^education\.\d+\.notes$/.test(path)) {
    return "One education item has invalid notes. Please review and try again."
  }

  return null
}

function getValidationMessage(details: unknown): string | null {
  if (!Array.isArray(details)) return null
  for (const issue of details) {
    const mapped = mapValidationIssueToMessage(issue as ApiIssue)
    if (mapped) return mapped
  }
  const firstIssue = details[0] as ApiIssue | undefined
  return firstIssue?.message || null
}

export function buildApiErrorMessage(
  payload: ApiErrorPayload | null,
  rawText: string,
  fallback: string,
  isProduction = process.env.NODE_ENV === "production"
): string {
  const validationMessage = getValidationMessage(payload?.details)
  if (validationMessage) return validationMessage

  const directMessage = payload?.message || payload?.error
  if (directMessage) return directMessage

  const rawTrimmed = rawText.trim()
  if (rawTrimmed.startsWith("<!DOCTYPE") || rawTrimmed.startsWith("<html")) {
    return "Optimization failed. Please retry. If it persists, refresh and try again."
  }

  if (rawTrimmed && !isProduction) {
    return `${fallback} (debug: ${rawTrimmed.slice(0, 160)})`
  }

  return fallback
}
