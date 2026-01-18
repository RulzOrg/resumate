# Resume Optimization Flow - Build Plan

## Overview

A comprehensive 4-step resume optimization flow that analyzes, rewrites, scans, and prepares users for interviews.

### Flow Steps
1. **Resume Analysis** - Match score, strengths, weaknesses, missing keywords
2. **Experience Rewrite** - X-Y-Z formula rewriting with editing capability
3. **ATS Scanner** - Section-by-section compatibility check
4. **Interview Prep** (Optional) - Technical questions + perfect answers

---

## Architecture Decision

### Route Structure
```
/dashboard/optimize-flow          → Main flow page
/api/optimize-flow/analyze        → Step 1 API
/api/optimize-flow/rewrite        → Step 2 API
/api/optimize-flow/ats-scan       → Step 3 API
/api/optimize-flow/interview-prep → Step 4 API
```

### Component Structure
```
components/optimize-flow/
├── OptimizeFlowWizard.tsx        → Main wizard container
├── StepIndicator.tsx             → Progress indicator (1-2-3-4)
├── steps/
│   ├── AnalysisStep.tsx          → Step 1 UI
│   ├── RewriteStep.tsx           → Step 2 UI
│   ├── ATSScanStep.tsx           → Step 3 UI
│   └── InterviewPrepStep.tsx     → Step 4 UI
├── results/
│   ├── AnalysisResults.tsx       → Score, strengths, weaknesses, keywords
│   ├── RewriteEditor.tsx         → Editable content with download
│   ├── ATSScanResults.tsx        → Section breakdown with risks/fixes
│   └── InterviewResults.tsx      → Q&A cards
└── shared/
    ├── ResumeSelector.tsx        → Dropdown for uploaded resumes
    └── JobDescriptionInput.tsx   → JD textarea with validation
```

---

## Phase Breakdown

### Phase 0: Foundation & Infrastructure
**Duration Estimate**: Foundation setup
**Dependencies**: None
**Can Parallelize**: Types/Schemas can be done parallel to page setup

#### Tasks

| Task ID | Description | Dependencies | Parallelizable With |
|---------|-------------|--------------|---------------------|
| P0-1 | Create `/app/dashboard/optimize-flow/page.tsx` route | None | P0-3, P0-4 |
| P0-2 | Create `OptimizeFlowWizard.tsx` container component | P0-1 | P0-3, P0-4 |
| P0-3 | Define TypeScript types in `lib/types/optimize-flow.ts` | None | P0-1, P0-2, P0-4 |
| P0-4 | Create Zod schemas in `lib/schemas/optimize-flow.ts` | None | P0-1, P0-2, P0-3 |
| P0-5 | Create `StepIndicator.tsx` component | P0-2 | None |

#### Type Definitions (P0-3)
```typescript
// lib/types/optimize-flow.ts

export interface OptimizeFlowState {
  currentStep: 1 | 2 | 3 | 4;
  resumeId: string | null;
  jobDescription: string;
  jobTitle: string;
  companyName: string;

  // Step 1 Results
  analysisResult: AnalysisResult | null;

  // Step 2 Results
  rewriteResult: RewriteResult | null;
  editedContent: EditedContent | null;

  // Step 3 Results
  atsScanResult: ATSScanResult | null;

  // Step 4 Results
  interviewPrepResult: InterviewPrepResult | null;
}

export interface AnalysisResult {
  matchScore: number; // 0-100
  strongFitReasons: string[]; // 5 reasons
  holdingBackReasons: string[]; // up to 5 reasons
  missingKeywords: string[]; // top 5 keywords
  rawAnalysis?: string; // full LLM response for debugging
}

export interface RewriteResult {
  professionalSummary: string;
  workExperiences: RewrittenExperience[];
  keywordsAdded: string[];
}

export interface RewrittenExperience {
  company: string;
  title: string;
  duration: string;
  originalBullets: string[];
  rewrittenBullets: string[]; // X-Y-Z formula applied
  keywordsAdded: string[];
}

export interface EditedContent {
  professionalSummary: string;
  workExperiences: RewrittenExperience[];
}

export interface ATSScanResult {
  overallScore: number;
  sections: ATSSectionResult[];
  criticalIssues: ATSIssue[];
  warnings: ATSIssue[];
  recommendations: string[];
}

export interface ATSSectionResult {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  risk: string;
  fix: string;
  details: string;
}

export interface ATSIssue {
  section: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  fix: string;
}

export interface InterviewPrepResult {
  questions: InterviewQuestion[];
}

export interface InterviewQuestion {
  question: string;
  difficulty: 'hard' | 'very_hard' | 'expert';
  category: string; // e.g., "Technical", "Behavioral", "Situational"
  perfectAnswer: string;
  keyPoints: string[];
  relatedExperience: string; // from user's resume
}
```

