import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId: 'u1' })) }))
vi.mock('@/lib/db', async () => {
  return {
    getOrCreateUser: vi.fn(async () => ({ id: 'u1', clerk_user_id: 'u1', email: 'u@example.com', name: 'U' })),
    getJobAnalysisById: vi.fn(async () => ({ id: 'ja1', user_id: 'u1', required_skills: ['A'], keywords: ['K'], analysis_result: { key_requirements: ['R'] } })),
    getResumeById: vi.fn(async () => ({ id: 'r1', user_id: 'u1' })),
  }
})
vi.mock('@/lib/match', async () => ({
  searchEvidence: vi.fn(async () => ([{ id: 'u1:e1', text: 'A did R', metadata: { evidence_id: 'e1' }, score: 0.9 }])),
  computeScore: vi.fn(() => ({ overall: 80, dimensions: { skills: 80, responsibilities: 80, domain: 50, seniority: 60 }, missingMustHaves: [] })),
}))

describe('/api/score route', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  it('returns evidence and score', async () => {
    const mod = await import('@/app/api/score/route')
    const body = { job_analysis_id: 'ja1', resume_id: 'r1', top_k: 3 }
    const req = new Request('http://localhost/api/score', { method: 'POST', body: JSON.stringify(body) }) as any
    const resp = await mod.POST(req)
    const json = await resp.json()
    expect(resp.status).toBe(200)
    expect(json.evidence?.length).toBeGreaterThan(0)
    expect(json.score?.overall).toBe(80)
  })
})
