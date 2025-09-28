export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    let errorBody: any
    try {
      errorBody = await response.json()
    } catch {
      // ignore
    }
    const message = errorBody?.error || response.statusText
    const error = new Error(message)
    ;(error as any).status = response.status
    ;(error as any).body = errorBody
    throw error
  }
  return (await response.json()) as T
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

export async function ingestResume(body: IngestResumeRequest): Promise<IngestResumeResponse> {
  return fetchJson<IngestResumeResponse>("/api/resumes/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export async function indexResume(body: IndexResumeRequest): Promise<IndexResumeResponse> {
  return fetchJson<IndexResumeResponse>("/api/resumes/index", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}
