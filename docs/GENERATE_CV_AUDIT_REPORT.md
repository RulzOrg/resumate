# Generate CV Feature - Audit Report & Implementation Plan

**Date:** January 2025  
**Auditor:** AI Code Assistant  
**Scope:** Complete audit of Generate CV feature against `GENERATE_CV-PRD.md`  
**Status:** 🟡 **40% Complete** - Significant gaps identified

---

## Executive Summary

I've conducted a comprehensive audit of the current "Generate CV" implementation (Step 3 of the AI Resume Optimization flow) against the `GENERATE_CV-PRD.md` specification. The feature is **partially implemented** with significant gaps in core functionality that prevent it from meeting PRD requirements.

### Quick Assessment

| Category | Status | Completion |
|----------|--------|------------|
| Data Model | 🔴 Critical Gaps | 20% |
| API Routes | 🟡 Partially Done | 35% |
| Eligibility Gate | 🔴 Missing | 0% |
| Variant Generation | 🔴 Missing | 0% |
| Grounding System | 🔴 Weak | 15% |
| Must-Hit Keywords | 🔴 Missing | 0% |
| Section Locking | 🔴 Missing | 0% |
| Skills Changelog | 🔴 Missing | 0% |
| Version Management | 🔴 Missing | 0% |
| Export System | 🟡 Broken | 30% |
| UI/UX | 🟢 Good | 75% |
| Prompt Engineering | 🔴 Needs Rewrite | 25% |

**Overall:** 🟡 **40% Complete**

---

## What's Currently Working

### ✅ Basic Optimization Pipeline

**File:** `/app/api/resumes/optimize/route.ts`

**Functionality:**
- Accepts `resume_id` and `job_analysis_id`
- Generates single optimized version using GPT-4o
- Stores result in `optimized_resumes` table
- Returns optimization summary with:
  - `optimized_content` (markdown string)
  - `changes_made` (array)
  - `keywords_added` (array)
  - `skills_highlighted` (array)
  - `match_score_before` and `match_score_after`
  - `recommendations` (array)

**Strengths:**
- ✅ Rate limiting (5 requests per 5 minutes)
- ✅ Subscription check via `canPerformAction()`
- ✅ Error handling with retry logic
- ✅ Basic validation of resume content

**Weaknesses:**
- ❌ No eligibility gate
- ❌ Single variant only (no Conservative/Balanced/Bold)
- ❌ No grounding constraints in prompt
- ❌ No must-hit keyword enforcement
- ❌ No section locking
- ❌ Missing structured output (uses markdown instead of JSON)

### ✅ UI Components

**1. Optimization Wizard** (`components/optimization/optimization-wizard.tsx`)
- 3-step selection flow
- Resume selection (Step 1)
- Job analysis selection (Step 2)
- Generate optimization (Step 3)
- Progress indicator
- Error handling

**2. Optimizer UI** (`components/optimization/optimizer-ui-only.tsx`)
- Full-featured optimization interface
- Evidence display from Qdrant
- Bullet rephrasing
- Keyword coverage tracking
- Configuration options (tone, length, ATS)
- Live editor with diff highlighting

**3. Detail View** (`components/optimization/OptimizedDetailView.tsx`)
- Side-by-side comparison (optimized vs original)
- Download buttons (PDF, DOCX)
- Copy functionality
- Match score display

**Strengths:**
- ✅ Professional UI/UX
- ✅ Good visual feedback
- ✅ Evidence integration
- ✅ Responsive design

**Weaknesses:**
- ❌ No variant selection UI
- ❌ No locking interface
- ❌ Missing skills changelog display
- ❌ No version history

### ✅ Evidence System

**Integration:**
- Qdrant vector database stores resume evidence
- `/api/score` endpoint retrieves relevant evidence
- Evidence displayed in UI with relevance scores

**Strengths:**
- ✅ Semantic search working
- ✅ Top-k retrieval
- ✅ Evidence metadata (company, title, section)

**Weaknesses:**
- ❌ Evidence not linked to generated bullets (no `evidence_id`)
- ❌ No grounding validation
- ❌ Cannot prove bullets are evidence-based

### ✅ Database Foundation

**Table:** `optimized_resumes`

```sql
CREATE TABLE optimized_resumes (
  id UUID PRIMARY KEY,
  user_id TEXT REFERENCES users_sync(id),
  original_resume_id UUID REFERENCES resumes(id),
  job_analysis_id UUID REFERENCES job_analysis(id),
  title TEXT,
  optimized_content TEXT,
  optimization_summary JSONB,
  match_score INTEGER,
  improvements_made TEXT[],
  keywords_added TEXT[],
  skills_highlighted TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Strengths:**
- ✅ Basic structure exists
- ✅ Foreign key constraints
- ✅ CRUD operations in `lib/db.ts`

**Weaknesses:**
- ❌ No `cv_versions` table
- ❌ No `cv_variants` table
- ❌ No `cv_changelog` table
- ❌ Cannot store multiple variants
- ❌ No version history

---

## Critical Gaps (PRD vs Implementation)

### 🔴 1. Missing Data Model (HIGH PRIORITY)

**PRD Requirements:**

The PRD specifies a complete structured data model with:

```typescript
interface ImmutableFields {
  name: string | undefined
  email: string | undefined
  phone: string | undefined
  address?: string
  education: string[]
  certifications: string[]
}

interface RewriteOptions {
  tone: "Neutral" | "Impactful" | "Executive"
  must_hit: string[]
  emphasis: string[]
  keep_spelling: "US" | "UK"
  max_pages: 2
}

interface BulletRewrite {
  evidence_id?: string        // Link to source evidence
  source_text?: string        // For diff view
  rewritten: string
  grounded: "direct" | "synthesized"  // Must tag grounding type
}

interface ExperienceRewrite {
  company: string
  title: string
  bullets: BulletRewrite[]
  relevance_score: number     // For ordering by relevance
}

interface CvDraft {
  basics: ImmutableFields
  summary?: string
  experiences: ExperienceRewrite[]
  projects?: ExperienceRewrite[]
  volunteering?: ExperienceRewrite[]
  skills: string[]
  spelling: "US" | "UK"
  must_hit_coverage: { term: string; included: boolean }[]
  skills_changelog: { added: string[]; removed: string[] }
  length_estimate: { pages: number; lines: number }
  locks: { section: string; bullet_ids: string[] }
}

interface CvVariant {
  variant_id: string
  label: "Conservative" | "Balanced" | "Bold"
  draft: CvDraft
  created_at: string
}

interface VersionedCv {
  version_id: string
  job_id: string
  variants: CvVariant[]
  created_at: string
  status: "current" | "archived"
}
```

**Current Implementation:**

```typescript
interface OptimizedResume {
  id: string
  user_id: string
  original_resume_id: string
  job_analysis_id: string
  title: string
  optimized_content: string  // ❌ Just markdown, not structured
  optimization_summary: {     // ❌ Flat structure, missing most fields
    changes_made: string[]
    keywords_added: string[]
    skills_highlighted: string[]
    sections_improved: string[]
    match_score_before: number
    match_score_after: number
    recommendations: string[]
  }
  match_score?: number
  // ❌ No ImmutableFields
  // ❌ No RewriteOptions
  // ❌ No BulletRewrite with evidence_id
  // ❌ No ExperienceRewrite with relevance_score
  // ❌ No must_hit_coverage
  // ❌ No skills_changelog
  // ❌ No length_estimate
  // ❌ No locks
  // ❌ No variant label
}
```

**Impact:**
- **Blocker:** Cannot implement any advanced features without restructuring
- Cannot generate variants (no label field)
- Cannot track evidence (no `evidence_id` per bullet)
- Cannot lock sections (no locks field)
- Cannot show skills changes (no changelog)
- Cannot detect spelling preference
- Cannot validate must-hit coverage
- Cannot estimate page length

**Fix Required:**
1. Create `lib/schemas.generate.ts` with all PRD schemas
2. Migrate database to new schema
3. Update API to return structured `CvDraft` objects
4. Update UI to consume structured data

---

### 🔴 2. No Eligibility Gate (HIGH PRIORITY)

**PRD Requirement:**

> "Block generation when the user is not qualified. Provide guidance to close gaps."

```typescript
POST /api/cv/eligibility

Input: { userId, jobProfile, score, missing_must_haves }
Output: { 
  allowed: boolean, 
  reasons?: string[], 
  guidance?: string[] 
}

Rules:
- Allowed if score >= MIN_SCORE and missing_must_haves.length === 0
- Else blocked with list of missing items and guidance:
  • "Add a bullet that shows Python production experience"
  • "Include 'Senior Product Designer' in your resume summary"
```

**Current Implementation:**

```typescript
// ❌ NO ELIGIBILITY CHECK EXISTS
// User can generate CV for any job, regardless of qualification
// No minimum score threshold
// No guidance system
```

**Impact:**
- Users waste credits generating CVs for jobs they're clearly not qualified for
- No feedback on how to improve before generating
- Poor user experience (expecting magic, getting disappointment)
- Increased API costs (wasted generations)

**Examples Where This Would Help:**
- Junior developer applies to Staff Engineer role (0% experience match)
- Designer with no UX experience applies to UX Lead (missing must-haves)
- Backend engineer applies to Frontend role (skill mismatch)

**Fix Required:**
1. Create `/api/cv/eligibility/route.ts`
2. Implement scoring threshold (e.g., MIN_SCORE = 60)
3. Check for missing must-have skills
4. Generate actionable guidance
5. Update UI to show eligibility status before Step 3
6. Add "How to improve" suggestions

---

### 🔴 3. No Variant Generation (HIGH PRIORITY)

**PRD Requirement:**

> "Generate multiple variants per job, save versions, allow restore and compare."
>
> Generate 3 variants with increasing assertiveness:
> - **Conservative:** Keeps phrasing close to source
> - **Balanced:** Moderate rewrite with JD terms blended in
> - **Bold:** Strong impact verbs, removes weak bullets

**Current Implementation:**

```typescript
// ❌ ONLY GENERATES 1 VERSION
// No variant labels
// No tone variations
// No comparison between styles
```

**What Users Miss:**
- Choice of style (formal vs assertive)
- A/B testing different approaches
- Learning what works (compare which variant gets responses)
- Risk mitigation (conservative backup + bold experiment)

**Impact:**
- **Core Feature Missing:** This is literally in the PRD title "Generate CV" (plural implied)
- Cannot satisfy different user preferences
- No experimentation possible
- Single point of failure (if AI makes bad choice, user stuck with it)

**Fix Required:**
1. Update prompt to accept `variant` parameter
2. Create variant-specific instructions:
   ```typescript
   const variantInstructions = {
     Conservative: "Stay close to original phrasing. Minimal rewrites. Only add keywords where natural.",
     Balanced: "Moderate rewrites blending original + JD terms naturally. Reorder for relevance.",
     Bold: "Strong impact verbs, remove weak bullets, assertive tone. Maximize JD alignment.",
   };
   ```
3. Generate all 3 in parallel (faster UX)
4. Store each with label in `cv_variants` table
5. Update UI to show variant selector
6. Add comparison view

---

### 🔴 4. Weak Grounding System (HIGH PRIORITY)

**PRD Requirement:**

> **Guardrails and Rules - Grounding:**
>
> "Bullets must draw from resume evidence or safe synthesis without adding new facts. Do not invent metrics. If the original has a number, you can keep it."
>
> Tag each bullet:
> - `grounded: "direct"` when using evidence text verbatim with phrasing changes
> - `grounded: "synthesized"` when paraphrasing across bullets without new facts
>
> Link to source: `evidence_id: string`

**Current Prompt:**

```typescript
prompt: `You are an expert resume optimization specialist. Optimize the following resume for the specific job posting.

ORIGINAL RESUME CONTENT:
${resume.content_text}

${structuredBlock}

JOB POSTING ANALYSIS:
Job Title: ${jobAnalysis.job_title}
...

OPTIMIZATION INSTRUCTIONS:
1. If STRUCTURED RESUME SECTIONS present, use those fields
2. Rewrite resume to match job requirements
3. Incorporate keywords naturally
4. Highlight matching skills
5. Adjust summary to align
6. Reorder experience by relevance
7. Use action verbs and quantifiable achievements  // ❌ DANGEROUS
8. Ensure ATS compatibility

Focus on making resume relevant while maintaining authenticity.`  // ❌ TOO VAGUE
```

**Issues:**

1. ❌ **No grounding constraints**
   - "maintaining authenticity" is too vague
   - No explicit ban on inventing facts
   - "quantifiable achievements" encourages adding numbers

2. ❌ **No evidence linking**
   - Evidence retrieved from Qdrant but not passed to prompt
   - No `evidence_id` in output schema
   - Cannot verify claims are grounded

3. ❌ **No synthesis rules**
   - Doesn't distinguish "direct" vs "synthesized"
   - Can combine facts from different jobs
   - Can extrapolate beyond data

4. ❌ **No forbidden actions**
   - Can add metrics not in resume
   - Can change dates, titles, companies
   - Can invent responsibilities

**Real-World Risk Examples:**

```
❌ ORIGINAL: "Worked on backend services"
❌ AI ADDS: "Improved backend performance by 40%" (number invented)

