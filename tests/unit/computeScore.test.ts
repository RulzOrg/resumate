import { describe, it, expect } from 'vitest'
import { computeScore, type EvidencePoint } from '@/lib/match'
import type { JobAnalysis } from '@/lib/db'

function job(overrides: Partial<JobAnalysis> = {}): JobAnalysis {
  return {
    id: 'ja1', user_id: 'u1', job_title: 'Senior Engineer', job_description: 'desc',
    analysis_result: { keywords: [], required_skills: [], preferred_skills: [], experience_level: 'senior', key_requirements: [], nice_to_have: [], company_culture: [], benefits: [] },
    keywords: [], required_skills: [], preferred_skills: [], created_at: '', updated_at: '', ...overrides,
  } as any
}

describe('computeScore', () => {
  it('no evidence yields zeros and missing must-haves', () => {
    const j = job({ required_skills: ['A', 'B'] })
    const out = computeScore(j, [])
    expect(out.overall).toBeTypeOf('number')
    expect(out.dimensions.skills).toBe(0)
    expect(out.missingMustHaves).toEqual(['A','B'])
  })

  it('partial coverage reflects in skills/responsibilities', () => {
    const j = job({ required_skills: ['A','B','C'], analysis_result: { ...(job().analysis_result as any), key_requirements: ['R1','R2'] } as any })
    const ev: EvidencePoint[] = [
      { id: '1', text: 'Did A and R1 successfully' },
    ]
    const out = computeScore(j, ev)
    expect(out.dimensions.skills).toBeGreaterThan(0)
    expect(out.dimensions.skills).toBeLessThan(100)
    expect(out.dimensions.responsibilities).toBeGreaterThan(0)
  })

  it('full coverage approaches 100 for skills/responsibilities', () => {
    const j = job({ required_skills: ['A','B'], analysis_result: { ...(job().analysis_result as any), key_requirements: ['R1'] } as any })
    const ev: EvidencePoint[] = [
      { id: '1', text: 'Delivered A, B; handled R1' },
    ]
    const out = computeScore(j, ev)
    expect(out.dimensions.skills).toBe(100)
    expect(out.dimensions.responsibilities).toBe(100)
  })
})
