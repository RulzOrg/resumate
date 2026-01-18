/**
 * LLM Prompt for ATS Compatibility Scanning
 *
 * Analyzes rewritten resume content for ATS compatibility issues,
 * identifying sections that may cause parsing problems.
 */

import type { EditedContent } from "@/lib/types/optimize-flow"

export interface ATSScanPromptParams {
  editedContent: EditedContent
  jobDescription?: string
}

export function buildATSScanPrompt(params: ATSScanPromptParams): string {
  const { editedContent, jobDescription } = params

  // Format the content for analysis
  const formattedContent = formatContentForScan(editedContent)

  return `You are an expert in Applicant Tracking Systems (ATS) used by Fortune 500 companies. Your task is to analyze resume content for ATS compatibility issues.

## YOUR TASK

Scan the following resume content as if you were an ATS parser. Identify:
1. Sections that may cause parsing problems
2. Formatting issues that could prevent proper extraction
3. Content that might not be machine-readable

## RESUME CONTENT TO SCAN

### Professional Summary
${editedContent.professionalSummary}

### Work Experience
${formattedContent}

${jobDescription ? `## TARGET JOB DESCRIPTION\n${jobDescription}\n` : ""}

## ATS COMPATIBILITY CHECKS

### Section Analysis
For each section, evaluate:
- **Contact Information**: Can the ATS extract name, email, phone?
- **Professional Summary**: Is it in a parseable format without tables/columns?
- **Work Experience**: Are dates, titles, and companies clearly formatted?
- **Bullet Points**: Are they using standard characters (•, -, *)?
- **Skills**: Would keyword matching work properly?

### Common ATS Issues to Check
1. **Special Characters**: Unicode bullets, em-dashes, smart quotes
2. **Formatting**: Tables, columns, text boxes that break parsing
3. **Headers**: Non-standard section headers ATS can't recognize
4. **Date Formats**: Inconsistent or unrecognized date formats
5. **Acronyms**: Unexpanded acronyms that miss keyword matching
6. **Length**: Bullet points too long or too short

### Risk Levels
- **Critical (fail)**: Content will likely be misread or lost entirely
- **Warning**: May cause partial extraction issues
- **Pass**: No significant issues detected

## RESPONSE FORMAT

Respond with a valid JSON object:
\`\`\`json
{
  "overallScore": <0-100 ATS compatibility score>,
  "sections": [
    {
      "name": "<section name>",
      "status": "pass" | "warning" | "fail",
      "risk": "<risk description if not pass, empty string if pass>",
      "fix": "<how to fix if not pass, empty string if pass>",
      "details": "<specific details about what was checked>"
    }
  ],
  "criticalIssues": [
    {
      "section": "<section name>",
      "severity": "critical",
      "issue": "<specific issue>",
      "fix": "<how to fix>"
    }
  ],
  "warnings": [
    {
      "section": "<section name>",
      "severity": "warning",
      "issue": "<specific issue>",
      "fix": "<how to fix>"
    }
  ],
  "recommendations": [
    "<general recommendation 1>",
    "<general recommendation 2>",
    "<general recommendation 3>"
  ]
}
\`\`\`

## SECTIONS TO ANALYZE

You MUST include these sections in your response:
1. "Professional Summary"
2. "Work Experience"
3. "Bullet Point Formatting"
4. "Keyword Optimization"
5. "Date Formatting"

## SCORING GUIDELINES

- **90-100**: Excellent ATS compatibility, no issues found
- **80-89**: Good compatibility, minor formatting suggestions
- **70-79**: Moderate compatibility, some issues to address
- **60-69**: Fair compatibility, multiple issues present
- **Below 60**: Poor compatibility, significant issues need fixing

## CRITICAL REQUIREMENTS

1. Be specific - reference actual content from the resume
2. Provide actionable fixes for each issue
3. Don't invent issues that don't exist
4. Focus on machine-readability, not human preferences
5. Consider how keyword matching algorithms work

Respond ONLY with the JSON object, no additional text.`
}

/**
 * Format the edited content for scanning
 */
function formatContentForScan(content: EditedContent): string {
  return content.workExperiences
    .map((exp) => {
      const bullets = exp.rewrittenBullets
        .map((b, i) => `  ${i + 1}. ${b}`)
        .join("\n")
      return `**${exp.title}** at ${exp.company}
Duration: ${exp.duration}
Bullets:
${bullets}`
    })
    .join("\n\n")
}

export interface ParsedATSScanResult {
  overallScore: number
  sections: Array<{
    name: string
    status: "pass" | "warning" | "fail"
    risk: string
    fix: string
    details: string
  }>
  criticalIssues: Array<{
    section: string
    severity: "critical"
    issue: string
    fix: string
  }>
  warnings: Array<{
    section: string
    severity: "warning"
    issue: string
    fix: string
  }>
  recommendations: string[]
}

/**
 * Parse the LLM response and validate the structure
 */
export function parseATSScanResponse(response: string): ParsedATSScanResult {
  // Extract JSON from response
  let jsonText = response.trim()

  // Try to extract from code blocks
  const jsonMatch =
    jsonText.match(/```json\s*([\s\S]*?)\s*```/) ||
    jsonText.match(/```\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1]
  } else {
    // Try to find raw JSON
    const firstBrace = jsonText.indexOf("{")
    const lastBrace = jsonText.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1)
    }
  }

  const parsed = JSON.parse(jsonText.trim())

  // Validate and normalize
  const overallScore = Math.min(
    100,
    Math.max(0, Number(parsed.overallScore) || 0)
  )

  const sections = Array.isArray(parsed.sections)
    ? parsed.sections.map((s: any) => ({
        name: s.name || "Unknown Section",
        status: ["pass", "warning", "fail"].includes(s.status)
          ? s.status
          : "warning",
        risk: s.risk || "",
        fix: s.fix || "",
        details: s.details || "",
      }))
    : []

  const criticalIssues = Array.isArray(parsed.criticalIssues)
    ? parsed.criticalIssues.map((i: any) => ({
        section: i.section || "Unknown",
        severity: "critical" as const,
        issue: i.issue || "",
        fix: i.fix || "",
      }))
    : []

  const warnings = Array.isArray(parsed.warnings)
    ? parsed.warnings.map((i: any) => ({
        section: i.section || "Unknown",
        severity: "warning" as const,
        issue: i.issue || "",
        fix: i.fix || "",
      }))
    : []

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations.filter((r: any) => typeof r === "string")
    : []

  // Ensure we have the required sections
  const requiredSections = [
    "Professional Summary",
    "Work Experience",
    "Bullet Point Formatting",
    "Keyword Optimization",
    "Date Formatting",
  ]

  for (const sectionName of requiredSections) {
    if (!sections.find((s: any) => s.name === sectionName)) {
      sections.push({
        name: sectionName,
        status: "pass" as const,
        risk: "",
        fix: "",
        details: "No issues detected",
      })
    }
  }

  return {
    overallScore,
    sections,
    criticalIssues,
    warnings,
    recommendations,
  }
}
