/**
 * LLM Prompt for Resume Analysis
 *
 * This prompt instructs the LLM to analyze a resume against a job description
 * and provide a match score, strengths, weaknesses, and missing keywords.
 */

export interface AnalysisPromptParams {
  resumeText: string
  jobDescription: string
  jobTitle?: string
  companyName?: string
}

export function buildAnalysisPrompt(params: AnalysisPromptParams): string {
  const { resumeText, jobDescription, jobTitle, companyName } = params

  return `You are a senior recruiter with 15+ years of experience analyzing resumes against job descriptions. Your task is to provide an honest, detailed analysis to help candidates understand how well their resume matches a specific role.

## YOUR TASK

Analyze the following resume against the job description and provide:
1. A match score out of 100 (be realistic and objective)
2. EXACTLY 5 specific reasons why this candidate is a strong fit
3. Up to 5 reasons what's holding them back (relative to the job requirements)
4. The top 5 missing keywords that should be added to improve ATS matching

## RESUME TO ANALYZE

${resumeText}

## TARGET JOB

${jobTitle ? `Job Title: ${jobTitle}` : ''}
${companyName ? `Company: ${companyName}` : ''}

Job Description:
${jobDescription}

## SCORING GUIDELINES

Be objective and calibrated in your scoring:
- **90-100**: Exceptional match - candidate exceeds most requirements, has directly relevant experience
- **80-89**: Strong match - meets most key requirements with minor gaps
- **70-79**: Good match - meets core requirements but has notable skill gaps
- **60-69**: Moderate match - has transferable skills but significant gaps
- **50-59**: Weak match - some relevant experience but major requirements missing
- **Below 50**: Poor match - does not meet most key requirements

## ANALYSIS GUIDELINES

### For "Strong Fit Reasons":
- Be specific and reference actual content from the resume
- Connect resume achievements to job requirements directly
- Mention quantified results when available
- Focus on the most impactful matches first
- Examples: "5+ years of React experience directly matches the 4+ year requirement"

### For "Holding Back Reasons":
- Only include genuine gaps relative to the job description
- Be constructive - focus on what's missing, not criticisms
- Prioritize by importance to the role
- If the candidate is exceptionally qualified, you may include fewer than 5
- Examples: "No cloud infrastructure experience mentioned (AWS/GCP required in JD)"

### For "Missing Keywords":
- Focus on technical skills, tools, and methodologies from the JD
- Only include keywords NOT already present in the resume
- Prioritize by importance and frequency in the job description
- Include both hard skills and soft skills if relevant
- Examples: "Kubernetes", "Agile methodology", "Cross-functional collaboration"

## RESPONSE FORMAT

You must respond with a valid JSON object in this exact format:
\`\`\`json
{
  "matchScore": <number between 0-100>,
  "strongFitReasons": [
    "<specific reason 1 - most impactful>",
    "<specific reason 2>",
    "<specific reason 3>",
    "<specific reason 4>",
    "<specific reason 5>"
  ],
  "holdingBackReasons": [
    "<specific gap 1 - most critical>",
    "<specific gap 2>",
    "<...up to 5 reasons, fewer if candidate is very strong>"
  ],
  "missingKeywords": [
    "<keyword 1 - highest priority>",
    "<keyword 2>",
    "<keyword 3>",
    "<keyword 4>",
    "<keyword 5>"
  ]
}
\`\`\`

## CRITICAL REQUIREMENTS

1. The "strongFitReasons" array MUST have EXACTLY 5 items
2. The "holdingBackReasons" array must have 1-5 items (fewer is OK if candidate is strong)
3. The "missingKeywords" array MUST have EXACTLY 5 items
4. Each reason must be specific and tied to actual resume content or JD requirements
5. Be honest - don't inflate scores or give generic feedback
6. All reasons should be actionable and helpful for the candidate

Respond ONLY with the JSON object, no additional text.`
}

/**
 * Parse the LLM response and validate the structure
 */
export function parseAnalysisResponse(response: string): {
  matchScore: number
  strongFitReasons: string[]
  holdingBackReasons: string[]
  missingKeywords: string[]
} {
  // Extract JSON from response
  let jsonText = response.trim()

  // Try to extract from code blocks
  const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    jsonText.match(/```\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1]
  } else {
    // Try to find raw JSON
    const firstBrace = jsonText.indexOf('{')
    const lastBrace = jsonText.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1)
    }
  }

  const parsed = JSON.parse(jsonText.trim())

  // Validate and normalize
  const matchScore = Math.min(100, Math.max(0, Number(parsed.matchScore) || 0))
  const strongFitReasons = Array.isArray(parsed.strongFitReasons)
    ? parsed.strongFitReasons.slice(0, 5)
    : []
  const holdingBackReasons = Array.isArray(parsed.holdingBackReasons)
    ? parsed.holdingBackReasons.slice(0, 5)
    : []
  const missingKeywords = Array.isArray(parsed.missingKeywords)
    ? parsed.missingKeywords.slice(0, 5)
    : []

  // Ensure exactly 5 strong fit reasons
  while (strongFitReasons.length < 5) {
    strongFitReasons.push("Experience aligns with job requirements")
  }

  // Ensure exactly 5 missing keywords
  while (missingKeywords.length < 5) {
    missingKeywords.push("Industry keyword")
  }

  return {
    matchScore,
    strongFitReasons,
    holdingBackReasons,
    missingKeywords,
  }
}
