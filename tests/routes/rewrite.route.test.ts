import { describe, it, expect, vi } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId: 'u1' })) }))
vi.mock('@/lib/db', async () => ({
  getOrCreateUser: vi.fn(async () => ({ id: 'u1', clerk_user_id: 'u1', email: 'u@example.com', name: 'U', subscription_plan: 'free', subscription_status: 'free' })),
  getResumeById: vi.fn(async () => ({ id: 'r1', user_id: 'u1', parsed_sections: null })),
  getJobAnalysisById: vi.fn(async () => ({ id: 'ja1', user_id: 'u1', job_title: 'Role', company_name: 'Co', required_skills: [], preferred_skills: [], keywords: [], experience_level: 'senior', analysis_result: { key_requirements: [], keywords: [] } })),
  createOptimizedResume: vi.fn(async (d: any) => ({ id: 'opt1', ...d })),
  getUserById: vi.fn(async () => ({ id: 'u1' })),
  ensureUserSyncRecord: vi.fn(async () => ({})),
}))
vi.mock('@/lib/qdrant', async () => ({
  qdrant: { retrieve: vi.fn(async () => ([{ id: 'u1:e1', payload: { userId: 'u1', evidence_id: 'e1', text: 'Delivered X' } }])) },
  QDRANT_COLLECTION: 'resume_bullets'
}))
vi.mock('@/lib/error-handler', async (orig) => ({
  ...(await orig()),
  withRetry: async (fn: any) => fn(),
}))
vi.mock('ai', async () => ({ generateObject: vi.fn(async () => ({ object: {
  optimized_content: '# Resume', changes_made: [], keywords_added: [], skills_highlighted: [], sections_improved: [], match_score_before: 50, match_score_after: 80, recommendations: []
} })) }))

describe('/api/resumes/rewrite route', () => {
  it('rewrites using selected evidence', async () => {
    const mod = await import('@/app/api/resumes/rewrite/route')
    const body = { resume_id: 'r1', job_analysis_id: 'ja1', selected_evidence: [{ evidence_id: 'e1' }], options: { tone: 'neutral', length: 'standard' } }
    const req = new Request('http://localhost/api/resumes/rewrite', { method: 'POST', body: JSON.stringify(body) }) as any
    const resp = await mod.POST(req)
    const json = await resp.json()
    expect(resp.status).toBe(200)
    expect(json.optimized_resume?.optimized_content).toBe('# Resume')
  })
})
