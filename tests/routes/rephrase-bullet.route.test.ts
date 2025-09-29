import { describe, it, expect, vi } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId: 'u1' })) }))
vi.mock('@/lib/db', async () => ({
  getOrCreateUser: vi.fn(async () => ({ id: 'u1' })),
  getUserResumes: vi.fn(async () => ([])),
}))
vi.mock('@/lib/qdrant', async () => ({
  qdrant: { retrieve: vi.fn(async () => ([{ id: 'u1:e1', payload: { userId: 'u1', evidence_id: 'e1', text: 'Improved performance by 20%' } }])) },
  QDRANT_COLLECTION: 'resume_bullets'
}))
vi.mock('ai', async () => ({ generateText: vi.fn(async () => ({ text: 'Boosted performance by 20% through X' })) }))

describe('/api/resumes/rephrase-bullet route', () => {
  it('returns rephrased text', async () => {
    const mod = await import('@/app/api/resumes/rephrase-bullet/route')
    const body = { evidence_id: 'e1', style: 'concise' }
    const req = new Request('http://localhost/api/resumes/rephrase-bullet', { method: 'POST', body: JSON.stringify(body) }) as any
    const resp = await mod.POST(req)
    const json = await resp.json()
    expect(resp.status).toBe(200)
    expect(typeof json.text).toBe('string')
    expect(json.text.length).toBeGreaterThan(0)
  })
})
