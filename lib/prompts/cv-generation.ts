import type { Resume, JobAnalysis } from "@/lib/db";
import type { RewriteOptions, ImmutableFields, GenerationContext } from "@/lib/schemas.generate";

/**
 * Prompt structure for CV generation
 */
export interface Prompt {
  system: string;
  user: string;
}

/**
 * Build PRD-compliant CV generation prompt with strict grounding rules
 * Prevents fabrication and enforces evidence-based rewrites
 */
export function buildCvGenerationPrompt(context: GenerationContext): Prompt {
  const variantInstructions = {
    Conservative: 
      "Stay close to original phrasing. Make minimal rewrites. Only add keywords where they fit naturally. " +
      "Preserve the candidate's voice and tone. Focus on clarity over impact. " +
      "Remove weak bullets only if truly redundant. Err on the side of caution.",
    
    Balanced: 
      "Moderate rewrites that blend original content with job description terms naturally. " +
      "Reorder experiences by relevance to the target role. Use professional, polished tone. " +
      "Balance between candidate's voice and ATS optimization. Remove or condense low-relevance content. " +
      "This is the default style most users prefer.",
    
    Bold: 
      "Use strong impact verbs and assertive tone. Remove weak or vague bullets. " +
      "Maximize alignment with job description without fabricating facts. " +
      "Lead with achievements and quantifiable results that already exist. Make every word count. " +
      "Condense or remove content that doesn't directly support the target role.",
  };

  const evidenceBlock = context.evidence.length > 0
    ? context.evidence.map((e: any, i: number) => {
        const metadata = e.metadata || {};
        return `[${e.id || i}] ${e.text}\n  → Source: Resume section: ${metadata.section || 'unknown'}`;
      }).join('\n\n')
    : "No specific evidence provided. Use only content from master resume.";

  const locksBlock = context.locks.sections.length > 0 || context.locks.bullet_ids.length > 0
    ? `LOCKED SECTIONS (copy unchanged): ${context.locks.sections.join(', ') || 'none'}\nLOCKED BULLETS (preserve exactly): ${context.locks.bullet_ids.join(', ') || 'none'}`
    : "No section or bullet locks applied.";

  const mustHitBlock = context.options.must_hit.length > 0
    ? context.options.must_hit.map(term => `- "${term}"`).join('\n')
    : "No specific must-hit keywords specified.";

  return {
    system: `You are rewriting a resume to match a specific job description. Your output will be used for real job applications where accuracy is critical.

🔒 IMMUTABLE FIELDS (NEVER CHANGE THESE):
${JSON.stringify(context.masterResume.basics, null, 2)}

❌ STRICTLY FORBIDDEN ACTIONS:
1. Do NOT invent facts or add numbers unless present in EVIDENCE below
   - If original says "improved performance", you CANNOT say "improved performance by 40%"
   - If original says "led team", you CANNOT say "led team of 5 engineers"
   - If original says "managed project", you CANNOT add "$2M budget"
   - If original says "increased sales", you CANNOT add "by 25%"

2. Do NOT modify immutable fields
   - Name, email, phone, address must remain exactly as shown above
   - Education entries must remain exactly as in master (school names, degrees, dates, GPA)
   - Certification details must remain exactly as in master (names, dates, license numbers)

3. Do NOT change factual details
   - Company names, job titles, employment dates are immutable
   - Do not combine experiences from different jobs
   - Do not extrapolate beyond what's explicitly stated

✅ ALLOWED ACTIONS:
1. Rephrase bullets using evidence for better impact (but same facts)
2. Reorder experiences by relevance_score (most relevant first)
3. Reorder skills to prioritize job-relevant ones
4. Promote/demote projects based on relevance to target role
5. Add skills that already appear in resume text (with justification)
6. Remove skills not relevant to job description (with reason)
7. Adjust professional summary to align with role (grounded in resume + JD)

🎯 GROUNDING REQUIREMENTS:
- Tag each bullet with grounding type:
  • "direct" = uses evidence text verbatim with phrasing changes only
  • "synthesized" = paraphrases multiple bullets without adding new facts
- Link bullets to evidence_id when possible
- Keep source_text for diff view
- Every claim must be traceable to original resume content

🔑 MUST-HIT KEYWORDS (include verbatim at least once):
${mustHitBlock}
- Place them naturally in summary, skills, or relevant bullets
- Do not force awkwardly if term truly doesn't fit the candidate's experience
- Mark in must_hit_coverage where each term was placed

🔒 SECTION LOCKS:
${locksBlock}

📏 LENGTH CONSTRAINTS:
- Target max ${context.options.max_pages} pages (~600 characters per page, ~50 lines per page)
- If over limit, apply trimming rules:
  1. Shorten summary to 2-3 concise sentences
  2. Remove bullets with relevance_score < 50
  3. Condense older experiences (>5 years ago) to 1-2 strongest bullets
  4. Remove secondary sections if not relevant to role
  5. NEVER trim immutable sections (education, certifications)
- Estimate final length in characters, lines, and pages

🌍 SPELLING CONSISTENCY:
- Use ${context.options.keep_spelling} spelling throughout
- Examples: ${context.options.keep_spelling === "US" 
    ? "optimize, analyze, color, center, defense" 
    : "optimise, analyse, colour, centre, defence"}

🎭 TONE AND STYLE:
- Overall tone: ${context.options.tone}
- Variant approach: ${variantInstructions[context.variant]}
- Keep bullets to 1-2 lines maximum
- Start bullets with strong action verbs
- No fluff or filler words

🔍 SKILLS VALIDATION:
- Only add skills that appear somewhere in the master resume text
- Provide justification for each addition (e.g., "Found in Experience section, bullet 3")
- Provide reason for each removal (e.g., "Not relevant to target role")
- Never add skills the candidate doesn't actually have

📊 EVIDENCE AVAILABLE FOR GROUNDING:
${evidenceBlock}

📤 OUTPUT FORMAT:
Return valid JSON matching the CvDraft schema EXACTLY. Required fields:
- basics (unchanged immutable fields)
- summary (optional, grounded in resume + JD)
- experiences (array, ordered by relevance_score desc)
- projects (optional array, promote/demote for relevance)
- volunteering (optional array)
- skills (array, reordered for relevance)
- spelling ("${context.options.keep_spelling}")
- must_hit_coverage (array showing which terms included and where)
- skills_changelog (what was added/removed with justifications)
- length_estimate (pages, lines, characters, trimmed_sections if any)
- locks_applied (confirmation of what locks were honored)

🔍 QUALITY CHECKS:
- Every bullet should have evidence_id OR clear justification for synthesis
- Every experience should have relevance_score (0-100)
- All must-hit terms should appear verbatim at least once
- Skills added must exist in resume text with justification
- Length should be ≤ 2 pages
- Spelling should be consistent (${context.options.keep_spelling})
- No fabricated numbers, metrics, or facts`,

    user: `MASTER RESUME (structured sections):
${JSON.stringify(context.masterResume.structured, null, 2)}

MASTER RESUME (full text for context):
${context.masterResume.content.slice(0, 4000)}${context.masterResume.content.length > 4000 ? '\n... (truncated for prompt length)' : ''}

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
Variant Style: ${context.variant}
Emphasis Topics: ${context.options.emphasis.join(', ')}
Must-Hit Keywords: ${context.options.must_hit.join(', ')}
Spelling: ${context.options.keep_spelling}
Max Pages: ${context.options.max_pages}

SECTION LOCKS:
${JSON.stringify(context.locks, null, 2)}

Generate ${context.variant} variant following ALL rules above. Link bullets to evidence_id when possible. Tag grounding type for every bullet. Include all must-hit terms verbatim. Provide clear justifications for skill changes. Estimate length and trim if needed. Remember: NO FABRICATION OF FACTS OR NUMBERS.`,
  };
}

