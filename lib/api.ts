// Typed client API helpers for App Router endpoints
// Shared fetchJson<T> plus helpers for score, rewrite, and rephrase

import type { EvidencePoint, ScoreBreakdown } from "@/lib/match"
import type { OptimizedResume } from "@/lib/db"

export type ApiError = {
  status: number
  error?: string
  code?: string | number
  message?: string
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    credentials: "same-origin",
    cache: "no-store",
  })
  if (!res.ok) {
    let data: any = null
    try {
      data = await res.json()
    } catch {}
    const err: ApiError = {
      status: res.status,
      error: data?.error,
      code: data?.code,
      message: data?.message,
    }
    throw err
  }
  return res.json()
}

export async function scoreFit(body: {
  job_analysis_id: string
  resume_id?: string
  queries?: string[]
  top_k?: number
}): Promise<{ evidence: EvidencePoint[]; score: ScoreBreakdown }> {
  return fetchJson("/api/score", { method: "POST", body: JSON.stringify(body) })
}

export async function rewriteResume(body: {
  resume_id: string
  job_analysis_id: string
  selected_evidence: { evidence_id: string }[]
  options?: { tone?: "neutral" | "impactful" | "executive"; length?: "short" | "standard" | "detailed" }
}): Promise<{ optimized_resume: OptimizedResume }> {
  return fetchJson("/api/resumes/rewrite", { method: "POST", body: JSON.stringify(body) })
}

export async function rephraseBullet(body: {
  evidence_id: string
  target_keywords?: string[]
  style?: "concise" | "impactful" | "executive"
}): Promise<{ text: string }> {
  return fetchJson("/api/resumes/rephrase-bullet", { method: "POST", body: JSON.stringify(body) })
}

export { fetchJson }
