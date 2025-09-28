import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"

import { handleApiError, AppError, withRetry } from "@/lib/error-handler"
import { getOrCreateUser, getResumeById, updateResumeAnalysis } from "@/lib/db"
import { ResumeExtractedSchema, type ResumeExtracted } from "@/lib/schemas"

export const runtime = "nodejs"

const extractorResponseSchema = z.object({
  resume_id: z.string(),
  raw_text: z.string().optional(),
  extracted: ResumeExtractedSchema,
  metadata: z
    .object({
      used_ocr: z.boolean().optional(),
      extractor_latency_ms: z.number().optional(),
      notes: z.array(z.string()).optional(),
    })
    .optional(),
})

async function callExtractor(payload: { resume_id: string }) {
  const extractorUrl = process.env.EXTRACTOR_URL

  if (!extractorUrl) {
    throw new AppError("Extractor service not configured", 503, "EXTRACTOR_NOT_CONFIGURED")
  }

  const response = await fetch(`${extractorUrl.replace(/\/$/, "")}/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new AppError(
      `Extractor request failed with status ${response.status}`,
      502,
      "EXTRACTOR_ERROR",
    )
  }

  const json = await response.json()
  return extractorResponseSchema.parse(json)
}

function normalizeResume(extracted: ResumeExtracted) {
  return {
    summary: extracted.summary ?? "",
    experiences: extracted.experiences?.map((exp, index) => ({
      company: exp.company ?? undefined,
      title: exp.title ?? undefined,
      start_date: exp.start_date ?? undefined,
      end_date: exp.end_date ?? undefined,
      location: exp.location ?? undefined,
      order: index,
      bullets: (exp.bullets ?? []).map((bullet) => ({
        evidence_id: bullet.evidence_id,
        text: bullet.text,
        section: bullet.section ?? undefined,
        company: bullet.company ?? exp.company ?? undefined,
        title: bullet.title ?? exp.title ?? undefined,
        start_date: bullet.start_date ?? exp.start_date ?? undefined,
        end_date: bullet.end_date ?? exp.end_date ?? undefined,
        seniority: bullet.seniority ?? undefined,
        domain: bullet.domain ?? undefined,
        skills: bullet.skills ?? [],
        responsibilities: bullet.responsibilities ?? [],
        keywords: bullet.keywords ?? [],
      })),
    })) ?? [],
    sections: extracted.sections?.map((section, index) => ({
      name: section.name,
      order: index,
      bullets: (section.bullets ?? []).map((bullet) => ({
        evidence_id: bullet.evidence_id,
        text: bullet.text,
        section: bullet.section ?? section.name,
        seniority: bullet.seniority ?? undefined,
        domain: bullet.domain ?? undefined,
        skills: bullet.skills ?? [],
        responsibilities: bullet.responsibilities ?? [],
        keywords: bullet.keywords ?? [],
      })),
    })) ?? [],
    skills: extracted.skills ?? [],
    metadata: extracted.metadata ?? {},
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("Unable to verify user account", 500)
    }

    const body = await request.json()
    const inputSchema = z.object({
      resume_id: z.string(),
    })
    const { resume_id } = inputSchema.parse(body)

    const resume = await getResumeById(resume_id, user.id)
    if (!resume) {
      throw new AppError("Resume not found", 404)
    }

    const extractorResult = await withRetry(
      () => callExtractor({ resume_id }),
      3,
      500,
    )

    const normalized = normalizeResume(extractorResult.extracted)

    await updateResumeAnalysis(resume_id, user.id, {
      parsed_sections: normalized,
      processing_status: "completed",
      extracted_at: new Date().toISOString(),
      source_metadata: {
        ...(resume.source_metadata || {}),
        extractor_latency_ms: extractorResult.metadata?.extractor_latency_ms,
        used_ocr: extractorResult.metadata?.used_ocr,
      },
    })

    return NextResponse.json({
      success: true,
      resume_id,
      parsed_sections: normalized,
      raw_text: extractorResult.raw_text ?? null,
      metadata: extractorResult.metadata ?? {},
    })
  } catch (error) {
    const err = handleApiError(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.statusCode })
  }
}