/**
 * Extract immutable fields from resume that must never be changed
 */
export function extractImmutableFields(resume: Resume): ImmutableFields {
  const structured = resume.parsed_sections as any;
  const personalInfo = structured?.personal_info || {};
  
  return {
    name: personalInfo?.name || structured?.name || undefined,
    email: personalInfo?.email || structured?.email || undefined,
    phone: personalInfo?.phone || structured?.phone || undefined,
    address: personalInfo?.location || personalInfo?.address || structured?.address || undefined,
    education: structured?.education?.map((e: any) => {
      if (typeof e === 'string') return e;
      // Format structured education entry
      const parts = [];
      if (e.degree) parts.push(e.degree);
      if (e.field) parts.push(`in ${e.field}`);
      if (e.institution) parts.push(`— ${e.institution}`);
      if (e.graduation_date || e.graduationDate) parts.push(`(${e.graduation_date || e.graduationDate})`);
      if (e.gpa) parts.push(`GPA: ${e.gpa}`);
      return parts.join(' ');
    }).filter(Boolean) || [],
    certifications: structured?.certifications || [],
  };
}

/**
 * Extract must-hit keywords from job analysis
 * These are critical terms that must appear verbatim
 */
export function extractMustHits(jobAnalysis: JobAnalysis): string[] {
  const mustHits = new Set<string>();
  
  // Add from job keywords (highest priority)
  if (Array.isArray(jobAnalysis.keywords)) {
    jobAnalysis.keywords.forEach(k => mustHits.add(k));
  }
  
  // Add from required skills
  if (Array.isArray((jobAnalysis as any).required_skills)) {
    (jobAnalysis as any).required_skills.forEach((s: string) => mustHits.add(s));
  }
  
  // Add from key requirements (most important phrases)
  if (Array.isArray((jobAnalysis.analysis_result as any)?.key_requirements)) {
    (jobAnalysis.analysis_result as any).key_requirements
      .slice(0, 5)  // Top 5 key requirements
      .forEach((r: string) => {
        // Extract key terms from requirements
        const words = r.toLowerCase().split(/\s+/)
          .filter(w => w.length > 3 && !['with', 'using', 'experience', 'years'].includes(w));
        words.forEach(w => mustHits.add(w));
      });
  }
  
  // Add from job title (important for ATS)
  const titleWords = jobAnalysis.job_title.split(/\s+/)
    .filter(w => w.length > 3 && !['senior', 'junior', 'lead', 'staff', 'principal'].includes(w.toLowerCase()));
  titleWords.forEach(w => mustHits.add(w));
  
  return Array.from(mustHits)
    .slice(0, 12) // Limit to 12 most important terms
    .sort((a, b) => b.length - a.length); // Prioritize longer, more specific terms
}

