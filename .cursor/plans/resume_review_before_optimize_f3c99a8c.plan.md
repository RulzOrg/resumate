---
name: Resume Review Before Optimize
overview: Implement a review-and-confirm step where users can see and edit extracted work experience bullets and professional summary before optimization. This separates extraction from optimization and gives users control over what content gets optimized.
todos:
  - id: phase1-extract-api
    content: "[Phase 1] Create POST /api/resumes/extract-review endpoint"
    status: completed
  - id: phase1-extract-validation
    content: "[Phase 1] Add request validation and auth checks to extract-review"
    status: completed
  - id: phase1-extract-caching
    content: "[Phase 1] Integrate structure caching with saveParsedStructure"
    status: completed
  - id: phase2-dialog-component
    content: "[Phase 2] Create ReviewContentDialog component with dialog shell"
    status: completed
  - id: phase2-work-exp-editor
    content: "[Phase 2] Create WorkExperienceEditor sub-component for bullet editing"
    status: completed
  - id: phase2-summary-editor
    content: "[Phase 2] Add professional summary textarea to ReviewContentDialog"
    status: completed
  - id: phase2-dialog-actions
    content: "[Phase 2] Implement add/remove bullet and confirm/cancel actions"
    status: completed
  - id: phase3-optimize-schema
    content: "[Phase 3] Update optimize route to accept work_experience and summary params"
    status: completed
  - id: phase3-merge-structure
    content: "[Phase 3] Implement logic to merge confirmed content with cached structure"
    status: completed
  - id: phase3-backward-compat
    content: "[Phase 3] Ensure backward compatibility when params not provided"
    status: completed
  - id: phase4-form-state
    content: "[Phase 4] Add extractedContent and reviewDialogOpen state to QuickOptimizeForm"
    status: completed
  - id: phase4-extract-flow
    content: "[Phase 4] Modify handleSubmit to call extract-review API first"
    status: completed
  - id: phase4-confirm-handler
    content: "[Phase 4] Implement handleReviewConfirm to call optimize with confirmed data"
    status: completed
  - id: phase4-dialog-integration
    content: "[Phase 4] Integrate ReviewContentDialog into QuickOptimizeForm JSX"
    status: completed
  - id: phase5-error-handling
    content: "[Phase 5] Add error handling for extraction failures and empty content"
    status: completed
  - id: phase5-loading-states
    content: "[Phase 5] Add loading states for extraction step in UI"
    status: completed
---

# Resume Content Review Before Optimization

## Architecture Overview

```mermaid
sequenceDiagram
    participant User
    participant QuickOptimizeForm
    participant ExtractReviewAPI
    participant ReviewDialog
    participant OptimizeAPI
    participant LLM

    User->>QuickOptimizeForm: Fill job details, click Optimize
    QuickOptimizeForm->>ExtractReviewAPI: POST /api/resumes/extract-review
    ExtractReviewAPI->>LLM: Extract structure
    LLM-->>ExtractReviewAPI: Parsed resume
    ExtractReviewAPI-->>QuickOptimizeForm: work_experience, summary
    QuickOptimizeForm->>ReviewDialog: Open with extracted content
    User->>ReviewDialog: Review/Edit bullets and summary
    User->>ReviewDialog: Click Confirm
    ReviewDialog->>OptimizeAPI: POST /api/resumes/optimize (with confirmed content)
    OptimizeAPI->>LLM: Optimize confirmed content
    LLM-->>OptimizeAPI: Optimized content
    OptimizeAPI-->>User: Redirect to results
```



## Phase 1: Backend - Extract Review API (Independent)

Create a new API endpoint that extracts and returns work experience + summary for user review.**Files to create:**

- `app/api/resumes/extract-review/route.ts` - New endpoint

**Key implementation:**

- Reuse existing `extractResumeWithLLM` from [`lib/llm-resume-extractor.ts`](lib/llm-resume-extractor.ts)
- Return only `workExperience` array and `summary` string
- Cache extracted structure using existing `saveParsedStructure` from [`lib/db.ts`](lib/db.ts)

---

## Phase 2: Frontend - Review Dialog Component (Parallel with Phase 1)

Create a reusable dialog component for reviewing and editing extracted content.**Files to create:**

- `components/optimization/ReviewContentDialog.tsx` - Main dialog
- `components/optimization/WorkExperienceEditor.tsx` - Work experience editing sub-component

**Key features:**

- Display all work experience entries with editable bullet points
- Display editable professional summary (if present)
- Add/remove bullet points per work experience
- Validation before confirm (no empty bullets)

---

## Phase 3: Backend - Modify Optimize API (Depends on Phase 1)

Modify existing optimize endpoint to accept pre-confirmed work experience and summary.**Files to modify:**

- [`app/api/resumes/optimize/route.ts`](app/api/resumes/optimize/route.ts)

**Key changes:**

- Accept optional `work_experience` and `summary` fields in request body
- If provided, merge with cached/extracted structure (keep contact, education, skills, etc.)
- If not provided, fall back to existing extraction flow (backward compatible)

---

## Phase 4: Frontend - QuickOptimizeForm Integration (Depends on Phase 1, 2, 3)

Modify the optimize form to use the new two-step flow.**Files to modify:**

- [`components/dashboard/QuickOptimizeForm.tsx`](components/dashboard/QuickOptimizeForm.tsx)

**Key changes:**

- Add state for extracted content and review dialog
- Change submit handler to call extract-review first
- Open review dialog with extracted content
- Handle confirm callback to call optimize with confirmed content

---

## Phase 5: Testing and Error Handling (Sequential after Phase 4)

Ensure robust error handling and test the complete flow.**Files to modify:**

- All files from previous phases (error handling improvements)