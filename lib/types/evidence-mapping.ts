export interface EvidenceMapping {
  requirement: string
  type: "must_have" | "preferred" | "key_requirement"
  evidence: Array<{
    text: string
    score: number
    metadata?: Record<string, any>
  }>
  confidence: "exact" | "partial" | "missing"
  gaps: string
  recommendedKeywords: string[]
}

