# ATS Resume Checker - Build Plan

## Overview

Build a comprehensive ATS (Applicant Tracking System) Resume Checker that analyzes resumes for ATS compatibility and provides actionable recommendations. Inspired by Enhancv and Teal's resume checkers.

---

## Core Features

### 1. Score Dashboard
- **Overall Score** (0-100) with color-coded indicator (green: 80+, yellow: 60-79, red: <60)
- **Issue Counter** showing total issues found
- **Category Scores** with percentage and expandable details:
  - CONTENT (40% weight)
  - SECTIONS (20% weight)
  - ATS ESSENTIALS (25% weight)
  - TAILORING (15% weight) - requires job description

### 2. Processing Animation
Four-step loading state with checkmarks:
1. Parsing your resume
2. Analyzing your experience
3. Extracting your skills
4. Generating recommendations

### 3. Category Analysis

#### CONTENT Category
| Check | Description | Weight |
|-------|-------------|--------|
| ATS Parse Rate | % of content successfully parsed | 25% |
| Quantifying Impact | Metrics & numbers in achievements | 25% |
| Repetition | Duplicate words/phrases detection | 25% |
| Spelling & Grammar | Error detection | 25% |

#### SECTIONS Category
| Check | Description | Weight |
|-------|-------------|--------|
| Contact Information | Name, email, phone present | 20% |
| Work Experience | Has experience section | 25% |
| Education | Has education section | 20% |
| Skills | Has skills section | 20% |
| Summary/Objective | Has summary section | 15% |

#### ATS ESSENTIALS Category
| Check | Description | Weight |
|-------|-------------|--------|
| File Format | PDF or DOCX compatibility | 20% |
| Standard Headings | Uses recognizable section headers | 20% |
| No Tables/Columns | Simple formatting check | 20% |
| No Images/Graphics | Text-only content | 15% |
| Font Compatibility | Standard fonts used | 15% |
| Date Formatting | Consistent date formats | 10% |

#### TAILORING Category (when job description provided)
| Check | Description | Weight |
|-------|-------------|--------|
| Hard Skills Match | Technical skills alignment | 35% |
| Soft Skills Match | Interpersonal skills alignment | 25% |
| Job Title Match | Title relevance | 20% |
| Keyword Density | Relevant keywords found | 20% |

---

## Technical Architecture

### Database Schema

```sql
-- New table for ATS check results
CREATE TABLE ats_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  resume_id UUID REFERENCES resumes(id),

  -- Overall scores
  overall_score INTEGER NOT NULL,
  content_score INTEGER NOT NULL,
  sections_score INTEGER NOT NULL,
  essentials_score INTEGER NOT NULL,
  tailoring_score INTEGER,

  -- Issue counts
  total_issues INTEGER NOT NULL,
  high_severity_issues INTEGER NOT NULL,
  medium_severity_issues INTEGER NOT NULL,
  low_severity_issues INTEGER NOT NULL,

  -- Detailed analysis (JSONB)
  content_analysis JSONB NOT NULL,
  sections_analysis JSONB NOT NULL,
  essentials_analysis JSONB NOT NULL,
  tailoring_analysis JSONB,

  -- Metadata
  job_description TEXT,
  job_title TEXT,
  company_name TEXT,
  parse_rate DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ats_checks_user ON ats_checks(user_id);
CREATE INDEX idx_ats_checks_resume ON ats_checks(resume_id);
```

### API Routes

```
POST /api/ats-check              - Run ATS check on uploaded resume
POST /api/ats-check/with-job     - Run ATS check with job description
GET  /api/ats-check/[id]         - Get ATS check results
GET  /api/ats-check/history      - Get user's check history
```

### Zod Schemas

```typescript
// lib/schemas/ats-check.ts

const IssueSchema = z.object({
  id: z.string(),
  category: z.enum(['content', 'sections', 'essentials', 'tailoring']),
  subcategory: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  location: z.string().optional(), // e.g., "Work Experience > Company A"
});

const SubcategoryAnalysisSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  status: z.enum(['pass', 'warning', 'fail']),
  issueCount: z.number(),
  details: z.string(),
});

const CategoryAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  subcategories: z.array(SubcategoryAnalysisSchema),
  issues: z.array(IssueSchema),
});

const ATSCheckResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  totalIssues: z.number(),
  parseRate: z.number().min(0).max(100),
  content: CategoryAnalysisSchema,
  sections: CategoryAnalysisSchema,
  essentials: CategoryAnalysisSchema,
  tailoring: CategoryAnalysisSchema.optional(),
  recommendations: z.array(z.object({
    priority: z.enum(['high', 'medium', 'low']),
    title: z.string(),
    description: z.string(),
  })),
});
```