---

### Phase 1: Resume Analysis (Step 1)
**Dependencies**: Phase 0 complete
**Can Parallelize**: UI (P1-1, P1-4) can be done parallel to API (P1-2, P1-3)

#### Tasks

| Task ID | Description | Dependencies | Parallelizable With |
|---------|-------------|--------------|---------------------|
| P1-1 | Build `AnalysisStep.tsx` - Resume selector + JD input | P0-2 | P1-2, P1-3 |
| P1-2 | Create `/api/optimize-flow/analyze/route.ts` | P0-4 | P1-1, P1-4 |
| P1-3 | Write analysis LLM prompt in `lib/prompts/analyze-resume.ts` | None | P1-1, P1-4 |
| P1-4 | Build `AnalysisResults.tsx` - Score + lists display | P0-3 | P1-2, P1-3 |

#### LLM Prompt Template (P1-3)
```typescript
// lib/prompts/analyze-resume.ts

export const ANALYZE_RESUME_PROMPT = `
You are a senior recruiter with 15+ years of experience analyzing resumes against job descriptions.

## Task
Analyze the following resume against the job description and provide:
1. A match score out of 100
2. Exactly 5 reasons why this candidate is a strong fit
3. Up to 5 reasons what's holding them back (relative to the JD)
4. Top 5 missing keywords that should be added

## Resume
{resume_text}

## Job Description
{job_description}

## Scoring Guidelines
- 90-100: Exceptional match, candidate exceeds most requirements
- 80-89: Strong match, meets most key requirements
- 70-79: Good match, meets core requirements with some gaps
- 60-69: Moderate match, significant gaps but transferable skills
- Below 60: Weak match, major requirements not met

## Response Format (JSON)
{
  "matchScore": <number 0-100>,
  "strongFitReasons": [
    "<reason 1>",
    "<reason 2>",
    "<reason 3>",
    "<reason 4>",
    "<reason 5>"
  ],
  "holdingBackReasons": [
    "<reason 1 - most critical>",
    // ... up to 5 reasons, fewer if candidate is strong
  ],
  "missingKeywords": [
    "<keyword 1 - highest priority>",
    "<keyword 2>",
    "<keyword 3>",
    "<keyword 4>",
    "<keyword 5>"
  ]
}

Ensure reasons are specific, actionable, and directly tied to the job description requirements.
`;
```

#### UI Design (P1-4) - Analysis Results
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐                                    │
│  │     Match Score     │                                    │
│  │        ┌───┐        │                                    │
│  │       /     \       │     Resume Analysis Complete       │
│  │      │  78   │      │     ─────────────────────────      │
│  │       \     /       │     "Senior Developer" at Acme     │
│  │        └───┘        │                                    │
│  │   Good Match ✓      │                                    │
│  └─────────────────────┘                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Why You're a Strong Fit                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • 5+ years of React experience matches requirement  │   │
│  │ • Led team of 4 developers, shows leadership       │   │
│  │ • TypeScript expertise mentioned throughout        │   │
│  │ • Previous startup experience relevant to culture  │   │
│  │ • Strong communication skills from client work     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ What's Holding You Back                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • No AWS/cloud infrastructure experience listed    │   │
│  │ • Missing CI/CD pipeline experience               │   │
│  │ • GraphQL not mentioned (required in JD)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🔑 Top Missing Keywords to Add                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [AWS]  [GraphQL]  [CI/CD]  [Docker]  [Kubernetes] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              ┌────────────────────────────┐                │
│              │  Continue to Rewrite →     │                │
│              └────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 2: Experience Rewrite (Step 2)
**Dependencies**: Phase 1 complete (needs analysis results)
**Can Parallelize**: UI components can be built parallel to API

#### Tasks

| Task ID | Description | Dependencies | Parallelizable With |
|---------|-------------|--------------|---------------------|
| P2-1 | Create `/api/optimize-flow/rewrite/route.ts` | P0-4, P1-2 | P2-3 |
| P2-2 | Write X-Y-Z formula LLM prompt in `lib/prompts/rewrite-experience.ts` | None | P2-1, P2-3 |
| P2-3 | Build `RewriteStep.tsx` - Main step container | P0-2 | P2-1, P2-2 |
| P2-4 | Build `RewriteEditor.tsx` - Editable sections | P2-3 | None |
| P2-5 | Integrate with existing DOCX export (`lib/export/docx-generator.ts`) | P2-4 | None |