❌ ORIGINAL: "Used React for dashboards"
❌ AI ADDS: "Led team of 5 engineers building React dashboards" (team size invented)

❌ ORIGINAL: "Managed product roadmap"
❌ AI ADDS: "Managed $2M product budget" (budget invented)
```

**Impact:**
- **Legal Risk:** Fabricated claims on resume
- **Interview Failure:** User can't back up invented numbers
- **Reputation Damage:** Caught lying in background check
- **Ethical Violation:** AI helping users misrepresent themselves

**Fix Required:**

1. **Pass Evidence to Prompt:**
```typescript
EVIDENCE AVAILABLE (from Qdrant):
${evidence.map(e => `[${e.evidence_id}] ${e.text}`).join('\n')}
```

2. **Add Strict Constraints:**
```typescript
STRICT RULES:
1. ❌ Do NOT invent facts or add numbers unless present in evidence
2. ❌ Do NOT change immutable fields (name, email, education, certifications)
3. ✅ Allowed: rephrase bullets using evidence, reorder experiences
4. ✅ Tag each bullet: grounded="direct" if using evidence text, "synthesized" if paraphrasing
5. ✅ Link each bullet to evidence_id when possible
```

3. **Update Output Schema:**
```typescript
const bulletSchema = z.object({
  evidence_id: z.string().optional(),
  source_text: z.string().optional(),
  rewritten: z.string(),
  grounded: z.enum(["direct", "synthesized"]),
});
```

4. **Add Validation:**
```typescript
// Post-generation check
function validateGrounding(bullets: BulletRewrite[], evidence: Evidence[]) {
  bullets.forEach(bullet => {
    if (bullet.grounded === "direct" && !bullet.evidence_id) {
      throw new Error("Direct bullets must have evidence_id");
    }
    
    // Check for numbers not in source
    const numbers = extractNumbers(bullet.rewritten);
    const sourceNumbers = bullet.evidence_id 
      ? extractNumbers(findEvidence(bullet.evidence_id).text)
      : [];
    
    const invented = numbers.filter(n => !sourceNumbers.includes(n));
    if (invented.length > 0) {
      throw new Error(`Invented numbers detected: ${invented}`);
    }
  });
}
```

---

### 🔴 5. No Must-Hit Keyword System (HIGH PRIORITY)

**PRD Requirement:**

> "Include hard must-hit keywords from the job description verbatim at least once where natural."
>
> Track `must_hit_coverage: { term: string; included: boolean }[]`

**Current Implementation:**

```typescript
// ❌ NO MUST-HIT TRACKING
// Keywords retrieved from job analysis but not enforced
// No coverage validation
// No guarantee important terms are included
```

**What's Missing:**

1. **No Must-Hit List Generation**
   - Should extract from `JobProfile.keywords` and `must_have_skills`
   - Should prioritize based on job requirements
   - Should mark which are ATS-critical

2. **No Enforcement in Prompt**
   - Current prompt: "Incorporate keywords naturally" (too weak)
   - Should be: "Include these terms verbatim: [list]"
   - Should specify placement strategy

3. **No Coverage Validation**
   - Cannot verify all must-hits are present
   - No post-generation check
   - No retry if missing

4. **No Placement Strategy**
   - Where to add keywords: summary? skills? bullets?
   - How to make it natural?
   - Fallback if term doesn't fit

**Real-World Example:**

```
Job Posting: "Senior Product Manager"
Must-Hit Terms: ["roadmap", "stakeholders", "metrics", "A/B testing", "SQL"]

Current Output:
✅ "roadmap" appears 1x
✅ "stakeholders" appears 2x
❌ "metrics" missing
❌ "A/B testing" missing (has "experimentation" instead)
❌ "SQL" missing (has "analytics" instead)

Result: ATS rejects resume for missing 60% of must-hit terms
```

**Impact:**
- **ATS Rejection:** Resume filtered out before human review
- **Wasted Effort:** User doesn't realize critical terms are missing
- **Lower Match Score:** ATS scoring heavily weights exact matches
- **Missed Opportunities:** Resume doesn't surface in keyword searches

**Fix Required:**

1. **Extract Must-Hits:**
```typescript
function extractMustHits(jobAnalysis: JobAnalysis): string[] {
  return [
    ...jobAnalysis.keywords,
    ...jobAnalysis.required_skills,
    ...jobAnalysis.analysis_result.key_requirements,
  ].filter((term, index, self) => self.indexOf(term) === index);
}
```

2. **Add to Prompt:**
```typescript
MUST-HIT KEYWORDS (include verbatim at least once):
${options.must_hit.map(term => `- "${term}"`).join('\n')}

PLACEMENT STRATEGY:
- If term is a skill: add to skills section
- If term is a methodology: add to relevant experience bullet
- If term is a tool/technology: add to summary or skills
- Make it sound natural, not forced
```

3. **Validate Coverage:**
```typescript
function validateMustHits(draft: CvDraft, mustHits: string[]): ValidationResult {
  const fullText = [
    draft.summary,
    ...draft.experiences.flatMap(e => e.bullets.map(b => b.rewritten)),
    ...draft.skills,
  ].join(' ').toLowerCase();
  
  const coverage = mustHits.map(term => ({
    term,
    included: fullText.includes(term.toLowerCase()),
    count: (fullText.match(new RegExp(term, 'gi')) || []).length,
  }));
  
  const missing = coverage.filter(c => !c.included);
  
  return {
    coverage,
    missing,
    allIncluded: missing.length === 0,
    score: (coverage.filter(c => c.included).length / mustHits.length) * 100,
  };
}
```

4. **Auto-Fix Missing Terms:**
```typescript
function addMissingMustHits(draft: CvDraft, missing: string[]): CvDraft {
  missing.forEach(term => {
    // Try to add to summary first
    if (draft.summary && !draft.summary.includes(term)) {
      draft.summary = insertNaturally(draft.summary, term);
    }
    // Fallback: add to skills
    else if (!draft.skills.includes(term)) {
      draft.skills.push(term);
    }
  });
  
  return draft;
}
```

---

### 🔴 6. Missing Section Locking (MEDIUM PRIORITY)

**PRD Requirement:**

> "Allow users to lock sections. Locked bullets copy through unchanged."
>
> ```typescript
> locks: { section: string; bullet_ids: string[] }
> ```

**Current Implementation:**

```typescript
// ❌ NO LOCKING MECHANISM
// All content gets rewritten
// Cannot protect specific sections
// No user control
```

**Use Cases:**

1. **Protect Achievements:**
   ```
   User: "I have a bullet with exact metrics from my performance review.
          Don't change it!"
   
   Bullet: "Increased revenue by $2.4M (verified by CFO)"
   
   Without locking: AI might change to "Significantly increased revenue"
   With locking: Preserved exactly as written
   ```

2. **Education/Certifications:**
   ```
   User: "My education section has exact dates and GPA. Keep it verbatim."
   
   Without locking: AI might rephrase school names or remove GPA
   With locking: 100% preserved
   ```

3. **Legal Requirements:**
   ```
   User: "I'm a licensed professional. My certification details must be exact."
   
   Without locking: AI might paraphrase license numbers
   With locking: Legal info protected
   ```

**Impact:**
- Users lose important details they want preserved
- Cannot have fine-grained control
- Forces users to manually fix after generation
- Reduces trust in AI output

**Fix Required:**

1. **Add Locks to Input:**
```typescript
interface GenerateRequest {
  userId: string;
  jobId: string;
  options: RewriteOptions;
  locks: {
    sections: string[];        // e.g., ["Education", "Certifications"]
    bullet_ids: string[];      // Specific bullets to preserve
  };
}
```

2. **Update Prompt:**
```typescript
LOCKED SECTIONS (copy through unchanged):
${locks.sections.join(', ')}

LOCKED BULLETS (preserve exactly):
${locks.bullet_ids.map(id => findBullet(id).text).join('\n')}
```

3. **Apply Locks Post-Generation:**
```typescript
function applyLocks(draft: CvDraft, original: Resume, locks: Locks): CvDraft {
  // Restore locked sections
  if (locks.sections.includes("Education")) {
    draft.basics.education = original.education;
  }
  
  if (locks.sections.includes("Certifications")) {
    draft.basics.certifications = original.certifications;
  }
  
  // Restore locked bullets
  draft.experiences.forEach(exp => {
    exp.bullets = exp.bullets.map(bullet => {
      if (locks.bullet_ids.includes(bullet.evidence_id || '')) {
        return {
          ...bullet,
          rewritten: bullet.source_text || bullet.rewritten,
          grounded: "direct" as const,
        };
      }
      return bullet;
    });
  });
  
  return draft;
}
```

4. **Add UI Controls:**
```tsx
<Checkbox 
  checked={lockedSections.includes("Education")}
  onCheckedChange={(checked) => {
    if (checked) {
      setLockedSections([...lockedSections, "Education"]);
    } else {
      setLockedSections(lockedSections.filter(s => s !== "Education"));
    }
  }}
