/**
 * LLM Prompt for Experience Rewriting using X-Y-Z Formula
 *
 * The Google X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]"
 * - X = What you accomplished (the result)
 * - Y = How it was measured (quantifiable metric)
 * - Z = How you did it (the action/method)
 */

import type { AnalysisResult } from "@/lib/types/optimize-flow"

export interface RewritePromptParams {
  resumeText: string
  jobDescription: string
  jobTitle: string
  companyName?: string
  analysisResult: AnalysisResult
}

export function buildRewritePrompt(params: RewritePromptParams): string {
  const { resumeText, jobDescription, jobTitle, companyName, analysisResult } = params

  return `You are an expert resume writer who specializes in the Google X-Y-Z bullet point formula. Your task is to rewrite the work experience and professional summary sections to naturally incorporate missing keywords while applying best practices.

## THE X-Y-Z FORMULA

"Accomplished [X] as measured by [Y], by doing [Z]"
- **X** = What you accomplished (the quantifiable result)
- **Y** = How it was measured (metrics, percentages, numbers)
- **Z** = How you did it (the action, method, or skill used)

Examples:
- "Increased user engagement by 40% by developing 3 customer-facing React applications using TypeScript"
- "Reduced deployment time by 60% by implementing CI/CD pipelines with GitHub Actions"
- "Generated $2M in annual revenue by leading a cross-functional team of 8 to launch a new product line"

## YOUR TASK

Rewrite the resume sections to:
1. **Apply the X-Y-Z formula** to all bullet points where possible
2. **Naturally incorporate** these missing keywords: ${analysisResult.missingKeywords.join(", ")}
3. **Improve impact** by adding metrics and quantifiable results
4. **Maintain authenticity** - don't add skills or experiences not present in the original

## ORIGINAL RESUME

${resumeText}

## TARGET JOB

Title: ${jobTitle}
${companyName ? `Company: ${companyName}` : ""}

Job Description:
${jobDescription}

## ANALYSIS CONTEXT

- Match Score: ${analysisResult.matchScore}/100
- Key Strengths: ${analysisResult.strongFitReasons.slice(0, 3).join("; ")}
- Gaps to Address: ${analysisResult.holdingBackReasons.join("; ")}
- Keywords to Add: ${analysisResult.missingKeywords.join(", ")}

## REWRITING GUIDELINES

### For Professional Summary:
- Keep it 2-4 sentences (50-80 words)
- Lead with years of experience and core expertise
- Include 2-3 of the missing keywords naturally
- End with a value proposition or key achievement
- Don't use first person ("I")

### For Work Experience Bullets:
- Apply X-Y-Z formula to each bullet where metrics exist
- If no specific metric, use qualitative measures ("significantly", "substantially")
- Start each bullet with a strong action verb (Led, Developed, Implemented, etc.)
- Keep bullets to 1-2 lines maximum
- Incorporate keywords naturally - don't force them
- Preserve the original meaning and truthfulness
- Each bullet should show impact, not just describe tasks

### Action Verbs by Category:
- **Leadership**: Led, Directed, Managed, Coordinated, Spearheaded
- **Achievement**: Achieved, Delivered, Exceeded, Accomplished, Attained
- **Creation**: Developed, Built, Created, Designed, Established
- **Improvement**: Improved, Enhanced, Optimized, Streamlined, Accelerated
- **Analysis**: Analyzed, Evaluated, Assessed, Identified, Researched

## RESPONSE FORMAT

Respond with a valid JSON object:
\`\`\`json
{
  "professionalSummary": "<rewritten 2-4 sentence summary>",
  "workExperiences": [
    {
      "company": "<company name - preserve exactly>",
      "title": "<job title - preserve exactly>",
      "duration": "<dates - preserve exactly>",
      "originalBullets": ["<original bullet 1>", "<original bullet 2>", ...],
      "rewrittenBullets": ["<X-Y-Z bullet 1>", "<X-Y-Z bullet 2>", ...],
      "keywordsAdded": ["<keyword1>", "<keyword2>"]
    }
  ],
  "keywordsAdded": ["<all keywords successfully incorporated>"]
}
\`\`\`

## CRITICAL REQUIREMENTS

1. **Preserve Identity**: Company names, job titles, and dates must remain EXACTLY as in the original
2. **Same Bullet Count**: Each job must have the SAME number of bullets as the original
3. **Truthful**: Don't fabricate achievements, metrics, or skills not implied in the original
4. **Natural Integration**: Keywords should flow naturally - if a keyword can't fit naturally, skip it
5. **Consistent Formatting**: All bullets should follow similar structure and length
6. **No First Person**: Don't use "I", "my", "me" in any bullets or summary

Respond ONLY with the JSON object, no additional text.`
}

export interface ParsedRewriteResult {
  professionalSummary: string
  workExperiences: Array<{
    company: string
    title: string
    duration: string
    originalBullets: string[]
    rewrittenBullets: string[]
    keywordsAdded: string[]
  }>
  keywordsAdded: string[]
}

/**
 * Parse the LLM response and validate the structure
 */
export function parseRewriteResponse(response: string): ParsedRewriteResult {
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
  const professionalSummary = typeof parsed.professionalSummary === 'string'
    ? parsed.professionalSummary
    : ''

  const workExperiences = Array.isArray(parsed.workExperiences)
    ? parsed.workExperiences.map((exp: any) => ({
        company: exp.company || '',
        title: exp.title || '',
        duration: exp.duration || '',
        originalBullets: Array.isArray(exp.originalBullets) ? exp.originalBullets : [],
        rewrittenBullets: Array.isArray(exp.rewrittenBullets) ? exp.rewrittenBullets : [],
        keywordsAdded: Array.isArray(exp.keywordsAdded) ? exp.keywordsAdded : [],
      }))
    : []

  const keywordsAdded = Array.isArray(parsed.keywordsAdded)
    ? parsed.keywordsAdded
    : []

  return {
    professionalSummary,
    workExperiences,
    keywordsAdded,
  }
}