#### LLM Prompt Template (P2-2)
```typescript
// lib/prompts/rewrite-experience.ts

export const REWRITE_EXPERIENCE_PROMPT = `
You are an expert resume writer who specializes in the Google X-Y-Z bullet point formula.

## The X-Y-Z Formula
"Accomplished [X] as measured by [Y], by doing [Z]"
- X = What you accomplished (the result)
- Y = How it was measured (quantifiable metric)
- Z = How you did it (the action/method)

## Task
Rewrite the following resume sections to:
1. Naturally incorporate these missing keywords: {missing_keywords}
2. Apply the X-Y-Z formula to all bullet points
3. Align content with the target job description
4. Maintain authenticity - don't add skills/experiences not present

## Current Resume
{resume_text}

## Job Description
{job_description}

## Analysis Context
- Match Score: {match_score}/100
- Strengths: {strengths}
- Gaps: {weaknesses}

## Response Format (JSON)
{
  "professionalSummary": "<rewritten summary incorporating keywords naturally>",
  "workExperiences": [
    {
      "company": "<company name>",
      "title": "<job title>",
      "duration": "<dates>",
      "originalBullets": ["<original bullet 1>", ...],
      "rewrittenBullets": ["<X-Y-Z bullet 1>", "<X-Y-Z bullet 2>", ...],
      "keywordsAdded": ["<keyword1>", "<keyword2>"]
    }
  ],
  "keywordsAdded": ["<all keywords successfully added>"]
}

## Guidelines
- Each bullet should start with a strong action verb
- Include at least one metric per bullet when possible
- If no metric exists, use qualitative measures (e.g., "significantly improved")
- Keep bullets 1-2 lines maximum
- Preserve original meaning while enhancing impact
`;
```

#### UI Design (P2-4) - Rewrite Editor
```
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Rewrite Your Experience                           │
│  ─────────────────────────────────────────────────────────  │
│  Your resume has been rewritten using the X-Y-Z formula    │
│  to better match the job description.                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📝 Professional Summary                          [Edit]    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Results-driven Senior Developer with 5+ years of    │   │
│  │ experience building scalable React applications.    │   │
│  │ Proven track record of leading teams and delivering │   │
│  │ high-impact features using TypeScript and GraphQL.  │   │
│  └─────────────────────────────────────────────────────┘   │
│  Keywords added: [GraphQL] [TypeScript]                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💼 Work Experience                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ACME CORP • Senior Developer • 2021 - Present       │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │                                                      │   │
│  │ Original → Rewritten                                │   │
│  │                                                      │   │
│  │ ○ "Worked on React applications"                    │   │
│  │   ↓                                                 │   │
│  │ ● "Increased user engagement by 40% by developing   │   │
│  │    3 customer-facing React applications using       │   │
│  │    TypeScript and GraphQL"                [Edit]    │   │
│  │                                                      │   │
│  │ ○ "Led development team"                            │   │
│  │   ↓                                                 │   │
│  │ ● "Reduced deployment time by 60% by implementing   │   │
│  │    CI/CD pipelines and leading a team of 4          │   │
│  │    developers in agile practices"         [Edit]    │   │
│  │                                                      │   │
│  │ Keywords added: [CI/CD] [GraphQL]                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ BETA INC • Developer • 2019 - 2021                  │   │
│  │ ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Keywords Successfully Added: 5/5                       │
│  [AWS ✓] [GraphQL ✓] [CI/CD ✓] [Docker ✓] [TypeScript ✓]  │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────┐   │
│  │  ↓ Download     │    │  Continue to ATS Scan →     │   │
│  └─────────────────┘    └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 3: ATS Scanner (Step 3)
**Dependencies**: Phase 2 complete (scans rewritten resume)
**Can Parallelize**: Can reuse existing ATS checker logic

#### Tasks

| Task ID | Description | Dependencies | Parallelizable With |
|---------|-------------|--------------|---------------------|
| P3-1 | Create `/api/optimize-flow/ats-scan/route.ts` | P0-4 | P3-3 |
| P3-2 | Adapt `lib/ats-checker/` for in-flow context | P3-1 | P3-3 |
| P3-3 | Build `ATSScanStep.tsx` - Main container | P0-2 | P3-1, P3-2 |
| P3-4 | Build `ATSScanResults.tsx` - Section breakdown UI | P3-3 | None |

#### API Integration (P3-1)
```typescript
// Reuse existing ATS checker modules:
// - lib/ats-checker/content-checks.ts
// - lib/ats-checker/section-checks.ts
// - lib/ats-checker/essentials-checks.ts
// - lib/ats-checker/scoring.ts

