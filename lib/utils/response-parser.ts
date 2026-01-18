/**
 * Response Parser Utility for LLM Responses
 *
 * Handles partial, malformed, or incomplete responses from LLM APIs.
 * Provides graceful degradation and data salvaging capabilities.
 */

import type {
  AnalysisResult,
  RewriteResult,
  RewrittenExperience,
  ATSScanResult,
  ATSSectionResult,
  ATSIssue,
  InterviewPrepResult,
  InterviewQuestion,
} from "@/lib/types/optimize-flow"

// ============================================
// Generic JSON Parsing Utilities
// ============================================

/**
 * Safely parse JSON with error recovery.
 * Attempts to fix common JSON issues before parsing.
 *
 * @warning This function performs aggressive JSON recovery (fixing unquoted keys,
 * replacing single quotes, removing control characters, etc.) and should ONLY be
 * used with trusted input such as LLM API responses. Do NOT use with untrusted
 * user input as the transformations could mask malicious content.
 *
 * @param text - The JSON string to parse (from trusted source only)
 * @returns Object with parsed data or error message
 */
export function safeJsonParse<T>(text: string): { data: T | null; error: string | null } {
  if (!text || typeof text !== "string") {
    return { data: null, error: "Empty or invalid input" }
  }

  // Try direct parse first
  try {
    return { data: JSON.parse(text), error: null }
  } catch {
    // Continue to recovery attempts
  }

  // Try to extract JSON from markdown code blocks
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonBlockMatch) {
    try {
      return { data: JSON.parse(jsonBlockMatch[1].trim()), error: null }
    } catch {
      // Continue to other recovery attempts
    }
  }

  // Try to find JSON object/array in the text
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch) {
    try {
      return { data: JSON.parse(jsonMatch[1]), error: null }
    } catch {
      // Continue to recovery attempts
    }
  }

  // Try to fix common JSON issues
  let fixedText = text
    // Remove trailing commas before closing brackets
    .replace(/,\s*([}\]])/g, "$1")
    // Fix unquoted keys
    .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
    // Fix single quotes to double quotes
    .replace(/'/g, '"')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, "")

  try {
    return { data: JSON.parse(fixedText), error: null }
  } catch (e) {
    return {
      data: null,
      error: `Failed to parse JSON: ${e instanceof Error ? e.message : "Unknown error"}`,
    }
  }
}

/**
 * Extract a value from nested object path safely
 */
export function getNestedValue<T>(obj: any, path: string, defaultValue: T): T {
  const keys = path.split(".")
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return defaultValue
    }
    current = current[key]
  }

  return current !== undefined && current !== null ? current : defaultValue
}

// ============================================
// Analysis Result Parser
// ============================================

const DEFAULT_ANALYSIS_RESULT: AnalysisResult = {
  matchScore: 0,
  strengths: [],
  weaknesses: [],
  missingKeywords: [],
  presentKeywords: [],
  recommendations: [],
}

/**
 * Parse and validate an analysis result with fallbacks
 */
export function parseAnalysisResult(data: any): {
  result: AnalysisResult
  warnings: string[]
  isPartial: boolean
} {
  const warnings: string[] = []
  let isPartial = false

  if (!data || typeof data !== "object") {
    return {
      result: DEFAULT_ANALYSIS_RESULT,
      warnings: ["Analysis result is empty or invalid"],
      isPartial: true,
    }
  }

  // Parse match score
  let matchScore = getNestedValue<number>(data, "matchScore", 0)
  if (typeof matchScore !== "number" || isNaN(matchScore)) {
    matchScore = parseInt(String(data.matchScore || data.match_score || "0"), 10) || 0
    if (matchScore === 0) {
      warnings.push("Match score could not be determined")
      isPartial = true
    }
  }
  matchScore = Math.max(0, Math.min(100, matchScore))

  // Parse arrays with validation
  const strengths = parseStringArray(data.strengths, "strengths", warnings)
  const weaknesses = parseStringArray(data.weaknesses, "weaknesses", warnings)
  const missingKeywords = parseStringArray(
    data.missingKeywords || data.missing_keywords,
    "missingKeywords",
    warnings
  )
  const presentKeywords = parseStringArray(
    data.presentKeywords || data.present_keywords,
    "presentKeywords",
    warnings
  )
  const recommendations = parseStringArray(data.recommendations, "recommendations", warnings)

  // Check if we have minimum viable data
  if (strengths.length === 0 && weaknesses.length === 0 && missingKeywords.length === 0) {
    isPartial = true
    warnings.push("Analysis may be incomplete - no strengths, weaknesses, or keywords found")
  }

  return {
    result: {
      matchScore,
      strengths,
      weaknesses,
      missingKeywords,
      presentKeywords,
      recommendations,
    },
    warnings,
    isPartial,
  }
}