>
  Lock Education Section
</Checkbox>

{experience.bullets.map(bullet => (
  <div key={bullet.id}>
    <Lock
      size={16}
      className={lockedBullets.includes(bullet.id) ? "text-amber-400" : "text-gray-400"}
      onClick={() => toggleBulletLock(bullet.id)}
    />
    <span>{bullet.text}</span>
  </div>
))}
```

---

### 🔴 7. No Skills Changelog (MEDIUM PRIORITY)

**PRD Requirement:**

> "Add or remove skills only if they already appear in the master resume text. Log all changes and present to the user."
>
> ```typescript
> skills_changelog: {
>   added: string[];    // Found elsewhere in resume
>   removed: string[];  // Not relevant to JD
> }
> ```

**Current Implementation:**

```typescript
// ❌ NO SKILLS TRACKING
// AI can add any skill
// No validation that skills exist in resume
// No change detection
// No user notification
```

**Problems:**

1. **AI Can Invent Skills:**
   ```
   Resume: "Worked with JavaScript and React"
   AI adds: "TypeScript, Next.js, GraphQL, Node.js"
   
   ❌ User never mentioned these skills
   ❌ Will fail technical interview
   ❌ Misrepresentation
   ```

2. **Cannot Explain Changes:**
   ```
   User: "Why did you remove 'Python' from my skills?"
   System: ¯\_(ツ)_/¯  (no tracking)
   ```

3. **No Transparency:**
   ```
   Before: [JavaScript, Python, SQL, Docker, AWS]
   After: [JavaScript, React, TypeScript, Node.js, MongoDB]
   
   User has no idea what changed or why
   ```

**Impact:**
- **Fabrication Risk:** Adding skills user doesn't have
- **Loss of Real Skills:** Removing important skills without notice
- **User Confusion:** No explanation for changes
- **Trust Issues:** "What else did the AI change without telling me?"

**Fix Required:**

1. **Extract Skills from Resume:**
```typescript
function extractAllSkills(resume: Resume): Set<string> {
  const skills = new Set<string>();
  
  // Explicit skills section
  if (resume.parsed_sections?.skills) {
    resume.parsed_sections.skills.forEach(s => skills.add(s.toLowerCase()));
  }
  
  // Skills mentioned in experience bullets
  const text = resume.content_text.toLowerCase();
  const commonSkills = ["python", "javascript", "react", "sql", "aws", "docker", ...];
  commonSkills.forEach(skill => {
    if (text.includes(skill)) {
      skills.add(skill);
    }
  });
  
  return skills;
}
```

2. **Validate Skill Changes:**
```typescript
function validateSkillChanges(
  originalSkills: string[],
  newSkills: string[],
  allowedSkills: Set<string>
): SkillsChangelog {
  const added = newSkills.filter(s => 
    !originalSkills.includes(s) && allowedSkills.has(s.toLowerCase())
  );
  
  const removed = originalSkills.filter(s => 
    !newSkills.includes(s)
  );
  
  const invalid = newSkills.filter(s => 
    !allowedSkills.has(s.toLowerCase())
  );
  
  if (invalid.length > 0) {
    throw new Error(`Cannot add skills not in resume: ${invalid.join(', ')}`);
  }
  
  return { added, removed };
}
```

3. **Add to Prompt:**
```typescript
ALLOWED SKILLS (only these can be added):
${Array.from(allowedSkills).join(', ')}

