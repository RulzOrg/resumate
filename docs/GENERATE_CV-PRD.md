GENERATE_CV_PRD.md

Add a “Generate CV” step that rewrites the user’s resume for a target job while preserving the master resume’s structure. Content is updated to match the job description with evidence-grounded rewrites, no fabricated numbers, and hard must-hit keywords. Users can lock sections, review diffs, manage variants, and export to DOCX, PDF, and ATS-safe plain text.

Objectives

Keep the same sections, headings, and bullet structure as the user’s master resume.

Rewrite experience to align with the job description.

Allow reasonable synthesis of phrasing, avoid numbers unless already present.

Reorder experiences for relevance. The user can edit afterwards.

Add or remove skills only when present elsewhere in the resume. Log all changes and notify the user.

Promote or demote projects and volunteering for relevance.

Include hard must-hit keywords from the job description verbatim.

Block generation when the user is not qualified. Provide guidance to close gaps.

Generate multiple variants per job, save versions, allow restore and compare.

Keep outputs within 2 pages. Provide trimming rules.

Detect spelling style from the master resume and keep it consistent.

Export to DOCX, PDF, and ATS-safe TXT.

Scope
Inputs

Master resume (already parsed to ResumeExtracted).

Job profile from previous step (JobProfile).

Match score + missing must-haves from the Optimize step.

Optional emphasis tags auto-inferred from JD. The user can add or remove.

Outputs

CvDraft object representing the rewritten resume.

ChangeLog for skills and section moves.

One or more CvVariant objects.

Exports: .docx, .pdf, .txt.

Guardrails and rules

Grounding
Bullets must draw from resume evidence or safe synthesis without adding new facts. Do not invent metrics. If the original has a number, you can keep it.

Structure fidelity
Keep the master resume’s sections. You can reorder experiences and projects for relevance. Do not change immutable sections: name, email, phone, address, education, school names, certifications.

Keywords
Include hard must-hit terms verbatim at least once where natural.

Tone
User picks tone in the UI. Keep bullets to 1–2 lines. Start with a strong verb. No fluff.

Length
Target 2 pages. If longer, apply trimming rules below.

Skills
You can add or remove skills only if they already appear in the master resume text. Log each change and present it to the user.

Spelling
Detect UK vs US from the master resume. Keep it consistent.

Eligibility gate
If match score is below the threshold or there are missing must-haves, block generation and show guidance.

Compliance
Only accept resume files. Abort if uploaded content is not resume-like.

Data model additions
// lib/schemas.generate.ts

export type ImmutableFields = {
  name: string | undefined
  email: string | undefined
  phone: string | undefined
  address?: string
  education: string[]         // rendered as in master
  certifications: string[]
}

export type RewriteOptions = {
  tone: "Neutral" | "Impactful" | "Executive"
  must_hit: string[]          // from JD analysis
  emphasis: string[]          // inferred from JD; user can edit
  keep_spelling: "US" | "UK"
  max_pages: 2
}

export type BulletRewrite = {
  evidence_id?: string        // present if directly grounded
  source_text?: string        // for diff view
  rewritten: string
  grounded: "direct" | "synthesized" // synthesized must not add numbers
}

export type ExperienceRewrite = {
  company: string
  title: string
  bullets: BulletRewrite[]
  relevance_score: number     // for ordering
}

export type CvDraft = {
  basics: ImmutableFields
  summary?: string            // refreshed but grounded in resume + JD
  experiences: ExperienceRewrite[]  // can be re-ordered
  projects?: ExperienceRewrite[]    // promote/demote
  volunteering?: ExperienceRewrite[]
  skills: string[]            // reordered, subset of original unless present elsewhere
  spelling: "US" | "UK"
  must_hit_coverage: { term: string; included: boolean }[]
  skills_changelog: { added: string[]; removed: string[] }
  length_estimate: { pages: number; lines: number }
  locks: { section: string; bullet_ids: string[] } // updated by user
}

export type CvVariant = {
  variant_id: string
  label: "Conservative" | "Balanced" | "Bold"
  draft: CvDraft
  created_at: string
}

export type VersionedCv = {
  version_id: string
  job_id: string
  variants: CvVariant[]
  created_at: string
  status: "current" | "archived"
}

Persistence

Add tables or Prisma models:

cv_versions with version_id, user_id, job_id, status, timestamps.

cv_variants with variant_id, version_id, label, JSON draft.

cv_changelog optional for skills changes and moves.

API surface
1) Eligibility gate

POST /api/cv/eligibility

Input: { userId, jobProfile, score, missing_must_haves }
Output: { allowed: boolean, reasons?: string[], guidance?: string[] }

Rules:

Allowed if score >= MIN_SCORE and missing_must_haves.length === 0.

Else blocked with a list of missing items and guidance, for example:

“Add a bullet that shows Python production experience.”

“Include the job title ‘Senior Product Designer’ in your resume summary.”

2) Generate variants

POST /api/cv/generate

Input:

{
  "userId": "u1",
  "jobId": "j1",
  "options": { "tone": "Impactful", "emphasis": ["APIs","Roadmapping"], "must_hit": ["Figma","User research"], "keep_spelling": "UK", "max_pages": 2 },
  "locks": { "section": "Education", "bullet_ids": [] }
}


Output:

{
  "version_id": "v1",
  "variants": [
    { "variant_id": "v1a", "label": "Conservative", "draft": { ... } },
    { "variant_id": "v1b", "label": "Balanced", "draft": { ... } },
    { "variant_id": "v1c", "label": "Bold", "draft": { ... } }
  ]
}


Behavior:

Creates three variants with increasing assertiveness in phrasing.

Applies locks.

Reorders experiences by computed relevance.

Ensures must-hit terms are included verbatim.

No new numbers unless present in evidence.

3) Re-generate one variant

POST /api/cv/regenerate-variant
Input: { version_id, variant_id, options_delta, locks }
Output: { variant: CvVariant }

4) Save and set current

POST /api/cv/save
Input: { version: VersionedCv }
Output: { ok: true }

5) Diff and evidence

POST /api/cv/diff
Input: { variant_id }
Output: array of { section, before, after, evidence_id? }

6) Export

POST /api/cv/export/docx → returns a DOCX file

POST /api/cv/export/pdf → returns a PDF file

POST /api/cv/export/txt → returns ATS-safe plain text

Rewrite algorithm
A. Compute relevance

Query Qdrant with JD must-haves + top responsibilities.

Score each original experience by overlap with retrieved evidence.

Produce a relevance_score per experience.

B. Build must-hit list

From JobProfile.keywords and must_have_skills.

Mark which are already present.

C. Bullet rewriting

For each original bullet:

If locked, copy through unchanged.

Else:

Find nearest evidence bullet(s).

Rewrite to align with JD emphasis and tone.

Do not add numbers that are not in evidence.

Prefer verbs and impact language without metrics if none exist.

Tag as grounded: "direct" when using evidence text verbatim with phrasing changes.

Tag as grounded: "synthesized" when paraphrasing across bullets without new facts.

D. Must-hit placement

If a must-hit term is not present, add it once in a natural location:

Summary, skills, or one relevant bullet.

Never add a skill that does not appear anywhere in the master resume text.

E. Skills changelog

Added skills = found elsewhere in resume text but not in skills section.

Removed skills = not relevant to JD and not present elsewhere.

Return skills_changelog for UI notification.

F. Spelling detection

Detect US vs UK based on top n-grams in master resume, for example “optimise” vs “optimize”.

Set keep_spelling accordingly.

G. Two-page fit

Estimate lines per section with a simple model: characters per line target and lines per page.

Trim order:

Long summaries

Low-relevance bullets within experiences

Secondary sections like older volunteering

Never trim immutable sections.

Return length_estimate and a list of what was trimmed.

Prompts and JSON schema

Use your existing JSON-schema forcing. Example system prompt for variant generation:

System

You are rewriting a resume to match a specific job. Keep the master resume structure and immutable fields. 
Allowed synthesis: rephrase and reorder. Do not invent facts. Do not add numbers unless present in evidence.
Include hard must-hit terms verbatim exactly once where natural. 
Use the provided spelling variant consistently. 
Max two pages. Keep bullets to 1–2 lines with strong verbs.
Return JSON that matches the CvDraft schema exactly.


User

MasterResumeJSON:
<ResumeExtracted JSON here>

JobProfile:
<JobProfile JSON here>

Evidence:
<top evidence bullets with evidence_id, text, company, title>

Options:
<RewriteOptions JSON here>

Locks:
<locks JSON here>


Response format
Use the CvDraft JSON schema. Validate with Zod.

Diff and evidence view

Store source_text for each rewritten bullet.

A client toggle shows “Evidence” under each bullet.

The diff view highlights additions and removals.

Locked bullets render a small lock icon.

Variants

“Conservative” keeps phrasing close to the source.

“Balanced” is a moderate rewrite with JD terms blended in.

“Bold” uses strong impact verbs and removes weak bullets, still without new numbers.

Store variants under one version_id. The user can mark one as current.

Exports
DOCX

Use a minimal template that mirrors the master structure.

Map sections and bullets from CvDraft.

Respect the spelling variant.

Keep fonts generic to stay ATS-safe.

PDF

Render the same DOCX server-side or use HTML to PDF.

Keep page count to two.

ATS TXT

Plain section headers and bullets.

One skill per line in the skills section.

Strip ornamentation.

Failure cases and UX

Blocked by eligibility
Show guidance items. Let the user add evidence or pick a different resume.

Must-hit collisions
If a term feels forced in a bullet, place it in the summary or skills.

Over-length
Show a “Trimmed for fit” list with an undo option.

Non-resume upload
Abort earlier in the pipeline. Show “We only support resumes.”

Acceptance criteria

Generation preserves structure and immutable fields.

No fabricated numbers.

Must-hit terms included verbatim.

Experiences reordered by relevance.

Skills changes logged and visible to the user.

Variants saved with version history and compare.

Exports available in DOCX, PDF, and TXT.

Output fits in two pages or returns a clear trimmed list.

Diff and evidence toggles work.