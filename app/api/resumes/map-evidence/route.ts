import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getJobAnalysisById, getResumeById, getOrCreateUser } from "@/lib/db"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, AppError } from "@/lib/error-handler"
import { searchEvidence } from "@/lib/match"

export interface EvidenceMapping {
  requirement: string
  type: "must_have" | "preferred" | "key_requirement"
  evidence: Array<{
    text: string
    score: number
    metadata?: Record<string, any>
  }>
  confidence: "exact" | "partial" | "missing"
  gaps: string
  recommendedKeywords: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResult = rateLimit(`map-evidence:${userId}`, 10, 300000) // 10 requests per 5 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before mapping evidence again.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    const { job_analysis_id, resume_id } = await request.json()

    if (!job_analysis_id || !resume_id) {
      throw new AppError("Job analysis ID and Resume ID are required", 400)
    }

    // Get job analysis
    const jobAnalysis = await getJobAnalysisById(job_analysis_id, user.id)
    if (!jobAnalysis) {
      throw new AppError("Job analysis not found", 404)
    }

    // Get resume
    const resume = await getResumeById(resume_id, user.id)
    if (!resume) {
      throw new AppError("Resume not found", 404)
    }

    console.log('[map-evidence] Starting evidence mapping for', {
      job: jobAnalysis.job_title,
      resume: resume.title,
    })

    // Extract requirements from job analysis
    const mustHaves = Array.isArray((jobAnalysis as any).required_skills)
      ? (jobAnalysis as any).required_skills
      : Array.isArray((jobAnalysis as any).analysis_result?.required_skills)
        ? (jobAnalysis as any).analysis_result.required_skills
        : []

    const preferred = Array.isArray((jobAnalysis as any).preferred_skills)
      ? (jobAnalysis as any).preferred_skills
      : Array.isArray((jobAnalysis as any).analysis_result?.preferred_skills)
        ? (jobAnalysis as any).analysis_result.preferred_skills
        : []

    const keyReqs = Array.isArray((jobAnalysis as any).analysis_result?.key_requirements)
      ? (jobAnalysis as any).analysis_result.key_requirements
      : []

    // Map each requirement to evidence
    const mappings: EvidenceMapping[] = []

    // Process must-haves
    for (const requirement of mustHaves.slice(0, 10)) {
      const evidence = await searchEvidence(user.id, [requirement], 3)
      const mapping = createMapping(requirement, "must_have", evidence)
      mappings.push(mapping)
    }

    // Process preferred (limit to 5)
    for (const requirement of preferred.slice(0, 5)) {
      const evidence = await searchEvidence(user.id, [requirement], 2)
      const mapping = createMapping(requirement, "preferred", evidence)
      mappings.push(mapping)
    }

    // Process key requirements (limit to 5)
    for (const requirement of keyReqs.slice(0, 5)) {
      const evidence = await searchEvidence(user.id, [requirement], 2)
      const mapping = createMapping(requirement, "key_requirement", evidence)
      mappings.push(mapping)
    }

    console.log('[map-evidence] Completed mapping', {
      totalRequirements: mappings.length,
      withEvidence: mappings.filter((m) => m.evidence.length > 0).length,
      missing: mappings.filter((m) => m.confidence === "missing").length,
    })

    return NextResponse.json(
      {
        mappings,
        summary: {
          totalRequirements: mappings.length,
          withEvidence: mappings.filter((m) => m.evidence.length > 0).length,
          exact: mappings.filter((m) => m.confidence === "exact").length,
          partial: mappings.filter((m) => m.confidence === "partial").length,
          missing: mappings.filter((m) => m.confidence === "missing").length,
        },
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('[map-evidence] Error:', error)
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error, code: errorInfo.code }, { status: errorInfo.statusCode })
  }
}

function createMapping(
  requirement: string,
  type: EvidenceMapping["type"],
  evidence: Array<{ text: string; score?: number; metadata?: Record<string, any> }>
): EvidenceMapping {
  const hasEvidence = evidence.length > 0
  const topScore = evidence.length > 0 ? (evidence[0].score || 0) : 0

  let confidence: EvidenceMapping["confidence"]
  let gaps: string
  let recommendedKeywords: string[] = []

  if (!hasEvidence) {
    confidence = "missing"
    gaps = `No evidence found for "${requirement}". This is a critical gap.`
    recommendedKeywords = generateKeywordSuggestions(requirement)
  } else if (topScore > 0.8) {
    confidence = "exact"
    gaps = ""
  } else {
    confidence = "partial"
    gaps = `Evidence for "${requirement}" is weak (score: ${Math.round(topScore * 100)}%). Consider strengthening with more specific examples.`
    recommendedKeywords = generateKeywordSuggestions(requirement)
  }

  return {
    requirement,
    type,
    evidence: evidence.map((e) => ({
      text: e.text,
      score: e.score || 0,
      metadata: e.metadata,
    })),
    confidence,
    gaps,
    recommendedKeywords,
  }
}

function generateKeywordSuggestions(requirement: string): string[] {
  // Simple keyword expansion - in production, could use OpenAI for better suggestions
  const keywords: string[] = [requirement]

  // Add common variations
  if (requirement.toLowerCase().includes("test")) {
    keywords.push("testing", "tested", "QA")
  }
  if (requirement.toLowerCase().includes("design")) {
    keywords.push("designed", "designing", "UX", "UI")
  }
  if (requirement.toLowerCase().includes("lead")) {
    keywords.push("led", "leadership", "managed")
  }
  if (requirement.toLowerCase().includes("api")) {
    keywords.push("REST", "GraphQL", "endpoint")
  }

  return keywords.slice(0, 3)
}