// New: Add scanning of rewritten content specifically
// Focus output on sections with issues only
```

#### UI Design (P3-4) - ATS Scan Results
```
┌─────────────────────────────────────────────────────────────┐
│  Step 3: ATS Compatibility Scan                            │
│  ─────────────────────────────────────────────────────────  │
│  We've scanned your optimized resume for ATS compatibility │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐                                   │
│  │   ATS Score: 92/100 │   Excellent! Your resume is      │
│  │      ████████░░     │   highly ATS-compatible          │
│  └─────────────────────┘                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 Section-by-Section Breakdown                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ Contact Information                    Pass      │   │
│  │    ATS can read: Name, Email, Phone, LinkedIn      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ Professional Summary                   Pass      │   │
│  │    Good length (45 words), keywords present        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ Work Experience                       Warning    │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ Risk: Date format inconsistent (Jan 2021 vs 2021)  │   │
│  │ Fix: Use consistent format: "Jan 2021 - Present"   │   │
│  │                                         [Auto-Fix]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ Education                              Pass      │   │
│  │    Degree, institution, and graduation date found  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ Skills                                 Pass      │   │
│  │    12 skills detected, good keyword density        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ File Format                           Warning    │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ Risk: Some ATS struggle with certain PDF formats   │   │
│  │ Fix: Download as DOCX for maximum compatibility    │   │
│  │                                    [Download DOCX]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🎯 Summary: 2 warnings, 0 critical issues                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Continue to Interview Prep (Optional) →            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ✓ Complete & Download Final Resume                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 4: Interview Prep (Step 4 - Optional)
**Dependencies**: Phase 1 complete (uses analysis + JD)
**Can Parallelize**: Entirely independent after Phase 1

#### Tasks

| Task ID | Description | Dependencies | Parallelizable With |
|---------|-------------|--------------|---------------------|
| P4-1 | Create `/api/optimize-flow/interview-prep/route.ts` | P0-4 | P4-3 |
| P4-2 | Write interview LLM prompt in `lib/prompts/interview-prep.ts` | None | P4-1, P4-3 |
| P4-3 | Build `InterviewPrepStep.tsx` - Main container | P0-2 | P4-1, P4-2 |
| P4-4 | Build `InterviewResults.tsx` - Q&A cards | P4-3 | None |

#### LLM Prompt Template (P4-2)
```typescript
// lib/prompts/interview-prep.ts

export const INTERVIEW_PREP_PROMPT = `
You are a seasoned Hiring Manager preparing to interview a candidate for this specific role.

## Your Task
Based on the job description and candidate's resume:
1. Generate the 3 HARDEST technical questions you would ask
2. For each question, provide the perfect response tailored to the candidate's background

## Job Description
{job_description}

## Candidate's Resume
{resume_text}

## Job Title
{job_title}

## Company (if provided)
{company_name}

## Response Format (JSON)
{
  "questions": [
    {
      "question": "<the hard technical question>",
      "difficulty": "hard" | "very_hard" | "expert",
      "category": "<Technical/Behavioral/Situational/System Design>",
      "perfectAnswer": "<detailed, professional answer using candidate's experience>",
      "keyPoints": [
        "<key point 1 to hit>",
        "<key point 2 to hit>",
        "<key point 3 to hit>"
      ],
      "relatedExperience": "<specific experience from resume that supports this answer>"
    }
  ]
}

## Guidelines
- Questions should be specific to the role, not generic
- Perfect answers should reference actual experiences from the candidate's resume
- Include STAR format elements (Situation, Task, Action, Result) in answers
- Each answer should be 150-250 words
- Key points should be memorable talking points
- Difficulty should reflect real interview challenge level
`;
```

