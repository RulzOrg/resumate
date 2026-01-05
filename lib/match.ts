import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

import type { JobAnalysis } from "./db"

export interface EvidencePoint {
  id: string
  text: string
  metadata?: Record<string, any>
  score?: number
  matchCount?: number
  maxScore?: number
}

export interface ScoreBreakdown {
  overall: number
  confidence: number
  dimensions: {
    skills: number
    responsibilities: number
    domain: number
    seniority: number
  }
  missingMustHaves: string[]
  explanation?: string
  scoringMethod: 'evidence' | 'resume_text' | 'hybrid'
  evidenceUsed: number
  missingMustHavesCount?: number
  coverageByGroup?: Record<
    string,
    {
      total: number
      covered: number
      percentage: number
    }
  >
}

const scoreSchema = z.object({
  overall: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  skills: z.number().min(0).max(100),
  responsibilities: z.number().min(0).max(100),
  domain: z.number().min(0).max(100),
  seniority: z.number().min(0).max(100),
  missingMustHaves: z.array(z.string()),
  explanation: z.string(),
})

/**
 * Use AI to compute a fit score between resume and job requirements
 */
export async function computeScoreWithAI(
  jobProfile: JobAnalysis,
  evidence: EvidencePoint[],
  resumeText?: string
): Promise<ScoreBreakdown> {
  const mustHaves = [
    ...((jobProfile as any).required_skills || []),
    ...((jobProfile as any).analysis_result?.key_requirements || []),
  ]

  const resumeContent = resumeText || evidence.map(e => e.text).join("\n\n")

  if (!resumeContent || resumeContent.length < 50) {
    return {
      overall: 0,
      confidence: 0,
      dimensions: { skills: 0, responsibilities: 0, domain: 0, seniority: 0 },
      missingMustHaves: mustHaves,
      explanation: "No resume content available for scoring",
      scoringMethod: resumeText ? 'resume_text' : 'evidence',
      evidenceUsed: evidence.length,
    }
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: scoreSchema,
      prompt: `You are an expert recruiter evaluating a resume against a job posting.

JOB REQUIREMENTS:
Title: ${jobProfile.job_title}
Company: ${jobProfile.company_name || "Not specified"}
Required Skills: ${((jobProfile as any).required_skills || []).join(", ")}
Key Requirements: ${((jobProfile as any).analysis_result?.key_requirements || []).join(", ")}
Experience Level: ${(jobProfile as any).experience_level || "Not specified"}

RESUME CONTENT:
${resumeContent.slice(0, 8000)}

Evaluate how well this resume matches the job requirements. Score each dimension from 0-100:
- skills: How well the candidate's skills match required skills
- responsibilities: How relevant their experience is to the role
- domain: Industry/domain expertise alignment
- seniority: Experience level match

Also provide:
- overall: Weighted average score (0-100)
- confidence: How confident you are in this assessment (0-100)
- missingMustHaves: List of critical requirements the candidate is missing
- explanation: Brief explanation of the score`,
    })

  return {
      overall: object.overall,
      confidence: object.confidence,
    dimensions: {
        skills: object.skills,
        responsibilities: object.responsibilities,
        domain: object.domain,
        seniority: object.seniority,
      },
      missingMustHaves: object.missingMustHaves,
      explanation: object.explanation,
      scoringMethod: resumeText ? 'resume_text' : 'evidence',
      evidenceUsed: evidence.length,
    }
  } catch (error: any) {
    console.error("[match] AI scoring failed:", error.message)
    return {
      overall: 50,
      confidence: 20,
      dimensions: { skills: 50, responsibilities: 50, domain: 50, seniority: 50 },
      missingMustHaves: [],
      explanation: "Scoring failed - using default values",
      scoringMethod: resumeText ? 'resume_text' : 'evidence',
      evidenceUsed: evidence.length,
    }
  }
}