// ============================================
// Rewrite Result Parser
// ============================================

const DEFAULT_REWRITE_RESULT: RewriteResult = {
  professionalSummary: "",
  workExperiences: [],
  keywordsAdded: [],
}

/**
 * Parse and validate a rewrite result with fallbacks
 */
export function parseRewriteResult(data: any): {
  result: RewriteResult
  warnings: string[]
  isPartial: boolean
} {
  const warnings: string[] = []
  let isPartial = false

  if (!data || typeof data !== "object") {
    return {
      result: DEFAULT_REWRITE_RESULT,
      warnings: ["Rewrite result is empty or invalid"],
      isPartial: true,
    }
  }

  // Parse professional summary
  let professionalSummary = String(
    data.professionalSummary || data.professional_summary || ""
  ).trim()
  if (!professionalSummary) {
    warnings.push("Professional summary is missing")
    isPartial = true
  }

  // Parse work experiences
  const rawExperiences = data.workExperiences || data.work_experiences || []
  const workExperiences: RewrittenExperience[] = []

  if (Array.isArray(rawExperiences)) {
    for (let i = 0; i < rawExperiences.length; i++) {
      const exp = rawExperiences[i]
      if (!exp || typeof exp !== "object") {
        warnings.push(`Work experience ${i + 1} is invalid`)
        continue
      }

      const parsedExp: RewrittenExperience = {
        title: String(exp.title || "").trim() || `Position ${i + 1}`,
        company: String(exp.company || "").trim() || "Unknown Company",
        duration: String(exp.duration || "").trim() || "",
        originalBullets: parseStringArray(
          exp.originalBullets || exp.original_bullets,
          `experience ${i + 1} original bullets`,
          warnings
        ),
        rewrittenBullets: parseStringArray(
          exp.rewrittenBullets || exp.rewritten_bullets,
          `experience ${i + 1} rewritten bullets`,
          warnings
        ),
        keywordsAdded: parseStringArray(
          exp.keywordsAdded || exp.keywords_added,
          `experience ${i + 1} keywords`,
          warnings
        ),
      }

      // If rewritten bullets are empty, use original bullets
      if (parsedExp.rewrittenBullets.length === 0 && parsedExp.originalBullets.length > 0) {
        parsedExp.rewrittenBullets = [...parsedExp.originalBullets]
        warnings.push(`Experience ${i + 1}: Using original bullets as rewritten bullets were missing`)
        isPartial = true
      }

      workExperiences.push(parsedExp)
    }
  }

  if (workExperiences.length === 0) {
    warnings.push("No work experiences found in rewrite result")
    isPartial = true
  }

  // Parse keywords added
  const keywordsAdded = parseStringArray(
    data.keywordsAdded || data.keywords_added,
    "keywordsAdded",
    warnings
  )

  return {
    result: {
      professionalSummary,
      workExperiences,
      keywordsAdded,
    },
    warnings,
    isPartial,
  }
}

// ============================================
// ATS Scan Result Parser
// ============================================

const DEFAULT_ATS_RESULT: ATSScanResult = {
  overallScore: 0,
  sections: [],
  criticalIssues: [],
  warnings: [],
  recommendations: [],
}

/**
 * Parse and validate an ATS scan result with fallbacks
 */
export function parseATSScanResult(data: any): {
  result: ATSScanResult
  warnings: string[]
  isPartial: boolean
} {
  const warnings: string[] = []
  let isPartial = false

  if (!data || typeof data !== "object") {
    return {
      result: DEFAULT_ATS_RESULT,
      warnings: ["ATS scan result is empty or invalid"],
      isPartial: true,
    }
  }

  // Parse overall score
  let overallScore = getNestedValue<number>(data, "overallScore", 0)
  if (typeof overallScore !== "number" || isNaN(overallScore)) {
    overallScore = parseInt(String(data.overallScore || data.overall_score || "0"), 10) || 0
    if (overallScore === 0) {
      warnings.push("ATS score could not be determined")
      isPartial = true
    }
  }
  overallScore = Math.max(0, Math.min(100, overallScore))

  // Parse sections
  const rawSections = data.sections || []
  const sections: ATSSectionResult[] = []

  if (Array.isArray(rawSections)) {
    for (const section of rawSections) {
      if (!section || typeof section !== "object") continue

      const status = parseStatus(section.status)
      sections.push({
        name: String(section.name || "").trim() || "Unknown Section",
        status,
        details: String(section.details || "").trim() || "",
        risk: section.risk ? String(section.risk).trim() : undefined,
        fix: section.fix ? String(section.fix).trim() : undefined,
      })
    }
  }

  // Parse issues
  const criticalIssues = parseIssues(data.criticalIssues || data.critical_issues)
  const atsWarnings = parseIssues(data.warnings)
  const recommendations = parseStringArray(data.recommendations, "recommendations", warnings)

  if (sections.length === 0) {
    warnings.push("No sections found in ATS scan result")
    isPartial = true
  }

  return {
    result: {
      overallScore,
      sections,
      criticalIssues,
      warnings: atsWarnings,
      recommendations,
    },
    warnings,
    isPartial,
  }
}

