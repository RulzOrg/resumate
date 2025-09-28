# API Routes (Section 4.8) — Implementation Guide

This guide details exactly what to add or wire to implement the endpoints proposed in Section 4.8 of the plan, mapped to the current codebase.

## Scope

Endpoints in 4.8:
- /api/ingest — DONE in repo as `app/api/resumes/ingest/route.ts` [1]
- /api/index-resume — DONE in repo as `app/api/resumes/index/route.ts` [2]
- /api/analyze-job — DONE in repo as `app/api/jobs/analyze/route.ts` [3]
- /api/score — TODO (new)
- /api/rewrite — PARTIAL (current: `POST /api/resumes/optimize`) [4]
- /api/rephrase-bullet — TODO (new)

Below are step-by-step instructions to add the remaining endpoints and align existing ones.

---

## 1) /api/score (NEW)

Purpose: Search Qdrant for best-matching resume evidence against a job profile and return a fit score + breakdown.

Recommended path: `app/api/score/route.ts`

Request schema:
```ts
const ScoreRequest = z.object({
  job_analysis_id: z.string(),
  // Optional: Score a specific resume’s evidence (e.g., ensure user context)
  resume_id: z.string().optional(),
  // Optional override: use custom queries instead of derived ones
  queries: z.array(z.string()).optional(),
  top_k: z.number().min(1).max(20).default(5),
})
```

Implementation outline:
- Auth with Clerk; resolve DB user (`getOrCreateUser`) [3].
- Fetch job analysis by id (you have helpers in `lib/db.ts`).
- Determine `queries`: if `queries` were not provided, derive from the analysis (e.g., `required_skills`, `key_requirements`, `keywords`).
- Call `searchEvidence(user.id, queries, top_k)` and `computeScore(jobAnalysis, evidence)` from `lib/match.ts` [8].
- Return `{ evidence, score }` where `score` is `ScoreBreakdown`.

Skeleton:
```ts
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { getOrCreateUser, getJobAnalysisById, getResumeById } from "@/lib/db"
import { searchEvidence, computeScore } from "@/lib/match"
import { AppError, handleApiError } from "@/lib/error-handler"

export const runtime = "nodejs"

const ScoreRequest = z.object({
  job_analysis_id: z.string(),
  resume_id: z.string().optional(),
  queries: z.array(z.string()).optional(),
  top_k: z.number().min(1).max(20).default(5),
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const user = await getOrCreateUser()
    if (!user) throw new AppError("User not found", 404)

    const { job_analysis_id, resume_id, queries, top_k } = ScoreRequest.parse(await req.json())
    const analysis = await getJobAnalysisById(job_analysis_id, user.id)
    if (!analysis) throw new AppError("Job analysis not found", 404)

    if (resume_id) {
      const resume = await getResumeById(resume_id, user.id)
      if (!resume) throw new AppError("Resume not found", 404)
    }

    const derived = queries && queries.length
      ? queries
      : [
          ...analysis.required_skills,
          ...analysis.analysis_result?.key_requirements || [],
          ...analysis.keywords,
        ].filter((s) => typeof s === 'string' && s.trim().length > 0)

    const evidence = await searchEvidence(user.id, derived, top_k)
    const score = computeScore(analysis, evidence)
    return NextResponse.json({ evidence, score })
  } catch (err) {
    const e = handleApiError(err)
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode })
  }
}
```

Notes:
- `searchEvidence` already filters by `userId` and uses Qdrant via the configured collection [8].
- Keep this route on Node runtime (it uses the Qdrant client and embeddings) [2][5].

---

## 2) /api/rewrite (ALIGN OR ADD)

Purpose: Generate an optimized resume from a selected set of verified evidence bullets. Enforce “evidence-only” rule.

Option A (recommended): Add a dedicated route at `app/api/resumes/rewrite/route.ts` to keep the current `POST /api/resumes/optimize` for the full optimization flow and use `/rewrite` for the strict evidence-gated rewrite.

Request schema:
```ts
const RewriteRequest = z.object({
  resume_id: z.string(),
  job_analysis_id: z.string(),
  selected_evidence: z.array(z.object({ evidence_id: z.string() })).min(1),
  options: z.object({
    tone: z.enum(["neutral","impactful","executive"]).default("neutral"),
    length: z.enum(["short","standard","detailed"]).default("standard"),
  }).optional(),
})
```

Implementation outline:
- Auth and ownership checks for `resume_id` and `job_analysis_id` [3][4].
- Resolve evidence text purely by `evidence_id` (prefer Qdrant by `id: userId:evidence_id`; fallback to `parsed_sections` if needed) [2][5][8].
- Validate that all submitted `evidence_id`s resolve; reject otherwise.
- Use OpenAI to generate structured optimization output with Zod schema (you already do this in `POST /api/resumes/optimize`) [4]. Keep the prompt strict: “Only use supplied evidence facts; do not invent claims.”
- Persist as an `optimized_resumes` record via existing helpers [4].
- Return the created optimized resume.