#### UI Design (P4-4) - Interview Prep Results
```
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Interview Preparation                             │
│  ─────────────────────────────────────────────────────────  │
│  Here are the 3 hardest questions a hiring manager would   │
│  ask, with perfect answers based on your experience.       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Question 1 of 3                          [Very Hard] 🔥🔥  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ "Describe a time when you had to make a critical    │   │
│  │  architectural decision under pressure. What was    │   │
│  │  your approach and what were the trade-offs?"       │   │
│  └─────────────────────────────────────────────────────┘   │
│  Category: System Design                                   │
│                                                             │
│  💡 Perfect Answer (based on your experience)              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ "At Acme Corp, we faced a critical decision when    │   │
│  │ our monolithic API couldn't handle Black Friday     │   │
│  │ traffic. With only 3 weeks before the event, I led  │   │
│  │ the team in evaluating our options...               │   │
│  │                                                      │   │
│  │ [Situation] Our API response times exceeded 5s      │   │
│  │ [Task] Improve performance by 80% in 3 weeks        │   │
│  │ [Action] Implemented caching layer + async queues   │   │
│  │ [Result] Reduced response time to 200ms, handled    │   │
│  │          3x expected traffic                        │   │
│  │                                                      │   │
│  │ The trade-off was increased infrastructure cost,    │   │
│  │ but the 40% revenue increase justified it."         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🎯 Key Points to Hit:                                     │
│  • Mention the specific performance metrics               │
│  • Highlight the team leadership aspect                   │
│  • Address trade-offs proactively                         │
│                                                             │
│  📄 Related Experience: "Senior Developer at Acme Corp    │
│     - Led team through critical scaling challenges"        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [← Previous]                              [Next →]        │
├─────────────────────────────────────────────────────────────┤
│  Question 2 of 3                               [Hard] 🔥   │
│  ...                                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ✓ Complete - Download All Materials                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 5: Polish & Integration
**Dependencies**: Phases 0-4 complete
**Can Parallelize**: Multiple tasks can run in parallel

#### Tasks

| Task ID | Description | Dependencies | Parallelizable With |
|---------|-------------|--------------|---------------------|
| P5-1 | Add ProcessingOverlay for each step | P1-4, P2-4, P3-4, P4-4 | P5-2, P5-3 |
| P5-2 | Implement error handling and retry logic | P1-2, P2-1, P3-1, P4-1 | P5-1, P5-3 |
| P5-3 | Add navigation link to dashboard sidebar | P0-1 | P5-1, P5-2 |
| P5-4 | End-to-end testing of complete flow | P5-1, P5-2, P5-3 | None |
| P5-5 | Usage tracking and analytics integration | P5-4 | None |

---

## Parallelization Matrix

```
Phase 0 (Foundation)
├── [P0-1, P0-2] Page & Wizard ────┐
├── [P0-3] Types ─────────────────├── Can run in parallel
└── [P0-4] Schemas ───────────────┘
    │
    ├── [P0-5] StepIndicator (depends on P0-2)
    │
    ▼
Phase 1 (Analysis)              Phase 4 (Interview) ◄── Can start after P0
├── [P1-1] AnalysisStep UI ──┐  ├── [P4-1] API ──────┐
├── [P1-2] API ──────────────├  ├── [P4-2] Prompt ───├── Parallel
├── [P1-3] Prompt ───────────┤  └── [P4-3] UI ───────┘
└── [P1-4] Results UI ───────┘      │
    │                               └── [P4-4] Results (depends on P4-3)
    ▼
Phase 2 (Rewrite) ◄── Sequential dependency on Phase 1
├── [P2-1] API ──────────────┐
├── [P2-2] Prompt ───────────├── Parallel
└── [P2-3] RewriteStep UI ───┘
    │
    └── [P2-4] Editor (depends on P2-3)
        │
        └── [P2-5] Export (depends on P2-4)
    │
    ▼
Phase 3 (ATS Scan) ◄── Sequential dependency on Phase 2
├── [P3-1] API ──────────────┐
├── [P3-2] Adapt checker ────├── Parallel
└── [P3-3] ATSScanStep UI ───┘
    │
    └── [P3-4] Results (depends on P3-3)
    │
    ▼
Phase 5 (Polish)
├── [P5-1] Loading states ───┐
├── [P5-2] Error handling ───├── Parallel
└── [P5-3] Navigation ───────┘
    │
    └── [P5-4] E2E Testing (sequential)
        │
        └── [P5-5] Analytics (sequential)