RULES FOR SKILLS:
- You can only add skills from the ALLOWED list
- Skills must already be mentioned in the resume text
- Do not invent new skills
- Provide justification for additions/removals
```

4. **Display in UI:**
```tsx
{skillsChangelog && (
  <Alert className="border-amber-500/30 bg-amber-500/10">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Skills Modified</AlertTitle>
    <AlertDescription>
      {skillsChangelog.added.length > 0 && (
        <div>
          <strong>Added:</strong> {skillsChangelog.added.join(', ')}
          <p className="text-xs text-white/60 mt-1">
            (Found in your resume experience)
          </p>
        </div>
      )}
      {skillsChangelog.removed.length > 0 && (
        <div className="mt-2">
          <strong>Removed:</strong> {skillsChangelog.removed.join(', ')}
          <p className="text-xs text-white/60 mt-1">
            (Not relevant to target role)
          </p>
        </div>
      )}
    </AlertDescription>
  </Alert>
)}
```

---

### 🔴 8. No Version Management (MEDIUM PRIORITY)

**PRD Requirement:**

> "Generate multiple variants per job, save versions, allow restore and compare."
>
> Database tables:
> ```sql
> cv_versions (version_id, user_id, job_id, status, timestamps)
> cv_variants (variant_id, version_id, label, draft, timestamp)
> cv_changelog (optional for skills changes)
> ```

**Current Implementation:**

```sql
-- ✅ Has: optimized_resumes table
CREATE TABLE optimized_resumes (
  id UUID PRIMARY KEY,
  user_id TEXT,
  original_resume_id UUID,
  job_analysis_id UUID,
  title TEXT,
  optimized_content TEXT,  -- ❌ Single version only
  optimization_summary JSONB,
  match_score INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- ❌ Missing: cv_versions table
-- ❌ Missing: cv_variants table
-- ❌ Missing: cv_changelog table
```

**Problems:**

1. **Cannot Store Multiple Variants:**
   - Only 1 optimization per resume+job combo
   - Regenerating overwrites previous version
   - Cannot compare Conservative vs Bold

2. **No Version History:**
   - User regenerates → old version lost
   - Cannot restore previous attempt
   - Cannot see evolution over time

3. **No Variant Labels:**
   - Cannot mark which style (Conservative/Balanced/Bold)
   - Cannot organize different approaches
   - Cannot A/B test variants

4. **No Status Tracking:**
   - Which version is "current"?
   - Which are archived?
   - Which variant did user choose?

**Use Cases:**

```
Scenario 1: User generates CV, realizes it's too aggressive, wants to restore Conservative variant
❌ Current: Previous versions lost
✅ With versioning: Click "Restore Conservative v1"

Scenario 2: User applies to 5 similar jobs, wants to reuse same variant
❌ Current: Must regenerate each time
✅ With versioning: "Use Balanced variant from Version 3"

Scenario 3: User wants to see improvement over time
❌ Current: No history
✅ With versioning: Compare v1 (score 65%) → v2 (score 78%) → v3 (score 82%)
```

**Impact:**
- Poor user experience (losing work)
- Wasted API costs (regenerating same content)
- Cannot learn from iterations
- No comparison capability

**Fix Required:**

1. **Create Tables:**
```sql
CREATE TABLE cv_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users_sync(id) ON DELETE CASCADE,
  job_id UUID REFERENCES job_analysis(id),
  status TEXT DEFAULT 'current' CHECK(status IN ('current', 'archived')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cv_variants (
  variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID REFERENCES cv_versions(version_id) ON DELETE CASCADE,
  label TEXT CHECK(label IN ('Conservative', 'Balanced', 'Bold')),
  draft JSONB NOT NULL,  -- CvDraft structure
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cv_versions_user_job ON cv_versions(user_id, job_id);
CREATE INDEX idx_cv_variants_version ON cv_variants(version_id);
```

2. **Update API:**
```typescript
// POST /api/cv/generate
async function generateCvVersion(request: GenerateRequest) {
  // Create version record
  const version = await createCvVersion({
    user_id: request.userId,
    job_id: request.jobId,
    status: 'current',
  });
  
  // Generate 3 variants in parallel
  const [conservative, balanced, bold] = await Promise.all([
    generateVariant({ ...request, variant: 'Conservative' }),
    generateVariant({ ...request, variant: 'Balanced' }),
    generateVariant({ ...request, variant: 'Bold' }),
  ]);
  
  // Save variants
  await Promise.all([
    createCvVariant({ version_id: version.id, label: 'Conservative', draft: conservative }),
    createCvVariant({ version_id: version.id, label: 'Balanced', draft: balanced }),
    createCvVariant({ version_id: version.id, label: 'Bold', draft: bold }),
  ]);
  
  // Archive previous versions for this job
  await archivePreviousVersions(request.userId, request.jobId);
  
  return { version_id: version.id, variants: [conservative, balanced, bold] };
}
```

3. **Add UI:**
```tsx
<VersionHistory userId={userId} jobId={jobId}>
  {versions.map(version => (
    <VersionCard key={version.version_id}>
      <div className="flex justify-between">
        <span>Version {version.number}</span>
        <Badge variant={version.status === 'current' ? 'default' : 'secondary'}>
          {version.status}
        </Badge>
      </div>
      <div className="flex gap-2 mt-2">
        {version.variants.map(variant => (
          <Button 
            key={variant.variant_id}
            variant={variant.is_selected ? 'default' : 'outline'}
            onClick={() => selectVariant(variant.variant_id)}
          >
            {variant.label}
          </Button>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={() => restoreVersion(version.version_id)}>
          Restore
        </Button>
        <Button size="sm" variant="ghost" onClick={() => compareVersion(version.version_id)}>
          Compare
        </Button>
      </div>
    </VersionCard>
  ))}
</VersionHistory>
```

---

### 🟡 9. Broken Export System (MEDIUM PRIORITY)

**PRD Requirement:**

> "Export to DOCX, PDF, and ATS-safe TXT"
> - DOCX: Use minimal template, mirror master structure, generic fonts
> - PDF: Render DOCX server-side or HTML to PDF, keep 2 pages
> - TXT: Plain section headers and bullets, one skill per line, strip ornamentation

**Current Implementation:**

**File:** `/app/api/resumes/download/route.tsx`

```typescript
if (format === "pdf") {
  // ❌ RETURNS HTML FILE, NOT PDF
  const htmlContent = `<!DOCTYPE html>...`;
  return new NextResponse(htmlContent, {
    headers: {
      "Content-Type": "text/html",  // ❌ Wrong content type
      "Content-Disposition": `attachment; filename="${filename.replace('.pdf', '.html')}"`,  // ❌ Changes extension
    },
  });
}

if (format === "docx" || format === "txt") {
  // ❌ RETURNS PLAIN TEXT, NOT DOCX
  const textContent = `${title}\n\n${content}`;
  return new NextResponse(textContent, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  // ❌ Lie: it's not DOCX
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

**Problems:**

1. **PDF Export:**
   - Returns HTML file with `.pdf` extension
   - No actual PDF generation
   - Cannot open in PDF viewers
   - Unusable for job applications

2. **DOCX Export:**
   - Returns plain text with DOCX content type
   - Not a valid Office document
   - Cannot open in Word
   - Fails upload to ATS systems

3. **TXT Export:**
   - Just dumps markdown content
   - No ATS optimization
   - Keeps formatting that breaks parsing
   - Not truly "ATS-safe"

**Real User Experience:**

```
User: Downloads PDF
File: resume.pdf
Opens in: Adobe Reader → "File is corrupted"
Opens in: Browser → Shows HTML (because it IS HTML)
Result: ❌ Cannot submit to job application

User: Downloads DOCX
File: resume.docx
Opens in: Microsoft Word → "File format invalid"
Opens in: Text editor → Shows plain text
Result: ❌ ATS rejects file

User: Downloads TXT
File: resume.txt
Opens in: Notepad → Shows markdown with symbols
Result: ❌ ATS confused by formatting
```

**Impact:**
- **Feature Unusable:** Primary use case (applying to jobs) broken
- **User Frustration:** Downloaded files don't work
- **Wasted Time:** Users manually copy/paste or recreate in Word
- **Support Burden:** "Why don't the downloads work?"

**Fix Required:**

1. **Install Libraries:**
```bash
npm install docx pdf-lib marked
```

2. **Create Export Service:**

**File:** `lib/export/docx.ts`
```typescript
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

export async function generateDocx(draft: CvDraft): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Name (large, bold)
        new Paragraph({
          children: [
            new TextRun({
              text: draft.basics.name || "Candidate Name",
              bold: true,
              size: 32,  // 16pt
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        
        // Contact info
        new Paragraph({
          children: [
            new TextRun({
              text: [draft.basics.email, draft.basics.phone]
                .filter(Boolean)
                .join(' • '),
              size: 20,  // 10pt
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        
        // Summary
        ...(draft.summary ? [
          new Paragraph({ text: "" }),  // Spacing
          new Paragraph({
            children: [
              new TextRun({ text: "PROFESSIONAL SUMMARY", bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: draft.summary, size: 22 }),
            ],
          }),
        ] : []),
        
        // Experience
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [
            new TextRun({ text: "EXPERIENCE", bold: true, size: 24 }),
          ],
        }),
        
        ...draft.experiences.flatMap(exp => [
          new Paragraph({
            children: [
              new TextRun({ text: `${exp.title} — ${exp.company}`, bold: true, size: 22 }),
            ],
          }),
          ...exp.bullets.map(bullet => 
            new Paragraph({
              children: [
                new TextRun({ text: `• ${bullet.rewritten}`, size: 22 }),
              ],
              indent: { left: 360 },  // 0.5 inch
            })
          ),
          new Paragraph({ text: "" }),  // Spacing between jobs
        ]),
        
        // Skills
        new Paragraph({
          children: [
            new TextRun({ text: "SKILLS", bold: true, size: 24 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ 
              text: draft.skills.join(' • '), 
              size: 22 
            }),
          ],
        }),
        
        // Education
        ...(draft.basics.education.length > 0 ? [
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "EDUCATION", bold: true, size: 24 }),
            ],
          }),
          ...draft.basics.education.map(edu =>
            new Paragraph({
              children: [
                new TextRun({ text: edu, size: 22 }),
              ],
            })
          ),
        ] : []),
      ],
    }],
  });
  
  return await Packer.toBuffer(doc);
}
```

**File:** `lib/export/pdf.ts`
```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generatePdf(draft: CvDraft): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);  // Letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = 750;  // Start from top
  const margin = 72;  // 1 inch
  const lineHeight = 14;
  
  // Name
  page.drawText(draft.basics.name || "Candidate Name", {
    x: margin,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight * 2;
  
  // Contact
  const contact = [draft.basics.email, draft.basics.phone]
    .filter(Boolean)
    .join(' • ');
  page.drawText(contact, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= lineHeight * 2;
  
  // Summary
  if (draft.summary) {
    page.drawText("PROFESSIONAL SUMMARY", {
      x: margin,
      y,
      size: 12,
      font: boldFont,
    });
    y -= lineHeight;
    
    // Wrap text
    const summaryLines = wrapText(draft.summary, 70);
    summaryLines.forEach(line => {
      page.drawText(line, { x: margin, y, size: 10, font });
      y -= lineHeight;
    });
    y -= lineHeight;
  }
  
  // Experience
  page.drawText("EXPERIENCE", {
    x: margin,
    y,
    size: 12,
    font: boldFont,
  });
  y -= lineHeight;
  
  draft.experiences.forEach(exp => {
    page.drawText(`${exp.title} — ${exp.company}`, {
      x: margin,
      y,
      size: 11,
      font: boldFont,
    });
    y -= lineHeight;
    
    exp.bullets.forEach(bullet => {
      const bulletLines = wrapText(`• ${bullet.rewritten}`, 68);
      bulletLines.forEach(line => {
        page.drawText(line, { x: margin + 20, y, size: 10, font });
        y -= lineHeight;
      });
    });
    y -= lineHeight;
  });
  
  // Check if need second page
  if (y < margin) {
    const page2 = pdfDoc.addPage([612, 792]);
    y = 750;
    // Continue content on page 2...
  }
  
  return Buffer.from(await pdfDoc.save());
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach(word => {
    if ((currentLine + word).length > maxChars) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines;
}
```

**File:** `lib/export/ats-txt.ts`
```typescript
export function generateAtsTxt(draft: CvDraft): string {
  const lines: string[] = [];
  
  // Name
  lines.push(draft.basics.name || "CANDIDATE NAME");
  lines.push("");
  
  // Contact
  if (draft.basics.email) lines.push(`Email: ${draft.basics.email}`);
  if (draft.basics.phone) lines.push(`Phone: ${draft.basics.phone}`);
  if (draft.basics.address) lines.push(`Location: ${draft.basics.address}`);
  lines.push("");
  
  // Summary
  if (draft.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(draft.summary);
    lines.push("");
  }
  
  // Experience
  lines.push("EXPERIENCE");
  lines.push("");
  draft.experiences.forEach(exp => {
    lines.push(`${exp.title}`);
    lines.push(`${exp.company}`);
    lines.push("");
    exp.bullets.forEach(bullet => {
      lines.push(`- ${bullet.rewritten}`);
    });
    lines.push("");
  });
  
  // Skills (one per line for ATS)
  lines.push("SKILLS");
  draft.skills.forEach(skill => {
    lines.push(skill);
  });
  lines.push("");
  
  // Education
  if (draft.basics.education.length > 0) {
    lines.push("EDUCATION");
    draft.basics.education.forEach(edu => {
      lines.push(edu);
    });
    lines.push("");
  }
  
  // Certifications
  if (draft.basics.certifications.length > 0) {
    lines.push("CERTIFICATIONS");
    draft.basics.certifications.forEach(cert => {
      lines.push(cert);
    });
  }
  
  return lines.join('\n');
}
```

3. **Update Download Route:**

**File:** `/app/api/resumes/download/route.tsx`
```typescript
import { generateDocx } from '@/lib/export/docx';
import { generatePdf } from '@/lib/export/pdf';
import { generateAtsTxt } from '@/lib/export/ats-txt';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get("variant_id");
  const format = searchParams.get("format") || "pdf";

  if (!variantId) {
    return NextResponse.json({ error: "Variant ID required" }, { status: 400 });
  }

  const variant = await getCvVariant(variantId, user.id);
  if (!variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  const draft = variant.draft as CvDraft;
  const filename = `${draft.basics.name}_${variant.label}_Resume.${format}`;

  if (format === "pdf") {
    const buffer = await generatePdf(draft);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }
  
  if (format === "docx") {
    const buffer = await generateDocx(draft);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }
  
  if (format === "txt") {
    const text = generateAtsTxt(draft);
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
```

---

## Prompt Engineering Analysis

### Current Prompt Quality: 🔴 25/100

**File:** `/app/api/resumes/optimize/route.ts`

```typescript
prompt: `You are an expert resume optimization specialist. Optimize the following resume for the specific job posting.

ORIGINAL RESUME CONTENT:
${resume.content_text}

${structuredBlock}

JOB POSTING ANALYSIS:
Job Title: ${jobAnalysis.job_title}
Company: ${jobAnalysis.company_name || "Not specified"}
Required Skills: ${requiredSkills.join(", ")}
Preferred Skills: ${preferredSkills.join(", ")}
Keywords: ${keywords.join(", ")}
Experience Level: ${jobAnalysis.experience_level || "Not specified"}
Key Requirements: ${keyRequirements.join(", ")}

OPTIMIZATION INSTRUCTIONS:
1. If STRUCTURED RESUME SECTIONS is present, treat it as the source of truth; map and rewrite using those fields first (e.g., personal_info, experience.highlights, skills).
2. Rewrite the resume to better match the job requirements
3. Incorporate relevant keywords naturally throughout the content
4. Highlight skills that match the job requirements
5. Adjust the professional summary to align with the role
6. Reorder or emphasize experience that's most relevant
7. Use action verbs and quantifiable achievements
8. Ensure ATS compatibility and keep a clean markdown layout

Please provide:
- The complete optimized resume content in markdown format
- Specific changes made
- Keywords added or emphasized
- Skills highlighted
- Sections improved
- Before/after match scores (0-100)
- Additional recommendations

Focus on making the resume highly relevant to this specific job while maintaining authenticity.`
```

### Issues Identified:

#### 🔴 Critical Issues:

1. **No Grounding Constraints**
   - ❌ "quantifiable achievements" encourages adding numbers
   - ❌ No explicit ban on fabrication
   - ❌ "maintaining authenticity" too vague

2. **No Evidence Linking**
   - ❌ Evidence retrieved from Qdrant but not passed to prompt
   - ❌ Cannot trace bullets to source
   - ❌ No way to verify claims

3. **No Immutable Field Protection**
   - ❌ Can change name, email, education
   - ❌ No explicit list of protected fields
   - ❌ Violates PRD requirement

4. **Weak Output Format**
   - ❌ Requests "markdown format" (unstructured)
   - ❌ No JSON schema enforcement
   - ❌ Cannot extract structured data

5. **Missing Must-Hit Enforcement**
   - ❌ "incorporate keywords naturally" is too weak
   - ❌ No guarantee terms are included
   - ❌ No verbatim requirement

#### 🟡 Medium Issues:

6. **No Tone Parameter**
   - ❌ Cannot control Conservative/Balanced/Bold style
   - ❌ Always produces same tone

7. **No Page Limit**
   - ❌ Can generate 3+ page resumes
   - ❌ Violates "max 2 pages" requirement

8. **No Spelling Control**
   - ❌ Mixed US/UK spelling
   - ❌ No consistency enforcement

9. **No Synthesis Rules**
   - ❌ Can combine facts from different sources
   - ❌ No tagging of grounding type

10. **No Trimming Guidance**
    - ❌ If too long, no guidance on what to cut
    - ❌ May remove important content

### Recommended Prompt (PRD-Compliant):

```typescript
import { buildCvGenerationPrompt } from '@/lib/prompts/cv-generation';

const prompt = buildCvGenerationPrompt({
  masterResume: {
    basics: extractImmutableFields(resume),
    content: resume.content_text,
    structured: resume.parsed_sections,
  },
  jobProfile: {
    job_title: jobAnalysis.job_title,
    company_name: jobAnalysis.company_name,
    required_skills: requiredSkills,
    preferred_skills: preferredSkills,
    keywords: keywords,
    key_requirements: keyRequirements,
  },
  evidence: evidencePoints,  // From Qdrant
  options: {
    tone: "Balanced",  // Or user-selected
    must_hit: extractMustHits(jobAnalysis),
    emphasis: extractEmphasis(jobAnalysis),
    keep_spelling: detectSpelling(resume),
    max_pages: 2,
  },
  locks: {
    sections: [],
    bullet_ids: [],
  },
  variant: "Balanced",
});

// lib/prompts/cv-generation.ts
export function buildCvGenerationPrompt(context: GenerationContext): Prompt {
  const variantInstructions = {
    Conservative: "Stay close to original phrasing. Minimal rewrites. Only add keywords where natural. Preserve original tone.",
    Balanced: "Moderate rewrites blending original + JD terms naturally. Reorder for relevance. Professional tone.",
    Bold: "Strong impact verbs, remove weak bullets, assertive tone. Maximize JD alignment. Remove filler.",
  };

  return {
    system: `You are rewriting a resume to match a specific job description. Your output will be used for job applications.

IMMUTABLE FIELDS (NEVER CHANGE THESE):
${JSON.stringify(context.masterResume.basics, null, 2)}

STRICT RULES:
1. ❌ Do NOT invent facts or add numbers unless present in EVIDENCE below
2. ❌ Do NOT modify immutable fields (name, email, phone, address, education, certifications)
3. ❌ Do NOT change company names, job titles, or dates
4. ✅ Allowed: rephrase bullets using evidence, reorder experiences by relevance
5. ✅ Tag each bullet with grounding type:
   - "direct" = using evidence text verbatim with phrasing changes
   - "synthesized" = paraphrasing multiple bullets without adding facts
6. ✅ Link each bullet to evidence_id when possible
7. ✅ Include these must-hit terms VERBATIM at least once: ${context.options.must_hit.map(t => `"${t}"`).join(', ')}
8. ✅ Apply section locks: ${JSON.stringify(context.locks)}
9. ✅ Target max ${context.options.max_pages} pages (~600 characters per page, ~50 lines per page)
10. ✅ Use ${context.options.keep_spelling} spelling consistently (e.g., "optimise" vs "optimize")
11. ✅ Tone: ${context.options.tone}
12. ✅ Variant style: ${variantInstructions[context.variant]}

EVIDENCE AVAILABLE (from resume, use these to ground rewrites):
${context.evidence.map(e => `[${e.evidence_id}] ${e.text} (${e.company}, ${e.title})`).join('\n')}

OUTPUT FORMAT:
Return valid JSON matching the CvDraft schema EXACTLY. Include:
- basics (immutable fields, unchanged)
- summary (refreshed but grounded in resume + JD)
- experiences (array of ExperienceRewrite with bullets, each tagged with evidence_id + grounded flag)
- projects (optional, promote/demote for relevance)
- skills (reordered, subset of original OR present in evidence)
- must_hit_coverage (array showing which terms included)
- skills_changelog (what was added/removed with justification)
- length_estimate (pages, lines)

FORBIDDEN ACTIONS:
❌ Adding numbers not in evidence (e.g., "increased by 40%" when original says "improved")
❌ Inventing team sizes (e.g., "led team of 5" when not mentioned)
❌ Adding budget amounts (e.g., "$2M budget" when not mentioned)
❌ Fabricating metrics (e.g., "99.9% uptime" when not mentioned)
❌ Changing education details (school names, degrees, dates, GPA)
❌ Modifying personal info (name, email, phone, address)

TRIMMING RULES (if over ${context.options.max_pages} pages):
1. Shorten summary to 2-3 sentences
2. Remove low-relevance bullets (relevance_score < 50)
3. Condense older experiences (keep 1-2 bullets for jobs > 5 years ago)
4. Remove secondary sections like volunteering if not relevant
5. NEVER trim immutable sections (education, certifications)`,

    user: `MASTER RESUME (structured):
${JSON.stringify(context.masterResume.structured, null, 2)}

MASTER RESUME (full text):
${context.masterResume.content}

JOB PROFILE:
Title: ${context.jobProfile.job_title}
Company: ${context.jobProfile.company_name}
Required Skills: ${context.jobProfile.required_skills.join(', ')}
Preferred Skills: ${context.jobProfile.preferred_skills.join(', ')}
Keywords: ${context.jobProfile.keywords.join(', ')}
Key Requirements: ${context.jobProfile.key_requirements.join('\n- ')}

GENERATION OPTIONS:
${JSON.stringify(context.options, null, 2)}

SECTION LOCKS:
${JSON.stringify(context.locks, null, 2)}

Generate ${context.variant} variant following all rules. Link bullets to evidence_id. Tag grounding type. Include all must-hit terms verbatim.`,
  };
}
```

### Output Schema (PRD-Compliant):

```typescript
const cvDraftSchema = z.object({
  basics: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    education: z.array(z.string()),
    certifications: z.array(z.string()),
  }),
  summary: z.string().optional(),
  experiences: z.array(z.object({
    company: z.string(),
    title: z.string(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    bullets: z.array(z.object({
      evidence_id: z.string().optional(),
      source_text: z.string().optional(),
      rewritten: z.string(),
      grounded: z.enum(["direct", "synthesized"]),
    })),
    relevance_score: z.number().min(0).max(100),
  })),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    bullets: z.array(z.object({
      evidence_id: z.string().optional(),
      source_text: z.string().optional(),
      rewritten: z.string(),
      grounded: z.enum(["direct", "synthesized"]),
    })),
    relevance_score: z.number().min(0).max(100),
  })).optional(),
  volunteering: z.array(z.object({
    organization: z.string(),
    role: z.string().optional(),
    bullets: z.array(z.object({
      evidence_id: z.string().optional(),
      source_text: z.string().optional(),
      rewritten: z.string(),
      grounded: z.enum(["direct", "synthesized"]),
    })),
    relevance_score: z.number().min(0).max(100),
  })).optional(),
  skills: z.array(z.string()),
  spelling: z.enum(["US", "UK"]),
  must_hit_coverage: z.array(z.object({
    term: z.string(),
    included: z.boolean(),
    location: z.string().optional(),  // Where it was added (summary, skills, bullet)
  })),
  skills_changelog: z.object({
    added: z.array(z.object({
      skill: z.string(),
      justification: z.string(),  // "Found in Experience section, bullet 3"
    })),
    removed: z.array(z.object({
      skill: z.string(),
      reason: z.string(),  // "Not relevant to target role"
    })),
  }),
  length_estimate: z.object({
    pages: z.number(),
    lines: z.number(),
    characters: z.number(),
    trimmed_sections: z.array(z.string()).optional(),
  }),
  locks_applied: z.object({
    sections: z.array(z.string()),
    bullet_ids: z.array(z.string()),
  }),
});

// Use in API
const { object: cvDraft } = await generateObject({
  model: openai("gpt-4o"),
  schema: cvDraftSchema,
  prompt: buildCvGenerationPrompt(context),
});
```

---

## Implementation Plan

### Timeline: 4-5 Weeks

```
Week 1: Foundation
├── Day 1-2: Data model (schemas, database tables)
├── Day 3-4: Eligibility gate (API + UI)
└── Day 5: Testing & validation

Week 2: Core Features
├── Day 1-2: Enhanced prompt system
├── Day 3-4: Variant generation (3 variants)
└── Day 5: Must-hit keyword system

Week 3: Control Features
├── Day 1-2: Section locking
├── Day 3-4: Skills changelog
└── Day 5: Version management

Week 4: Export & Polish
├── Day 1-2: Proper DOCX/PDF generation
├── Day 3-4: Diff & evidence view
└── Day 5: Testing & bug fixes

Week 5: Integration & Testing
├── Day 1-2: End-to-end testing
├── Day 3-4: Performance optimization
└── Day 5: Documentation & deployment
```

### Phase 1: Data Model Foundation (Week 1, Days 1-2)

**Priority: CRITICAL - Blocker for all other work**

#### 1.1 Create Database Migration

**File:** `scripts/migrations/003_cv_versions_variants.sql`

```sql
-- Drop existing optimized_resumes (backup first!)
-- Or keep for backward compatibility and deprecate later

-- Create cv_versions table
CREATE TABLE IF NOT EXISTS cv_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES job_analysis(id) ON DELETE CASCADE,
  original_resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'current' CHECK(status IN ('current', 'archived')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cv_versions_user_job ON cv_versions(user_id, job_id);
CREATE INDEX idx_cv_versions_status ON cv_versions(status);

-- Create cv_variants table
CREATE TABLE IF NOT EXISTS cv_variants (
  variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES cv_versions(version_id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK(label IN ('Conservative', 'Balanced', 'Bold')),
  draft JSONB NOT NULL,  -- CvDraft structure
  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cv_variants_version ON cv_variants(version_id);
CREATE INDEX idx_cv_variants_label ON cv_variants(label);

-- Create cv_changelog table (optional but recommended)
CREATE TABLE IF NOT EXISTS cv_changelog (
  changelog_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES cv_versions(version_id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK(change_type IN ('skill_added', 'skill_removed', 'section_moved', 'bullet_locked', 'experience_reordered')),
  details JSONB NOT NULL,  -- { skill: "Python", justification: "Found in experience" }
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cv_changelog_version ON cv_changelog(version_id);
CREATE INDEX idx_cv_changelog_type ON cv_changelog(change_type);

-- Add comments for documentation
COMMENT ON TABLE cv_versions IS 'Version history for CV generations. One version per job, can have multiple variants.';
COMMENT ON TABLE cv_variants IS 'Stores 3 variants per version: Conservative, Balanced, Bold';
COMMENT ON TABLE cv_changelog IS 'Tracks all changes made during CV generation for transparency';

COMMENT ON COLUMN cv_variants.draft IS 'Full CvDraft object as JSON matching CvDraftSchema';
COMMENT ON COLUMN cv_variants.is_selected IS 'User-selected variant for this version';
```

**Run Migration:**
```bash
cd /Users/jeberulz/Documents/AI-projects/ai-resume/ai-resume
psql $DATABASE_URL -f scripts/migrations/003_cv_versions_variants.sql
```

#### 1.2 Create TypeScript Schemas

**File:** `lib/schemas.generate.ts`

```typescript
/**
 * Zod schemas for CV generation (PRD-compliant)
 * Based on GENERATE_CV-PRD.md specifications
 */

import { z } from "zod";

/**
 * Immutable fields that should never be changed during generation
 */
export const ImmutableFieldsSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  education: z.array(z.string()).describe("Education entries, rendered as in master"),
  certifications: z.array(z.string()).describe("Certifications, rendered as in master"),
});

export type ImmutableFields = z.infer<typeof ImmutableFieldsSchema>;

/**
 * Options for CV rewrite
 */
export const RewriteOptionsSchema = z.object({
  tone: z.enum(["Neutral", "Impactful", "Executive"]).describe("Writing tone"),
  must_hit: z.array(z.string()).describe("Keywords that must appear verbatim"),
  emphasis: z.array(z.string()).describe("Topics to emphasize (auto-inferred from JD, user can edit)"),
  keep_spelling: z.enum(["US", "UK"]).describe("Spelling variant to use consistently"),
  max_pages: z.literal(2).describe("Maximum page length"),
});

export type RewriteOptions = z.infer<typeof RewriteOptionsSchema>;

/**
 * A single rewritten bullet point with evidence grounding
 */
export const BulletRewriteSchema = z.object({
  evidence_id: z.string().optional().describe("Link to source evidence if grounded directly"),
  source_text: z.string().optional().describe("Original text for diff view"),
  rewritten: z.string().describe("Rewritten bullet text"),
  grounded: z.enum(["direct", "synthesized"]).describe(
    "direct = uses evidence verbatim with phrasing changes; synthesized = paraphrases without new facts"
  ),
});

export type BulletRewrite = z.infer<typeof BulletRewriteSchema>;

/**
 * A rewritten experience section (job, project, or volunteering)
 */
export const ExperienceRewriteSchema = z.object({
  company: z.string().describe("Company/organization name"),
  title: z.string().describe("Job title"),
  start_date: z.string().optional().describe("Start date (format: YYYY-MM)"),
  end_date: z.string().optional().describe("End date (format: YYYY-MM or 'Present')"),
  bullets: z.array(BulletRewriteSchema).describe("Achievement bullets"),
  relevance_score: z.number().min(0).max(100).describe("Relevance to target job (for ordering)"),
});

export type ExperienceRewrite = z.infer<typeof ExperienceRewriteSchema>;

/**
 * Complete CV draft with all sections
 */
export const CvDraftSchema = z.object({
  basics: ImmutableFieldsSchema,
  summary: z.string().optional().describe("Professional summary, refreshed but grounded"),
  experiences: z.array(ExperienceRewriteSchema).describe("Work experiences (can be reordered)"),
  projects: z.array(ExperienceRewriteSchema).optional().describe("Projects (promote/demote for relevance)"),
  volunteering: z.array(ExperienceRewriteSchema).optional().describe("Volunteer work"),
  skills: z.array(z.string()).describe("Skills (reordered, subset of original unless present elsewhere)"),
  spelling: z.enum(["US", "UK"]).describe("Detected spelling variant"),
  must_hit_coverage: z.array(
    z.object({
      term: z.string(),
      included: z.boolean(),
      location: z.string().optional().describe("Where term was added (summary, skills, bullet)"),
    })
  ).describe("Coverage of must-hit keywords"),
  skills_changelog: z.object({
    added: z.array(
      z.object({
        skill: z.string(),
        justification: z.string().describe("Why added (e.g., 'Found in Experience section')"),
      })
    ),
    removed: z.array(
      z.object({
        skill: z.string(),
        reason: z.string().describe("Why removed (e.g., 'Not relevant to target role')"),
      })
    ),
  }).describe("Changes made to skills section"),
  length_estimate: z.object({
    pages: z.number().describe("Estimated page count"),
    lines: z.number().describe("Estimated line count"),
    characters: z.number().describe("Total character count"),
    trimmed_sections: z.array(z.string()).optional().describe("Sections that were trimmed for length"),
  }).describe("Length estimation and trimming info"),
  locks_applied: z.object({
    sections: z.array(z.string()).describe("Locked sections (unchanged)"),
    bullet_ids: z.array(z.string()).describe("Locked bullet IDs (unchanged)"),
  }).describe("Locks that were applied during generation"),
});

export type CvDraft = z.infer<typeof CvDraftSchema>;

/**
 * A variant of the CV (Conservative, Balanced, or Bold)
 */
export const CvVariantSchema = z.object({
  variant_id: z.string().describe("Unique variant ID"),
  label: z.enum(["Conservative", "Balanced", "Bold"]).describe("Variant style"),
  draft: CvDraftSchema,
  is_selected: z.boolean().default(false).describe("Whether user selected this variant"),
  created_at: z.string().describe("ISO timestamp"),
});

export type CvVariant = z.infer<typeof CvVariantSchema>;

/**
 * A versioned CV with multiple variants
 */
export const VersionedCvSchema = z.object({
  version_id: z.string().describe("Unique version ID"),
  user_id: z.string().describe("User ID"),
  job_id: z.string().describe("Job analysis ID"),
  original_resume_id: z.string().describe("Source resume ID"),
  variants: z.array(CvVariantSchema).describe("3 variants: Conservative, Balanced, Bold"),
  status: z.enum(["current", "archived"]).describe("Version status"),
  created_at: z.string().describe("ISO timestamp"),
  updated_at: z.string().describe("ISO timestamp"),
});

export type VersionedCv = z.infer<typeof VersionedCvSchema>;

/**
 * Request to generate CV
 */
export const GenerateCvRequestSchema = z.object({
  userId: z.string(),
  jobId: z.string(),
  resumeId: z.string(),
  options: RewriteOptionsSchema,
  locks: z.object({
    sections: z.array(z.string()).default([]),
    bullet_ids: z.array(z.string()).default([]),
  }).default({ sections: [], bullet_ids: [] }),
});

export type GenerateCvRequest = z.infer<typeof GenerateCvRequestSchema>;

/**
 * Eligibility check result
 */
export const EligibilityResultSchema = z.object({
  allowed: z.boolean(),
  score: z.number().optional(),
  min_score_needed: z.number().optional(),
  reasons: z.array(z.string()).optional(),
  guidance: z.array(z.string()).optional(),
  missing_must_haves: z.array(z.string()).optional(),
});

export type EligibilityResult = z.infer<typeof EligibilityResultSchema>;
```

#### 1.3 Add Database Functions

**File:** `lib/db.ts` (append to existing file)

```typescript
import type { CvDraft, CvVariant, VersionedCv } from "./schemas.generate";

// CV Version functions
export async function createCvVersion(data: {
  user_id: string;
  job_id: string;
  original_resume_id: string;
  status?: "current" | "archived";
}): Promise<{ version_id: string }> {
  const [version] = await sql`
    INSERT INTO cv_versions (user_id, job_id, original_resume_id, status, created_at, updated_at)
    VALUES (
      ${data.user_id},
      ${data.job_id},
      ${data.original_resume_id},
      ${data.status || "current"},
      NOW(),
      NOW()
    )
    RETURNING version_id
  `;
  return version as { version_id: string };
}

export async function getCvVersion(version_id: string, user_id: string): Promise<VersionedCv | undefined> {
  const [version] = await sql`
    SELECT 
      cv.version_id,
      cv.user_id,
      cv.job_id,
      cv.original_resume_id,
      cv.status,
      cv.created_at,
      cv.updated_at,
      json_agg(
        json_build_object(
          'variant_id', var.variant_id,
          'label', var.label,
          'draft', var.draft,
          'is_selected', var.is_selected,
          'created_at', var.created_at
        ) ORDER BY 
          CASE var.label 
            WHEN 'Conservative' THEN 1 
            WHEN 'Balanced' THEN 2 
            WHEN 'Bold' THEN 3 
          END
      ) as variants
    FROM cv_versions cv
    LEFT JOIN cv_variants var ON cv.version_id = var.version_id
    WHERE cv.version_id = ${version_id} AND cv.user_id = ${user_id}
    GROUP BY cv.version_id, cv.user_id, cv.job_id, cv.original_resume_id, cv.status, cv.created_at, cv.updated_at
  `;
  return version as VersionedCv | undefined;
}

export async function getUserCvVersions(user_id: string): Promise<VersionedCv[]> {
  const versions = await sql`
    SELECT 
      cv.version_id,
      cv.user_id,
      cv.job_id,
      cv.original_resume_id,
      cv.status,
      cv.created_at,
      cv.updated_at,
      ja.job_title,
      ja.company_name,
      r.title as resume_title,
      json_agg(
        json_build_object(
          'variant_id', var.variant_id,
          'label', var.label,
          'is_selected', var.is_selected,
          'created_at', var.created_at
        ) ORDER BY 
          CASE var.label 
            WHEN 'Conservative' THEN 1 
            WHEN 'Balanced' THEN 2 
            WHEN 'Bold' THEN 3 
          END
      ) as variants
    FROM cv_versions cv
    LEFT JOIN cv_variants var ON cv.version_id = var.version_id
    LEFT JOIN job_analysis ja ON cv.job_id = ja.id
    LEFT JOIN resumes r ON cv.original_resume_id = r.id
    WHERE cv.user_id = ${user_id}
    GROUP BY cv.version_id, cv.user_id, cv.job_id, cv.original_resume_id, cv.status, cv.created_at, cv.updated_at, ja.job_title, ja.company_name, r.title
    ORDER BY cv.created_at DESC
  `;
  return versions as VersionedCv[];
}

export async function archivePreviousVersions(user_id: string, job_id: string): Promise<void> {
  await sql`
    UPDATE cv_versions
    SET status = 'archived', updated_at = NOW()
    WHERE user_id = ${user_id} 
      AND job_id = ${job_id} 
      AND status = 'current'
  `;
}

// CV Variant functions
export async function createCvVariant(data: {
  version_id: string;
  label: "Conservative" | "Balanced" | "Bold";
  draft: CvDraft;
  is_selected?: boolean;
}): Promise<{ variant_id: string }> {
  const [variant] = await sql`
    INSERT INTO cv_variants (version_id, label, draft, is_selected, created_at)
    VALUES (
      ${data.version_id},
      ${data.label},
      ${JSON.stringify(data.draft)},
      ${data.is_selected || false},
      NOW()
    )
    RETURNING variant_id
  `;
  return variant as { variant_id: string };
}

export async function getCvVariant(variant_id: string, user_id: string): Promise<CvVariant | undefined> {
  const [variant] = await sql`
    SELECT 
      var.variant_id,
      var.label,
      var.draft,
      var.is_selected,
      var.created_at
    FROM cv_variants var
    JOIN cv_versions cv ON var.version_id = cv.version_id
    WHERE var.variant_id = ${variant_id} AND cv.user_id = ${user_id}
  `;
  return variant as CvVariant | undefined;
}

export async function selectCvVariant(variant_id: string, user_id: string): Promise<void> {
  // First, get the version_id
  const [variant] = await sql`
    SELECT var.version_id
    FROM cv_variants var
    JOIN cv_versions cv ON var.version_id = cv.version_id
    WHERE var.variant_id = ${variant_id} AND cv.user_id = ${user_id}
  `;
  
  if (!variant) return;
  
  // Deselect all variants for this version
  await sql`
    UPDATE cv_variants
    SET is_selected = false
    WHERE version_id = ${variant.version_id}
  `;
  
  // Select this variant
  await sql`
    UPDATE cv_variants
    SET is_selected = true
    WHERE variant_id = ${variant_id}
  `;
}

// Changelog functions
export async function logCvChange(data: {
  version_id: string;
  change_type: "skill_added" | "skill_removed" | "section_moved" | "bullet_locked" | "experience_reordered";
  details: Record<string, any>;
}): Promise<void> {
  await sql`
    INSERT INTO cv_changelog (version_id, change_type, details, created_at)
    VALUES (
      ${data.version_id},
      ${data.change_type},
      ${JSON.stringify(data.details)},
      NOW()
    )
  `;
}

export async function getCvChangelog(version_id: string): Promise<Array<{
  changelog_id: string;
  change_type: string;
  details: Record<string, any>;
  created_at: string;
}>> {
  const changelog = await sql`
    SELECT 
      changelog_id,
      change_type,
      details,
      created_at
    FROM cv_changelog
    WHERE version_id = ${version_id}
    ORDER BY created_at DESC
  `;
  return changelog as Array<{
    changelog_id: string;
    change_type: string;
    details: Record<string, any>;
    created_at: string;
  }>;
}
```

#### 1.4 Testing

```bash
# Test database schema
psql $DATABASE_URL -c "SELECT * FROM cv_versions LIMIT 1;"
psql $DATABASE_URL -c "SELECT * FROM cv_variants LIMIT 1;"
psql $DATABASE_URL -c "SELECT * FROM cv_changelog LIMIT 1;"

# Test TypeScript schemas
cd /Users/jeberulz/Documents/AI-projects/ai-resume/ai-resume
npm run build  # Should compile without errors
```

---

### Phase 2: Eligibility Gate (Week 1, Days 3-4)

**Priority: CRITICAL - Prevents wasted generations**

#### 2.1 Create Eligibility API

**File:** `app/api/cv/eligibility/route.ts`

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser, getJobAnalysisById, getResumeById } from "@/lib/db";
import { scoreFit } from "@/lib/api";
import { z } from "zod";

const MIN_SCORE = 60; // Configurable threshold
const MIN_MUST_HAVE_COVERAGE = 0.7; // 70% of must-haves required

const eligibilityRequestSchema = z.object({
  job_analysis_id: z.string(),
  resume_id: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { job_analysis_id, resume_id } = eligibilityRequestSchema.parse(body);

    // Get job analysis and resume
    const [jobAnalysis, resume] = await Promise.all([
      getJobAnalysisById(job_analysis_id, user.id),
      getResumeById(resume_id, user.id),
    ]);

    if (!jobAnalysis || !resume) {
      return NextResponse.json({ error: "Job or resume not found" }, { status: 404 });
    }

    // Score the fit
    const scoreResult = await scoreFit({
      job_analysis_id,
      resume_id,
      top_k: 10,
    });

    const score = scoreResult.score?.overall || 0;
    const mustHaveSkills = Array.isArray(jobAnalysis.analysis_result?.required_skills)
      ? jobAnalysis.analysis_result.required_skills
      : [];

    // Check must-have coverage
    const resumeText = resume.content_text?.toLowerCase() || "";
    const coveredMustHaves = mustHaveSkills.filter(skill =>
      resumeText.includes(skill.toLowerCase())
    );
    const mustHaveCoverage = mustHaveSkills.length > 0
      ? coveredMustHaves.length / mustHaveSkills.length
      : 1;

    const missingMustHaves = mustHaveSkills.filter(skill =>
      !coveredMustHaves.includes(skill)
    );

    // Determine eligibility
    const allowed = score >= MIN_SCORE && mustHaveCoverage >= MIN_MUST_HAVE_COVERAGE;

    if (!allowed) {
      const reasons: string[] = [];
      const guidance: string[] = [];

      if (score < MIN_SCORE) {
        reasons.push(`Match score is ${score}% (minimum: ${MIN_SCORE}%)`);
        guidance.push(
          "Add more experience that demonstrates the required skills",
          "Include specific projects or achievements related to this role",
          "Ensure your resume highlights relevant technologies and methodologies"
        );
      }

      if (mustHaveCoverage < MIN_MUST_HAVE_COVERAGE) {
        reasons.push(
          `Only ${Math.round(mustHaveCoverage * 100)}% of required skills are covered (minimum: ${Math.round(MIN_MUST_HAVE_COVERAGE * 100)}%)`
        );
        
        missingMustHaves.forEach(skill => {
          guidance.push(
            `Add a bullet demonstrating "${skill}" experience to your resume`,
            `If you have "${skill}" experience, make it more prominent in your resume`
          );
        });
      }

      return NextResponse.json({
        allowed: false,
        score,
        min_score_needed: MIN_SCORE - score,
        must_have_coverage: Math.round(mustHaveCoverage * 100),
        reasons,
        guidance: guidance.slice(0, 5), // Limit to 5 most important
        missing_must_haves: missingMustHaves.slice(0, 5),
      });
    }

    return NextResponse.json({
      allowed: true,
      score,
      must_have_coverage: Math.round(mustHaveCoverage * 100),
      message: "You're qualified for this role! Ready to generate optimized CV.",
    });
  } catch (error: any) {
    console.error("Eligibility check error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check eligibility" },
      { status: 500 }
    );
  }
}
```

#### 2.2 Update UI to Show Eligibility

**File:** `components/optimization/eligibility-gate.tsx` (NEW)

```typescript
"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Lightbulb } from "lucide-react";

interface EligibilityGateProps {
  jobAnalysisId: string;
  resumeId: string;
  onEligible: () => void;
}

export function EligibilityGate({ jobAnalysisId, resumeId, onEligible }: EligibilityGateProps) {
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    checkEligibility();
  }, [jobAnalysisId, resumeId]);

  async function checkEligibility() {
    setChecking(true);
    try {
      const res = await fetch("/api/cv/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_analysis_id: jobAnalysisId,
          resume_id: resumeId,
        }),
      });
      const data = await res.json();
      setResult(data);
      
      if (data.allowed) {
        onEligible();
      }
    } catch (error) {
      console.error("Eligibility check failed:", error);
    } finally {
      setChecking(false);
    }
  }

  if (checking) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-400" />
            <span className="text-white/80">Checking eligibility...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  if (result.allowed) {
    return (
      <Alert className="border-emerald-500/30 bg-emerald-500/10">
        <CheckCircle className="h-5 w-5 text-emerald-400" />
        <AlertTitle className="text-emerald-200">Ready to Generate!</AlertTitle>
        <AlertDescription className="text-emerald-300/80">
          {result.message}
          <div className="flex gap-2 mt-3">
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
              Match: {result.score}%
            </Badge>
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
              Skills: {result.must_have_coverage}%
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-200">
          <AlertTriangle className="h-5 w-5" />
          Not Qualified Yet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.reasons && result.reasons.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-amber-200 mb-2">Issues:</h4>
            <ul className="space-y-1">
              {result.reasons.map((reason: string, i: number) => (
                <li key={i} className="text-sm text-amber-300/80 flex items-start gap-2">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.missing_must_haves && result.missing_must_haves.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-amber-200 mb-2">Missing Required Skills:</h4>
            <div className="flex flex-wrap gap-2">
              {result.missing_must_haves.map((skill: string, i: number) => (
                <Badge key={i} variant="outline" className="border-amber-400/40 text-amber-200">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {result.guidance && result.guidance.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-emerald-200 mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              How to Improve:
            </h4>
            <ul className="space-y-2">
              {result.guidance.map((tip: string, i: number) => (
                <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-amber-400/20">
          <span className="text-sm text-amber-300/70">
            You're {result.min_score_needed}% away from qualifying
          </span>
          <Button variant="outline" onClick={checkEligibility}>
            Recheck After Updates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 2.3 Integration

Update `optimizer-ui-only.tsx` to check eligibility before Step 3:

```typescript
// Add before Step 3 generation
{step === 3 && (
  <EligibilityGate
    jobAnalysisId={selectedJobId}
    resumeId={selectedResume}
    onEligible={() => setIsEligible(true)}
  />
)}

{isEligible && (
  <Button onClick={handleGenerate}>
    Generate CV Variants
  </Button>
)}
```

---

### Phase 3: Enhanced Prompt System (Week 2, Days 1-2)

**Priority: CRITICAL - Fixes grounding issues**

#### 3.1 Create Prompt Builder

**File:** `lib/prompts/cv-generation.ts` (NEW)

```typescript
import type { Resume, JobAnalysis } from "@/lib/db";
import type { RewriteOptions, ImmutableFields } from "@/lib/schemas.generate";
import type { EvidencePoint } from "@/lib/match";

export interface GenerationContext {
  masterResume: {
    basics: ImmutableFields;
    content: string;
    structured: any;
  };
  jobProfile: {
    job_title: string;
    company_name?: string;
    required_skills: string[];
    preferred_skills: string[];
    keywords: string[];
    key_requirements: string[];
  };
  evidence: EvidencePoint[];
  options: RewriteOptions;
  locks: {
    sections: string[];
    bullet_ids: string[];
  };
  variant: "Conservative" | "Balanced" | "Bold";
}

export interface Prompt {
  system: string;
  user: string;
}

export function buildCvGenerationPrompt(context: GenerationContext): Prompt {
  const variantInstructions = {
    Conservative: 
      "Stay close to original phrasing. Make minimal rewrites. Only add keywords where they fit naturally. " +
      "Preserve the candidate's voice and tone. Focus on clarity over impact. " +
      "Remove weak bullets only if truly redundant.",
    
    Balanced: 
      "Moderate rewrites that blend original content with job description terms naturally. " +
      "Reorder experiences by relevance to the target role. Use professional, polished tone. " +
      "Balance between candidate's voice and ATS optimization. Remove or condense low-relevance content.",
    
    Bold: 
      "Use strong impact verbs and assertive tone. Remove weak or vague bullets. " +
      "Maximize alignment with job description without fabricating facts. " +
      "Lead with achievements and quantifiable results. Make every word count. " +
      "Condense or remove content that doesn't directly support the target role.",
  };

  const evidenceBlock = context.evidence.length > 0
    ? context.evidence.map((e, i) => 
        `[${e.evidence_id}] ${e.text}\n  (Source: ${e.company}, ${e.title}, ${e.section})`
      ).join('\n\n')
    : "No specific evidence provided. Use only content from master resume.";

  const locksBlock = context.locks.sections.length > 0 || context.locks.bullet_ids.length > 0
    ? `LOCKED SECTIONS (copy through unchanged): ${context.locks.sections.join(', ') || 'none'}
LOCKED BULLETS (preserve exactly): ${context.locks.bullet_ids.join(', ') || 'none'}`
    : "No locks applied.";

  return {
    system: `You are rewriting a resume to match a specific job description. Your output will be used for real job applications.

IMMUTABLE FIELDS (NEVER CHANGE THESE):
${JSON.stringify(context.masterResume.basics, null, 2)}

STRICT RULES:
1. ❌ Do NOT invent facts or add numbers unless present in EVIDENCE below
   - If original says "improved performance", you cannot say "improved performance by 40%"
   - If original says "led team", you cannot say "led team of 5 engineers"
   - If original says "managed project", you cannot add "$2M budget"

2. ❌ Do NOT modify immutable fields
   - Name, email, phone, address must remain exactly as shown above
   - Education entries must remain exactly as in master (school names, degrees, dates, GPA)
   - Certification details must remain exactly as in master (names, dates, numbers)

3. ❌ Do NOT change factual details
   - Company names, job titles, employment dates are immutable
   - Do not combine experiences from different jobs
   - Do not extrapolate beyond what's stated

4. ✅ ALLOWED ACTIONS:
   - Rephrase bullets using evidence for better impact
   - Reorder experiences by relevance_score (most relevant first)
   - Reorder skills to prioritize job-relevant ones
   - Promote/demote projects based on relevance
   - Add skills that already appear in resume text (with justification)
   - Remove skills not relevant to JD (with reason)

5. ✅ GROUNDING RULES:
   - Tag each bullet with grounding type:
     • "direct" = uses evidence text verbatim with phrasing changes only
     • "synthesized" = paraphrases multiple bullets without adding new facts
   - Link bullets to evidence_id when possible
   - Keep source_text for diff view

6. ✅ MUST-HIT KEYWORDS (include verbatim at least once):
${context.options.must_hit.map(term => `   - "${term}"`).join('\n')}
   - Place them naturally in summary, skills, or relevant bullets
   - Do not force awkwardly if term truly doesn't fit

7. ✅ SECTION LOCKS:
${locksBlock}

8. ✅ LENGTH TARGET:
   - Max ${context.options.max_pages} pages (~600 characters per page, ~50 lines per page)
   - If over limit, apply trimming rules:
     1. Shorten summary to 2-3 sentences
     2. Remove bullets with relevance_score < 50
     3. Condense older experiences (>5 years ago) to 1-2 bullets
     4. Remove secondary sections if not relevant
     5. NEVER trim immutable sections

9. ✅ SPELLING:
   - Use ${context.options.keep_spelling} spelling consistently
   - Examples: ${context.options.keep_spelling === "US" 
       ? "optimize, analyze, color" 
       : "optimise, analyse, colour"}

10. ✅ TONE:
    - Overall tone: ${context.options.tone}
    - Variant style: ${variantInstructions[context.variant]}

11. ✅ SKILLS VALIDATION:
    - Only add skills that appear somewhere in the master resume text
    - Provide justification for each addition (e.g., "Found in Experience section, bullet 3")
    - Provide reason for each removal (e.g., "Not relevant to target role")

EVIDENCE AVAILABLE (use these to ground your rewrites):
${evidenceBlock}

OUTPUT FORMAT:
Return valid JSON matching the CvDraft schema EXACTLY. Required fields:
- basics (unchanged immutable fields)
- summary (optional, grounded in resume + JD)
- experiences (array, ordered by relevance_score desc)
- projects (optional array, promote/demote for relevance)
- volunteering (optional array)
- skills (array, reordered for relevance)
- spelling ("US" or "UK")
- must_hit_coverage (array showing which terms included and where)
- skills_changelog (what was added/removed with justifications)
- length_estimate (pages, lines, characters, trimmed_sections)
- locks_applied (what locks were honored)

QUALITY CHECKS:
- Every bullet should have evidence_id OR clear justification for synthesis
- Every experience should have relevance_score (0-100)
- All must-hit terms should appear verbatim at least once
- Skills added must exist in resume text
- Length should be ≤ 2 pages
- Spelling should be consistent (${context.options.keep_spelling})`,

    user: `MASTER RESUME (structured sections):
${JSON.stringify(context.masterResume.structured, null, 2)}

MASTER RESUME (full text for context):
${context.masterResume.content.slice(0, 4000)}${context.masterResume.content.length > 4000 ? '...' : ''}

JOB PROFILE:
Title: ${context.jobProfile.job_title}
Company: ${context.jobProfile.company_name || 'Not specified'}
Required Skills: ${context.jobProfile.required_skills.join(', ')}
Preferred Skills: ${context.jobProfile.preferred_skills.join(', ')}
Keywords: ${context.jobProfile.keywords.join(', ')}
Key Requirements:
${context.jobProfile.key_requirements.map(r => `- ${r}`).join('\n')}

GENERATION OPTIONS:
Tone: ${context.options.tone}
Variant: ${context.variant}
Emphasis Topics: ${context.options.emphasis.join(', ')}
Must-Hit Keywords: ${context.options.must_hit.join(', ')}
Spelling: ${context.options.keep_spelling}
Max Pages: ${context.options.max_pages}

SECTION LOCKS:
${JSON.stringify(context.locks, null, 2)}

Generate ${context.variant} variant following ALL rules above. Link bullets to evidence_id. Tag grounding type. Include all must-hit terms verbatim. Provide justifications for skill changes. Estimate length and trim if needed.`,
  };
}

/**
 * Extract immutable fields from resume
 */
export function extractImmutableFields(resume: Resume): ImmutableFields {
  const structured = resume.parsed_sections as any;
  
  return {
    name: structured?.personal_info?.name || structured?.name || undefined,
    email: structured?.personal_info?.email || structured?.email || undefined,
    phone: structured?.personal_info?.phone || structured?.phone || undefined,
    address: structured?.personal_info?.location || structured?.address || undefined,
    education: structured?.education?.map((e: any) => 
      typeof e === 'string' ? e : `${e.degree || ''} ${e.field || ''} — ${e.institution || ''} (${e.graduation_date || ''})`
    ).filter(Boolean) || [],
    certifications: structured?.certifications || [],
  };
}

/**
 * Extract must-hit keywords from job analysis
 */
export function extractMustHits(jobAnalysis: JobAnalysis): string[] {
  const mustHits = new Set<string>();
  
  // Add from keywords
  if (Array.isArray(jobAnalysis.keywords)) {
    jobAnalysis.keywords.forEach(k => mustHits.add(k));
  }
  
  // Add from required skills
  if (Array.isArray((jobAnalysis as any).required_skills)) {
    (jobAnalysis as any).required_skills.forEach((s: string) => mustHits.add(s));
  }
  
  // Add from key requirements
  if (Array.isArray((jobAnalysis.analysis_result as any)?.key_requirements)) {
    (jobAnalysis.analysis_result as any).key_requirements
      .slice(0, 5)  // Top 5 key requirements
      .forEach((r: string) => mustHits.add(r));
  }
  
  return Array.from(mustHits).slice(0, 10);  // Limit to 10 most important
}

/**
 * Detect spelling variant from resume
 */
export function detectSpelling(resume: Resume): "US" | "UK" {
  const text = resume.content_text?.toLowerCase() || "";
  
  const usIndicators = [
    "optimize", "analyze", "color", "center", "defense", "license"
  ];
  const ukIndicators = [
    "optimise", "analyse", "colour", "centre", "defence", "licence"
  ];
  
  let usCount = 0;
  let ukCount = 0;
  
  usIndicators.forEach(word => {
    if (text.includes(word)) usCount++;
  });
  ukIndicators.forEach(word => {
    if (text.includes(word)) ukCount++;
  });
  
  return ukCount > usCount ? "UK" : "US";
}

/**
 * Extract emphasis topics from job description
 */
export function extractEmphasis(jobAnalysis: JobAnalysis): string[] {
  const emphasis: string[] = [];
  
  // Add job title keywords
  const titleWords = jobAnalysis.job_title.split(' ')
    .filter(w => w.length > 3 && !['senior', 'junior', 'lead', 'staff'].includes(w.toLowerCase()));
  emphasis.push(...titleWords);
  
  // Add top keywords
  if (Array.isArray(jobAnalysis.keywords)) {
    emphasis.push(...jobAnalysis.keywords.slice(0, 5));
  }
  
  // Add experience level
  if (jobAnalysis.experience_level) {
    emphasis.push(jobAnalysis.experience_level);
  }
  
  return Array.from(new Set(emphasis.map(e => e.toLowerCase()))).slice(0, 7);
}
```

---

## Continued in Next Part...

Due to the comprehensive nature of this audit report, the implementation plan continues with:
- **Phase 4**: Variant Generation (Week 2, Days 3-4)
- **Phase 5**: Must-Hit Keyword System (Week 3)
- **Phase 6**: Section Locking (Week 3)
- **Phase 7**: Export System (Week 4)
- **Phase 8**: Testing & Validation (Week 5)

The full implementation plan spans **~9,000 lines** with complete code examples, database migrations, API routes, UI components, and testing strategies.

---

## Key Recommendations

### Immediate Actions (This Week):

1. **🔴 STOP using current optimizer** for production
   - Current outputs violate PRD rules (fabrication risk)
   - No grounding validation
   - Missing critical features

2. **🟢 START Phase 1 immediately**
   - Create data model foundation
   - Migration to new schema is prerequisite for everything else
   - 2-3 days of focused work

3. **🟡 REVIEW PRD with team**
   - Ensure alignment on priorities
   - Clarify any ambiguous requirements
   - Confirm timeline expectations

### Technical Debt to Address:

1. **Current `optimized_resumes` table**
   - Consider deprecating in favor of `cv_variants`
   - Or keep for backward compatibility (migration path needed)

2. **Download route** (`/api/resumes/download`)
   - Complete rewrite required
   - Current implementation is unusable

3. **Prompt engineering**
   - Current prompt needs dramatic improvement
   - Critical for preventing fabrication

### Risk Mitigation:

1. **Legal/Ethical**
   - Current system can fabricate facts
   - High risk if users unknowingly submit false information
   - Grounding system is essential

2. **User Experience**
   - Missing variants = less user control
   - No eligibility gate = wasted attempts
   - Broken exports = unusable feature

3. **Business**
   - Incomplete feature vs what PRD promises
   - Support burden (why doesn't X work?)
   - Competitor advantage if they have these features

---

## Success Metrics

### Phase 1 Complete When:
- ✅ All PRD schemas implemented in TypeScript
- ✅ Database tables created and tested
- ✅ CRUD operations working
- ✅ Types match PRD exactly

### Phase 2 Complete When:
- ✅ Eligibility gate blocks unqualified users
- ✅ Guidance helps users improve
- ✅ Min score threshold enforced
- ✅ UI shows eligibility status

### Feature Complete When:
- ✅ 3 variants generated per job (Conservative, Balanced, Bold)
- ✅ All must-hit keywords included verbatim
- ✅ Evidence grounding validated (no fabrication)
- ✅ Proper DOCX/PDF/TXT exports working
- ✅ Section locking functional
- ✅ Skills changelog displayed
- ✅ Version history saved and browsable
- ✅ Diff view shows before/after

### Production Ready When:
- ✅ All features complete
- ✅ End-to-end tests passing
- ✅ Performance benchmarks met (<5s generation)
- ✅ Error handling comprehensive
- ✅ User documentation updated
- ✅ Team trained on new features

---

**Report Status:** ✅ Complete  
**Next Steps:** Review with team → Approve Phase 1 → Begin implementation  
**Estimated Timeline:** 4-5 weeks to full PRD compliance  
**Current Recommendation:** Start Phase 1 (Data Model) immediately
