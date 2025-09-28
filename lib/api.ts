type FetchOptions = RequestInit & { json?: Record<string, any> }

async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options
  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: json ? JSON.stringify(json) : rest.body,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (data as any)?.error || response.statusText
    const error = new Error(message)
    ;(error as any).status = response.status
    ;(error as any).body = data
    throw error
  }

  return data as T
}

export type IngestResumeRequest = {
  resume_id: string
}

export type IngestResumeResponse = {
  success: boolean
  resume_id: string
  parsed_sections: any
  raw_text: string | null
  metadata: Record<string, any>
}

export type IndexResumeRequest = {
  resume_id: string
  bullets: Array<{
    evidence_id: string
    text: string
    section?: string
    company?: string
    title?: string
    start_date?: string
    end_date?: string
    seniority?: string
    domain?: string
    skills?: string[]
    responsibilities?: string[]
    keywords?: string[]
  }>
}

export type IndexResumeResponse = {
  success: boolean
  indexed: number
}

export interface ScoreResponse {
  evidence: Array<{
    id: string
    text: string
    metadata?: Record<string, any>
    score?: number
  }>
  score: {
    overall: number
    dimensions: {
      skills: number
      responsibilities: number
      domain: number
      seniority: number
    }
    missingMustHaves: string[]
  }
}

export interface RewriteResponse {
  optimized_resume: {
    id: string
    optimized_content: string
    [key: string]: any
  }
}

export async function ingestResume(body: IngestResumeRequest): Promise<IngestResumeResponse> {
  return fetchJson<IngestResumeResponse>("/api/resumes/ingest", {
    method: "POST",
    json: body,
  })
}

export async function indexResume(body: IndexResumeRequest): Promise<IndexResumeResponse> {
  return fetchJson<IndexResumeResponse>("/api/resumes/index", {
    method: "POST",
    json: body,
  })
}

export async function scoreFit(params: {
  job_analysis_id: string
  resume_id?: string
  queries?: string[]
  top_k?: number
}) {
  return fetchJson<ScoreResponse>("/api/score", {
    method: "POST",
    json: params,
  })
}

export async function rewriteResume(params: {
  resume_id: string
  job_analysis_id: string
  selected_evidence: { evidence_id: string }[]
  options?: {
    tone?: "neutral" | "impactful" | "executive"
    length?: "short" | "standard" | "detailed"
  }
}) {
  return fetchJson<RewriteResponse>("/api/resumes/rewrite", {
    method: "POST",
    json: params,
  })
}

export async function rephraseBullet(params: {
  evidence_id: string
  target_keywords?: string[]
  style?: "concise" | "impactful" | "executive"
}) {
  return fetchJson<{ text: string }>("/api/resumes/rephrase-bullet", {
    method: "POST",
    json: params,
  })
}