Skeleton (abbrev):
```ts
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
// ...auth + db imports

const optimizationSchema = z.object({
  optimized_content: z.string(),
  changes_made: z.array(z.string()),
  keywords_added: z.array(z.string()),
  skills_highlighted: z.array(z.string()),
  sections_improved: z.array(z.string()),
  match_score_before: z.number().min(0).max(100),
  match_score_after: z.number().min(0).max(100),
  recommendations: z.array(z.string()),
})

// POST handler
// 1) verify user + load resume + analysis
// 2) hydrate selected evidence → texts[]
// 3) generateObject({ model: openai("gpt-4o"), schema: optimizationSchema, prompt })
// 4) createOptimizedResume({ optimized_content, optimization_summary, ... })
// 5) return optimized
```

Notes:
- This route is a stricter variant of the existing `POST /api/resumes/optimize` [4]. It should fail fast if any `evidence_id` is unknown.

---

## 3) /api/rephrase-bullet (NEW)

Purpose: Controlled paraphrase of a single bullet to improve clarity or to include specific keywords without fabricating content.

Recommended path: `app/api/resumes/rephrase-bullet/route.ts`

Request schema:
```ts
const RephraseRequest = z.object({
  evidence_id: z.string(),
  target_keywords: z.array(z.string()).optional(),
  style: z.enum(["concise","impactful","executive"]).default("concise")
})
```

Implementation outline:
- Auth; ensure the bullet belongs to the current user (filter by `userId`) [5][8].
- Look up the bullet text by `evidence_id` (Qdrant `id = userId:evidence_id`) [2][5][8].
- Prompt OpenAI with strict guidance: “Preserve factual content; do not add claims; incorporate target keywords naturally if they fit.”
- Return `{ text: newBullet }` (no DB write needed unless you want a draft store).

Skeleton (abbrev):
```ts
// 1) auth + user
// 2) fetch bullet by id from Qdrant (or parsed_sections fallback)
// 3) generateText / generateObject to paraphrase
// 4) return { text }
```

---

## 4) Client API: lib/api.ts

Add typed client helpers for the new routes [7]:
- `scoreFit({ job_analysis_id, resume_id?, queries?, top_k? })`
- `rewriteResume({ resume_id, job_analysis_id, selected_evidence, options? })`
- `rephraseBullet({ evidence_id, target_keywords?, style? })`

These should follow the same `fetchJson<T>` pattern already used for `ingestResume` and `indexResume` [7].

---

## 5) UI Wiring

- Step 2 (evidence & scoring): call `scoreFit` to populate evidence lists, missing must-haves, and score breakdown [8][14].
- Bullet actions: add “Rephrase” to trigger `rephraseBullet` and replace local text in the editor/selection.
- Step 3 (rewrite): when the user selects evidence items, call `rewriteResume` to produce the optimized draft; keep the “evidence-only” constraint explicit [4][14].

---

## 6) Testing & Quality

- Unit tests: `computeScore` scenarios; schema guards for all new requests/responses [8].
- Integration tests: mock extractor/OpenAI/Qdrant for `/score`, `/rewrite`, `/rephrase-bullet`.
- Lint: `npm run lint` (fix existing hook dependency warnings before merge).

---

## Status Map (what’s already in the repo)

- Ingestion: `app/api/resumes/ingest/route.ts` — normalization, Zod validation, OCR metadata, `updateResumeAnalysis` [1][4].
- Indexing: `app/api/resumes/index/route.ts` — embeddings (OpenAI, 3072 dims), ensure Qdrant collection with cosine distance, upsert with `userId` filter [2][4][5].
- Analysis: `app/api/jobs/analyze/route.ts` — JSON-schema LLM output, opt-in scoring via `lib/match.ts` [3][8].
- Optimization: `app/api/resumes/optimize/route.ts` — optimization/generation with safe fallbacks and subscription checks [4].
- Embeddings: `lib/embeddings.ts` — uses `text-embedding-3-large`; returns vectors and exposes dimension 3072 [4].
- Qdrant: `lib/qdrant.ts` — client + constants; default collection `resume_bullets`; dimension `3072` [5].
- Matching: `lib/match.ts` — `searchEvidence` + `computeScore` with multi-tenancy filter and breakdown [8].
- Typed API base: `lib/api.ts` — `fetchJson`, `ingestResume`, `indexResume` [7].

---

## References

1. `app/api/resumes/ingest/route.ts`
2. `app/api/resumes/index/route.ts`
3. `app/api/jobs/analyze/route.ts`
4. `lib/embeddings.ts`
5. `lib/qdrant.ts`
6. `lib/error-handler.ts`
7. `lib/api.ts`
8. `lib/match.ts`
9. `components/dashboard/TargetJobsCompactList.tsx`
10. Pinecone Docs — text-embedding-3-large (3072 dims): https://docs.pinecone.io/models/text-embedding-3-large
11. Qdrant API Reference — Create collection (size, distance): https://api.qdrant.tech/api-reference/collections/create-collection
12. `components/dashboard/upload-resume-dialog.tsx`
13. `components/dashboard/MasterResumesSection.tsx`
14. `components/optimization/optimizer-ui-only.tsx`