---

## Component Structure

```
components/
├── ats-checker/
│   ├── ATSCheckerPage.tsx           # Main page component
│   ├── ResumeUploader.tsx           # Upload interface
│   ├── ProcessingAnimation.tsx      # 4-step loading animation
│   ├── ScoreCard.tsx                # Left sidebar with scores
│   │   ├── OverallScore.tsx         # Circular/semi-circular score
│   │   ├── CategoryScore.tsx        # Expandable category row
│   │   └── UnlockButton.tsx         # CTA for full report
│   ├── ResultsPanel.tsx             # Right panel with details
│   │   ├── CategorySection.tsx      # Expandable category accordion
│   │   ├── IssueCard.tsx            # Individual issue display
│   │   ├── SubcategoryItem.tsx      # e.g., "ATS Parse Rate"
│   │   └── ParseRateVisual.tsx      # Progress bar for parse rate
│   ├── JobDescriptionInput.tsx      # Optional JD for tailoring
│   └── FullReportModal.tsx          # Premium full report view
```

---

## Implementation Phases

### Phase 1: Core Analysis Engine
**Files to create/modify:**

1. `lib/ats-checker/index.ts` - Main orchestration
2. `lib/ats-checker/content-analyzer.ts` - Content analysis
3. `lib/ats-checker/sections-analyzer.ts` - Section detection
4. `lib/ats-checker/essentials-analyzer.ts` - ATS compatibility
5. `lib/ats-checker/tailoring-analyzer.ts` - Job matching
6. `lib/ats-checker/scoring.ts` - Score calculation
7. `lib/ats-checker/types.ts` - TypeScript types
8. `lib/schemas/ats-check.ts` - Zod schemas

**Key functions:**
```typescript
// Main entry point
async function runATSCheck(
  resumeText: string,
  parsedResume: ParsedResume,
  jobDescription?: string
): Promise<ATSCheckResult>

// Content analysis
async function analyzeContent(
  resumeText: string,
  parsedResume: ParsedResume
): Promise<ContentAnalysis>

// Sections analysis
function analyzeSections(
  parsedResume: ParsedResume
): SectionsAnalysis

// ATS essentials check
function analyzeEssentials(
  resumeText: string,
  fileType: string
): EssentialsAnalysis

// Tailoring analysis (requires job description)
async function analyzeTailoring(
  parsedResume: ParsedResume,
  jobDescription: string
): Promise<TailoringAnalysis>
```

### Phase 2: API Layer
**Files to create:**

1. `app/api/ats-check/route.ts` - POST handler
2. `app/api/ats-check/[id]/route.ts` - GET handler
3. `app/api/ats-check/with-job/route.ts` - POST with JD

### Phase 3: UI Components
**Files to create:**

1. `app/ats-checker/page.tsx` - Main page
2. `components/ats-checker/*.tsx` - All UI components
3. `app/ats-checker/layout.tsx` - Page layout

### Phase 4: Integration & Polish
- Connect to existing upload flow
- Add to dashboard navigation
- Rate limiting for free tier
- Full report behind paywall (optional)

---

## Analysis Logic Details

### Content Analysis

#### ATS Parse Rate
```typescript
function calculateParseRate(resumeText: string, parsedResume: ParsedResume): number {
  // Calculate what % of resume was successfully parsed into structured sections
  const totalTextLength = resumeText.length;

  let parsedLength = 0;
  parsedLength += parsedResume.contact.name?.length || 0;
  parsedLength += parsedResume.contact.email?.length || 0;
  parsedLength += parsedResume.summary?.length || 0;
  parsedLength += parsedResume.workExperience.reduce((acc, exp) =>
    acc + exp.bullets.join(' ').length + (exp.company?.length || 0), 0);
  parsedLength += parsedResume.education.reduce((acc, edu) =>
    acc + (edu.institution?.length || 0) + (edu.degree?.length || 0), 0);
  parsedLength += parsedResume.skills.join(' ').length;

  return Math.min(100, Math.round((parsedLength / totalTextLength) * 100 * 1.2));
}
```

