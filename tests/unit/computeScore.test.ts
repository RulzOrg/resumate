import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeScoreWithAI, type EvidencePoint } from '@/lib/match'
import type { JobAnalysis } from '@/lib/db'

// Mock the 'ai' module
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))

import { generateObject } from 'ai'

function job(overrides: Partial<JobAnalysis> = {}): JobAnalysis {
  return {
    id: 'ja1', user_id: 'u1', job_title: 'Senior Engineer', job_description: 'desc',
    analysis_result: { keywords: [], required_skills: [], preferred_skills: [], experience_level: 'senior', key_requirements: [], nice_to_have: [], company_culture: [], benefits: [] },
    keywords: [], required_skills: [], preferred_skills: [], created_at: '', updated_at: '', ...overrides,
  } as any
}

describe('computeScoreWithAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns zero score if no evidence provided', async () => {
    const j = job({ required_skills: ['A', 'B'] })
    const out = await computeScoreWithAI(j, [])
    expect(out.overall).toBe(0)
    expect(out.dimensions.skills).toBe(0)
    expect(out.missingMustHaves).toEqual(['A', 'B'])
    expect(generateObject).not.toHaveBeenCalled()
  })

  it('calls AI and returns parsed score when evidence exists', async () => {
    const j = job({ required_skills: ['React', 'Node'] })
    const ev: EvidencePoint[] = [
      { id: '1', text: 'I have 5 years of React experience' },
    ]

    const mockScore = {
      overall: 85,
      dimensions: {
        skills: 90,
        responsibilities: 80,
        domain: 70,
        seniority: 85
      },
      missingMustHaves: [],
      explanation: "Strong match"
    }

    // Mock the AI response
    vi.mocked(generateObject).mockResolvedValue({
      object: mockScore
    } as any)

    const out = await computeScoreWithAI(j, ev)

    expect(generateObject).toHaveBeenCalled()
    expect(out).toEqual(mockScore)
  })

  it('handles AI failure gracefully by returning zero', async () => {
    const j = job()
    const ev: EvidencePoint[] = [{ id: '1', text: 'some text' }]

    // Mock AI failure
    vi.mocked(generateObject).mockRejectedValue(new Error("AI Error"))

    const out = await computeScoreWithAI(j, ev)

    expect(out.overall).toBe(0)
    expect(out.explanation).toContain("unavailable")
  })
})