```

---

## Engineer/Agent Assignment Recommendation

### Team 1: Foundation & Infrastructure (Phase 0)
**Skills needed**: Next.js, TypeScript, Component architecture
**Deliverables**: Page route, wizard component, types, schemas

### Team 2: Analysis Feature (Phase 1)
**Skills needed**: React UI, API development, LLM prompting
**Deliverables**: Complete Step 1 functionality

### Team 3: Rewrite Feature (Phase 2)
**Skills needed**: React UI, Complex state management, Export integration
**Deliverables**: Complete Step 2 functionality

### Team 4: ATS Scanner Feature (Phase 3)
**Skills needed**: Integration work, existing codebase knowledge
**Deliverables**: Complete Step 3 functionality

### Team 5: Interview Prep Feature (Phase 4)
**Skills needed**: LLM prompting, UI design
**Deliverables**: Complete Step 4 functionality
**Note**: Can work in parallel with Teams 2-4 after Phase 1

### Team 6: Polish & QA (Phase 5)
**Skills needed**: Testing, error handling, polish
**Deliverables**: Production-ready flow

---

## Success Criteria

### Per-Step Acceptance Criteria

**Step 1 (Analysis)**:
- [ ] User can select uploaded resume from dropdown
- [ ] User can paste job description (min 50 chars)
- [ ] Analysis completes in < 10 seconds
- [ ] Match score displays with appropriate color coding
- [ ] 5 strengths always shown
- [ ] Up to 5 weaknesses shown (fewer if candidate is strong)
- [ ] 5 missing keywords displayed as chips/badges

**Step 2 (Rewrite)**:
- [ ] Professional summary rewritten and displayed
- [ ] All work experiences shown with before/after comparison
- [ ] Each bullet editable inline
- [ ] Keywords added clearly marked
- [ ] Download button generates valid DOCX
- [ ] Download button generates valid PDF

**Step 3 (ATS Scan)**:
- [ ] Overall ATS score displayed (0-100)
- [ ] Each resume section has pass/warning/fail status
- [ ] Warnings show specific risk and actionable fix
- [ ] Auto-fix buttons work where applicable
- [ ] DOCX download option for maximum compatibility

**Step 4 (Interview Prep)**:
- [ ] 3 hard technical questions generated
- [ ] Each question has difficulty indicator
- [ ] Perfect answers use STAR format
- [ ] Answers reference actual resume experience
- [ ] Key points clearly bulleted
- [ ] Navigation between questions works

### Overall Flow Criteria
- [ ] Smooth transitions between steps
- [ ] Progress indicator shows current step
- [ ] Can navigate back to previous steps
- [ ] Data persists across step navigation
- [ ] Loading states shown during API calls
- [ ] Errors handled gracefully with retry option
- [ ] Mobile responsive design
- [ ] Dark mode support

---

## File Structure Summary

```
app/
├── dashboard/
│   └── optimize-flow/
│       └── page.tsx                    # [P0-1]

components/
├── optimize-flow/
│   ├── OptimizeFlowWizard.tsx          # [P0-2]
│   ├── StepIndicator.tsx               # [P0-5]
│   ├── steps/
│   │   ├── AnalysisStep.tsx            # [P1-1]
│   │   ├── RewriteStep.tsx             # [P2-3]
│   │   ├── ATSScanStep.tsx             # [P3-3]
│   │   └── InterviewPrepStep.tsx       # [P4-3]
│   └── results/
│       ├── AnalysisResults.tsx         # [P1-4]
│       ├── RewriteEditor.tsx           # [P2-4]
│       ├── ATSScanResults.tsx          # [P3-4]
│       └── InterviewResults.tsx        # [P4-4]

app/api/
├── optimize-flow/
│   ├── analyze/
│   │   └── route.ts                    # [P1-2]
│   ├── rewrite/
│   │   └── route.ts                    # [P2-1]
│   ├── ats-scan/
│   │   └── route.ts                    # [P3-1]
│   └── interview-prep/
│       └── route.ts                    # [P4-1]

lib/
├── types/
│   └── optimize-flow.ts                # [P0-3]
├── schemas/
│   └── optimize-flow.ts                # [P0-4]
└── prompts/
    ├── analyze-resume.ts               # [P1-3]
    ├── rewrite-experience.ts           # [P2-2]
    └── interview-prep.ts               # [P4-2]
```

---

## Notes for Implementation

1. **Reuse existing components**: The codebase already has `ProcessingOverlay`, `ResumeSelector` patterns, and ATS checker logic that should be leveraged.

2. **Consistent styling**: Follow the existing Tailwind + Radix UI patterns. Use emerald for success, amber for warnings, red for errors.

3. **State persistence**: Consider using URL params or session storage to persist flow state across page refreshes.

4. **Error boundaries**: Wrap each step in error boundaries to prevent full-page crashes.

5. **Analytics**: Track funnel completion rates for each step to identify drop-off points.