#### Quantifying Impact
```typescript
function analyzeQuantification(bullets: string[]): QuantificationAnalysis {
  const patterns = [
    /\d+%/,           // percentages
    /\$[\d,]+/,       // dollar amounts
    /\d+x/i,          // multipliers
    /\d+\+?/,         // numbers
    /increased|decreased|improved|reduced|grew|saved/i, // impact verbs
  ];

  let bulletsWithMetrics = 0;
  const issueLocations: string[] = [];

  bullets.forEach((bullet, idx) => {
    const hasMetric = patterns.some(p => p.test(bullet));
    if (hasMetric) bulletsWithMetrics++;
    else issueLocations.push(`Bullet ${idx + 1}`);
  });

  return {
    score: Math.round((bulletsWithMetrics / bullets.length) * 100),
    bulletsWithMetrics,
    totalBullets: bullets.length,
    issueLocations,
  };
}
```

#### Repetition Detection
```typescript
function detectRepetition(text: string): RepetitionAnalysis {
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const wordCounts: Record<string, number> = {};

  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  const overusedWords = Object.entries(wordCounts)
    .filter(([word, count]) => count > 3 && !commonWords.includes(word))
    .map(([word, count]) => ({ word, count }));

  return {
    score: Math.max(0, 100 - overusedWords.length * 10),
    overusedWords,
    issueCount: overusedWords.length,
  };
}
```

#### Spelling & Grammar (AI-assisted)
```typescript
async function checkSpellingGrammar(text: string): Promise<SpellingGrammarAnalysis> {
  // Use LLM to identify issues
  const result = await callJsonModel(`
    Analyze this resume text for spelling and grammar issues.
    Only flag clear errors, not stylistic choices.

    Text: ${text.slice(0, 5000)}

    Return:
    - issues: array of {text, suggestion, location}
    - overallQuality: 0-100 score
  `, SpellingGrammarSchema);

  return result;
}
```

### Sections Analysis

```typescript
function analyzeSections(parsed: ParsedResume): SectionsAnalysis {
  const checks = {
    contact: {
      name: 'Contact Information',
      hasSection: !!(parsed.contact.name || parsed.contact.email || parsed.contact.phone),
      details: {
        hasName: !!parsed.contact.name,
        hasEmail: !!parsed.contact.email,
        hasPhone: !!parsed.contact.phone,
        hasLocation: !!parsed.contact.location,
        hasLinkedIn: !!parsed.contact.linkedin,
      },
    },
    experience: {
      name: 'Work Experience',
      hasSection: parsed.workExperience.length > 0,
      entryCount: parsed.workExperience.length,
      hasBullets: parsed.workExperience.some(e => e.bullets.length > 0),
    },
    education: {
      name: 'Education',
      hasSection: parsed.education.length > 0,
      entryCount: parsed.education.length,
    },
    skills: {
      name: 'Skills',
      hasSection: parsed.skills.length > 0,
      skillCount: parsed.skills.length,
    },
    summary: {
      name: 'Professional Summary',
      hasSection: !!parsed.summary,
      length: parsed.summary?.length || 0,
    },
  };

  // Calculate score
  let score = 0;
  if (checks.contact.hasSection) score += 20;
  if (checks.experience.hasSection) score += 30;
  if (checks.education.hasSection) score += 20;
  if (checks.skills.hasSection) score += 15;
  if (checks.summary.hasSection) score += 15;

  return { score, checks };
}
```

### ATS Essentials Analysis