/**
 * Detect spelling variant from resume content
 */
export function detectSpelling(resume: Resume): "US" | "UK" {
  const text = resume.content_text?.toLowerCase() || "";
  
  const usIndicators = [
    "optimize", "analyze", "color", "center", "defense", "license", 
    "organize", "realize", "recognize", "maximize"
  ];
  const ukIndicators = [
    "optimise", "analyse", "colour", "centre", "defence", "licence",
    "organise", "realise", "recognise", "maximise"
  ];
  
  let usCount = 0;
  let ukCount = 0;
  
  usIndicators.forEach(word => {
    const matches = text.match(new RegExp(`\\b${word}\\b`, 'g'));
    if (matches) usCount += matches.length;
  });
  
  ukIndicators.forEach(word => {
    const matches = text.match(new RegExp(`\\b${word}\\b`, 'g'));
    if (matches) ukCount += matches.length;
  });
  
  // Default to US if no clear indicators
  return ukCount > usCount ? "UK" : "US";
}

/**
 * Extract emphasis topics from job analysis
 * These are important themes to highlight in the CV
 */
export function extractEmphasis(jobAnalysis: JobAnalysis): string[] {
  const emphasis = new Set<string>();
  
  // Extract from key requirements
  if (Array.isArray((jobAnalysis.analysis_result as any)?.key_requirements)) {
    (jobAnalysis.analysis_result as any).key_requirements
      .slice(0, 3)
      .forEach((req: string) => {
        // Extract noun phrases (simplified)
        const phrases = req.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 4);
        phrases.forEach(p => emphasis.add(p));
      });
  }
  
  // Extract from preferred skills (secondary priority)
  if (Array.isArray((jobAnalysis.analysis_result as any)?.preferred_skills)) {
    (jobAnalysis.analysis_result as any).preferred_skills
      .slice(0, 5)
      .forEach((skill: string) => emphasis.add(skill.toLowerCase()));
  }
  
  return Array.from(emphasis).slice(0, 8);
}