function parseStatus(status: any): ATSSectionResult["status"] {
  const s = String(status || "").toLowerCase()
  if (s === "pass" || s === "passed") return "pass"
  if (s === "fail" || s === "failed" || s === "error") return "fail"
  return "warning"
}

function parseIssues(data: any): ATSIssue[] {
  if (!Array.isArray(data)) return []

  return data
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      section: String(item.section || "").trim() || "General",
      issue: String(item.issue || "").trim() || "Unknown issue",
      fix: String(item.fix || "").trim() || "Review this section",
    }))
}

// ============================================
// Interview Prep Result Parser
// ============================================

const DEFAULT_INTERVIEW_RESULT: InterviewPrepResult = {
  questions: [],
}

/**
 * Parse and validate an interview prep result with fallbacks
 */
export function parseInterviewPrepResult(data: any): {
  result: InterviewPrepResult
  warnings: string[]
  isPartial: boolean
} {
  const warnings: string[] = []
  let isPartial = false

  if (!data || typeof data !== "object") {
    return {
      result: DEFAULT_INTERVIEW_RESULT,
      warnings: ["Interview prep result is empty or invalid"],
      isPartial: true,
    }
  }

  // Parse questions
  const rawQuestions = data.questions || []
  const questions: InterviewQuestion[] = []

  if (Array.isArray(rawQuestions)) {
    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i]
      if (!q || typeof q !== "object") {
        warnings.push(`Question ${i + 1} is invalid`)
        continue
      }

      const question = String(q.question || "").trim()
      if (!question) {
        warnings.push(`Question ${i + 1} has no question text`)
        continue
      }

      questions.push({
        category: parseCategory(q.category),
        difficulty: parseDifficulty(q.difficulty),
        question,
        perfectAnswer: String(q.perfectAnswer || q.perfect_answer || "").trim() ||
          "Answer not generated - please try again.",
        keyPoints: parseStringArray(q.keyPoints || q.key_points, `question ${i + 1} key points`, warnings),
        relatedExperience: String(q.relatedExperience || q.related_experience || "").trim(),
      })
    }
  }

  if (questions.length === 0) {
    warnings.push("No valid questions found in interview prep result")
    isPartial = true
  } else if (questions.length < 3) {
    warnings.push(`Only ${questions.length} question(s) generated (expected 3)`)
    isPartial = true
  }

  return {
    result: { questions },
    warnings,
    isPartial,
  }
}

function parseCategory(category: any): InterviewQuestion["category"] {
  const c = String(category || "").toLowerCase()
  if (c.includes("technical") || c.includes("tech")) return "Technical"
  if (c.includes("behavioral") || c.includes("behavior")) return "Behavioral"
  if (c.includes("situation")) return "Situational"
  if (c.includes("system") || c.includes("design")) return "System Design"
  if (c.includes("leader") || c.includes("management")) return "Leadership"
  return "Behavioral" // Default
}

function parseDifficulty(difficulty: any): InterviewQuestion["difficulty"] {
  const d = String(difficulty || "").toLowerCase()
  if (d.includes("expert") || d.includes("extreme")) return "expert"
  if (d.includes("very") || d.includes("extremely")) return "very_hard"
  return "hard" // Default
}

// ============================================
// Helper Functions
// ============================================

function parseStringArray(data: any, fieldName: string, warnings: string[]): string[] {
  if (!data) return []

  if (typeof data === "string") {
    // Try to split by common delimiters
    return data
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }

  if (!Array.isArray(data)) {
    warnings.push(`${fieldName} is not an array`)
    return []
  }

  return data
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0)
}

// ============================================
// Partial Result Indicator Component Props
// ============================================

export interface PartialResultWarning {
  message: string
  severity: "info" | "warning" | "error"
}

/**
 * Convert parser warnings to UI-friendly warnings
 */
export function formatWarnings(warnings: string[], isPartial: boolean): PartialResultWarning[] {
  if (warnings.length === 0 && !isPartial) return []

  return warnings.map((message) => ({
    message,
    severity: message.includes("missing") || message.includes("empty") ? "warning" : "info",
  }))
}