```typescript
function analyzeEssentials(text: string, fileType: string): EssentialsAnalysis {
  const issues: Issue[] = [];
  let score = 100;

  // File format check
  const goodFormats = ['pdf', 'docx', 'doc'];
  if (!goodFormats.includes(fileType.toLowerCase())) {
    score -= 20;
    issues.push({
      severity: 'high',
      title: 'Incompatible File Format',
      description: `${fileType} files may not be parsed correctly by ATS systems`,
      recommendation: 'Save your resume as PDF or DOCX',
    });
  }

  // Standard headings check
  const standardHeadings = [
    /experience|employment|work history/i,
    /education|academic/i,
    /skills|expertise|competencies/i,
  ];
  const headingsFound = standardHeadings.filter(h => h.test(text)).length;
  if (headingsFound < 2) {
    score -= 15;
    issues.push({
      severity: 'medium',
      title: 'Non-Standard Section Headings',
      description: 'ATS may not recognize custom section headers',
      recommendation: 'Use standard headers like "Work Experience", "Education", "Skills"',
    });
  }

  // Table/column detection (simplified - look for tab patterns)
  const hasTabularData = /\t{2,}/.test(text) || /\s{5,}\w+\s{5,}/.test(text);
  if (hasTabularData) {
    score -= 15;
    issues.push({
      severity: 'medium',
      title: 'Possible Table or Column Layout',
      description: 'Tables and multi-column layouts can confuse ATS parsers',
      recommendation: 'Use a single-column layout with clear sections',
    });
  }

  // Date format consistency
  const datePatterns = [
    /\d{1,2}\/\d{4}/g,      // MM/YYYY
    /\d{4}-\d{2}/g,          // YYYY-MM
    /[A-Z][a-z]+ \d{4}/g,    // Month YYYY
    /\d{1,2}\/\d{1,2}\/\d{4}/g, // MM/DD/YYYY
  ];
  const usedFormats = datePatterns.filter(p => p.test(text)).length;
  if (usedFormats > 2) {
    score -= 10;
    issues.push({
      severity: 'low',
      title: 'Inconsistent Date Formatting',
      description: 'Multiple date formats detected',
      recommendation: 'Use consistent date format throughout (e.g., "January 2024" or "01/2024")',
    });
  }

  return { score, issues };
}
```

### Tailoring Analysis (AI-powered)

```typescript
async function analyzeTailoring(
  parsed: ParsedResume,
  jobDescription: string
): Promise<TailoringAnalysis> {
  const result = await callJsonModel(`
    You are an expert ATS analyst. Compare this resume to the job description.

    RESUME:
    Summary: ${parsed.summary}
    Skills: ${parsed.skills.join(', ')}
    Experience: ${parsed.workExperience.map(e => e.bullets.join('\n')).join('\n')}

    JOB DESCRIPTION:
    ${jobDescription}

    Analyze and return:
    1. hardSkillsMatch: { found: string[], missing: string[], score: 0-100 }
    2. softSkillsMatch: { found: string[], missing: string[], score: 0-100 }
    3. jobTitleMatch: { resumeTitle: string, targetTitle: string, score: 0-100 }
    4. keywordAnalysis: { present: string[], missing: string[], density: number }
    5. overallTailoringScore: 0-100
    6. recommendations: string[]
  `, TailoringSchema);

  return result;
}
```

---

## UI Design Specifications

### Color Scheme
```css
:root {
  /* Score colors */
  --score-excellent: #22c55e; /* green - 80-100 */
  --score-good: #eab308;      /* yellow - 60-79 */
  --score-poor: #ef4444;      /* red - 0-59 */

  /* Category badge colors */
  --badge-pass: #dcfce7;      /* light green bg */
  --badge-warning: #fef9c3;   /* light yellow bg */
  --badge-fail: #fee2e2;      /* light red bg */

  /* Severity colors */
  --severity-high: #ef4444;
  --severity-medium: #f97316;
  --severity-low: #6b7280;
}
```

### Score Card Layout (Left Sidebar)
```
┌─────────────────────────┐
│      Your Score         │
│                         │
│    ╭──────────────╮     │
│    │      73      │     │ <- Semi-circular gauge
│    ╰──────────────╯     │
│       73/100            │
│      10 Issues          │
│                         │
├─────────────────────────┤
│ CONTENT          [68%]  │ <- Expandable
│   ✓ ATS Parse Rate      │
│   ✗ Quantifying Impact  │
│   ✗ Repetition          │
│   ✗ Spelling & Grammar  │
├─────────────────────────┤
│ SECTIONS        [100%]  │
├─────────────────────────┤
│ ATS ESSENTIALS   [83%]  │
├─────────────────────────┤
│ TAILORING        [??%]  │ <- Unlocked with JD
├─────────────────────────┤
│  [Unlock Full Report]   │ <- CTA button
└─────────────────────────┘
```

### Processing Animation
```typescript
const processingSteps = [
  { id: 'parse', label: 'Parsing your resume', duration: 1500 },
  { id: 'analyze', label: 'Analyzing your experience', duration: 2000 },
  { id: 'skills', label: 'Extracting your skills', duration: 1500 },
  { id: 'recommend', label: 'Generating recommendations', duration: 2000 },
];
```

