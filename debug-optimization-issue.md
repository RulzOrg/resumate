# Debug: AI Score Consistency Issue

## Problem Statement
AI scores are the same for all job descriptions analyzed, suggesting hardcoded or mock data.

## Root Cause Analysis

### 1. Scoring Algorithm Issues
**Location**: `lib/match.ts` - `computeScore()` function

**Issues Found**:
- Uses simple regex pattern matching instead of semantic AI analysis
- Relies on exact keyword matches (case-insensitive string search)
- Seniority scoring uses hardcoded heuristics
- Fixed weight distributions even with dynamic adjustments

**Evidence**:
```typescript
// Line 139-145: Simple tokenization and regex matching
const includesWhole = (needle: string, hay: string) => {
  const n = tok(needle)
  const h = tok(hay)
  const re = new RegExp(...)
  return re.test(h)
}

// Line 182-188: Hardcoded seniority scoring
let seniorScore = 30  // Base score
if (seniorTerms.some((k) => level.includes(k))) seniorScore += 35  // Fixed increment
if (hasYears) seniorScore += 20  // Fixed increment
if (hasLeadVerbs) seniorScore += 15  // Fixed increment
```

### 2. Qdrant Vector Search Issues
**Location**: `app/api/score/route.ts`

**Issues Found**:
- Graceful degradation when Qdrant is unavailable returns empty evidence
- Empty evidence still produces scores (based on heuristics only)
- No warning to user when vector search fails completely

**Evidence**:
```typescript
// Lines 54-67: Silent failure handling
try {
  evidence = await searchEvidence(user.id, derivedQueries, top_k)
  score = computeScore(analysis as any, evidence)
} catch (vectorError: any) {
  if (vectorError.message?.includes("ECONNREFUSED")) {
    // Returns empty evidence but continues
    evidence = []
    score = null
  }
}
```

### 3. Missing Resume Indexing
**Location**: Resume upload and indexing flow

**Issues Found**:
- Resume processing (Inngest job) extracts content but doesn't auto-index to Qdrant
- Manual API call required: `POST /api/index-resume`
- If not indexed, searches return empty results → consistent low scores

**Evidence**:
- `lib/inngest/functions/process-resume.ts` - No Qdrant indexing step
- `app/api/index-resume/route.ts` - Separate endpoint requiring manual trigger

## How This Causes Identical Scores

1. **Scenario 1: Qdrant Down**
   - Evidence search fails silently
   - Returns empty evidence array
   - computeScore() runs with no evidence
   - Produces score based only on hardcoded heuristics
   - Same resume → same heuristic-based score for any job

2. **Scenario 2: Resume Not Indexed**
   - Resume uploaded but not indexed to Qdrant
   - Evidence search finds no matches (userId filter returns empty)
   - Same as Scenario 1: hardcoded scores only

3. **Scenario 3: Poor Semantic Matching**
   - Even with working Qdrant, evidence search may return same bullets
   - If master resume is broad, similar evidence matches multiple jobs
   - computeScore() uses exact string matching, not semantic similarity
   - Different job requirements but overlapping keywords → similar scores

## Recommended Fixes

### Priority 1: Fix Scoring Algorithm
```typescript
// Replace heuristic scoring with AI-powered scoring
export async function computeScoreWithAI(
  jobProfile: JobAnalysis,
  evidence: EvidencePoint[],
  resumeText: string
): Promise<ScoreBreakdown> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: ScoreBreakdownSchema,
    prompt: `Analyze the resume evidence against job requirements...`
  })
  return object
}
```

### Priority 2: Add Qdrant Health Check
```typescript
// Add explicit warning when vector search is unavailable
if (evidence.length === 0 && derivedQueries.length > 0) {
  debugInfo.warning = 'Vector search returned no results - scores may be inaccurate'
  debugInfo.qdrantHealthy = false
}
```

### Priority 3: Auto-Index Resumes
```typescript
// In process-resume.ts, add indexing step after extraction
await step.run("index-to-qdrant", async () => {
  if (structured.experience?.length > 0) {
    const evidences = extractEvidencesFromStructured(structured)
    await indexEvidences(resumeId, userId, evidences)
  }
})
```

### Priority 4: Add Score Explanation
```typescript
// Return detailed score explanation to help debug
export interface ScoreBreakdown {
  overall: number
  dimensions: { ... }
  missingMustHaves: string[]
  // NEW FIELDS
  evidenceUsed: number  // How many evidence points contributed
  scoringMethod: 'ai' | 'heuristic' | 'hybrid'
  confidenceLevel: number  // 0-100
  warnings: string[]  // e.g., "Limited evidence available"
}
```

## Verification Steps

1. **Check if Qdrant is running**:
   ```bash
   curl http://localhost:6333/collections
   ```

2. **Check if resume is indexed**:
   ```bash
   curl -X POST http://localhost:3000/api/score \
     -H "Content-Type: application/json" \
     -d '{"job_analysis_id": "...", "resume_id": "..."}'
   # Check debug.evidenceCount in response
   ```

3. **Test with different job descriptions**:
   - Use drastically different roles (e.g., "Data Scientist" vs "Marketing Manager")
   - Check if scores differ significantly
   - If scores are within 5-10 points → confirms heuristic scoring issue

4. **Check database for indexed status**:
   ```sql
   SELECT id, title, processing_status, extracted_at 
   FROM resumes 
   WHERE user_id = '...'
   ```

## Next Steps

1. Confirm Qdrant is running and accessible
2. Verify resume has been indexed (processing_status = 'completed')
3. Test scoring with multiple diverse job descriptions
4. Implement AI-powered scoring to replace heuristics
5. Add auto-indexing to resume processing pipeline