### Issue Card Design
```
┌─────────────────────────────────────────────┐
│ ⚠ Quantifying Impact                    [1] │
├─────────────────────────────────────────────┤
│ Your bullet points lack quantifiable        │
│ metrics and achievements.                   │
│                                             │
│ 💡 Recommendation:                          │
│ Add numbers, percentages, or dollar amounts │
│ to demonstrate impact. For example:         │
│ "Increased sales by 25%" instead of         │
│ "Improved sales performance"                │
│                                             │
│ [View affected bullets ↓]                   │
└─────────────────────────────────────────────┘
```

---

## File Structure Summary

```
lib/
├── ats-checker/
│   ├── index.ts              # Main entry, orchestration
│   ├── types.ts              # TypeScript interfaces
│   ├── content-analyzer.ts   # Parse rate, quantification, etc.
│   ├── sections-analyzer.ts  # Section detection
│   ├── essentials-analyzer.ts# ATS compatibility checks
│   ├── tailoring-analyzer.ts # Job matching (AI)
│   └── scoring.ts            # Score calculation

app/
├── ats-checker/
│   ├── page.tsx              # Main ATS checker page
│   └── layout.tsx            # Page layout
├── api/
│   └── ats-check/
│       ├── route.ts          # POST - run check
│       ├── [id]/route.ts     # GET - get results
│       └── with-job/route.ts # POST - with job desc

components/
└── ats-checker/
    ├── ATSCheckerPage.tsx
    ├── ResumeUploader.tsx
    ├── ProcessingAnimation.tsx
    ├── ScoreCard.tsx
    ├── CategoryScore.tsx
    ├── ResultsPanel.tsx
    ├── CategorySection.tsx
    ├── IssueCard.tsx
    ├── ParseRateVisual.tsx
    └── JobDescriptionInput.tsx
```

---

## Implementation Checklist

### Phase 1: Analysis Engine
- [ ] Create `lib/ats-checker/types.ts` with all interfaces
- [ ] Create `lib/schemas/ats-check.ts` with Zod schemas
- [ ] Implement `lib/ats-checker/content-analyzer.ts`
  - [ ] Parse rate calculation
  - [ ] Quantification analysis
  - [ ] Repetition detection
  - [ ] Spelling/grammar check (AI)
- [ ] Implement `lib/ats-checker/sections-analyzer.ts`
- [ ] Implement `lib/ats-checker/essentials-analyzer.ts`
- [ ] Implement `lib/ats-checker/tailoring-analyzer.ts`
- [ ] Implement `lib/ats-checker/scoring.ts`
- [ ] Create `lib/ats-checker/index.ts` orchestration

### Phase 2: API Layer
- [ ] Create `app/api/ats-check/route.ts`
- [ ] Create `app/api/ats-check/[id]/route.ts`
- [ ] Create `app/api/ats-check/with-job/route.ts`
- [ ] Add database functions to `lib/db.ts`
- [ ] Create SQL migration for `ats_checks` table

### Phase 3: UI Components
- [ ] Create `components/ats-checker/ProcessingAnimation.tsx`
- [ ] Create `components/ats-checker/ScoreCard.tsx`
- [ ] Create `components/ats-checker/CategoryScore.tsx`
- [ ] Create `components/ats-checker/ResultsPanel.tsx`
- [ ] Create `components/ats-checker/CategorySection.tsx`
- [ ] Create `components/ats-checker/IssueCard.tsx`
- [ ] Create `components/ats-checker/ParseRateVisual.tsx`
- [ ] Create `components/ats-checker/ResumeUploader.tsx`
- [ ] Create `components/ats-checker/JobDescriptionInput.tsx`
- [ ] Create `app/ats-checker/page.tsx`

### Phase 4: Integration
- [ ] Add navigation link to dashboard
- [ ] Integrate with existing upload flow
- [ ] Add rate limiting
- [ ] Test with various resume formats
- [ ] Mobile responsiveness

---

## Notes

### Leveraging Existing Code
- Use existing `parseResumeContent()` from `lib/resume-parser.ts`
- Use existing `extractResumeWithLLM()` for better parsing
- Use existing `callJsonModel()` from `lib/llm.ts`
- Build on existing UI components in `components/ui/`

### Differentiation Opportunities
1. **Instant visual feedback** - Show parsing progress in real-time
2. **Actionable fixes** - One-click fix suggestions
3. **Job-specific tailoring** - Deep keyword analysis
4. **Industry benchmarks** - Compare to successful resumes
5. **Integration with optimizer** - Direct path to fix issues

### Monetization Options
- Free tier: Basic check (Content + Sections + Essentials)
- Pro tier: Full report + Tailoring + History + Export
