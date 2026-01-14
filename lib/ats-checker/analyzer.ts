/**
 * ATS Checker Main Analyzer
 * Orchestrates all analysis checks and produces final results
 */

import { parseResumeContent, type ParsedResume } from '@/lib/resume-parser'
import { runContentChecks } from './content-checks'
import { runSectionChecks } from './section-checks'
import { runEssentialsChecks } from './essentials-checks'
import {
  calculateContentScore,
  calculateSectionsScore,
  calculateEssentialsScore,
  calculateOverallScore,
  collectAllIssues,
  countIssuesBySeverity,
  generateSummary,
} from './scoring'
import type {
  ATSCheckResult,
  ContentAnalysis,
  SectionsAnalysis,
  EssentialsAnalysis,
  TailoringAnalysis,
} from './types'

export interface AnalyzerInput {
  checkId: string
  fileName: string
  fileType: string
  rawText: string
  jobDescription?: string
  jobTitle?: string
}

export interface AnalyzerOutput {
  result: ATSCheckResult
  categoryDetails: {
    content: ContentAnalysis
    sections: SectionsAnalysis
    atsEssentials: EssentialsAnalysis
    tailoring: TailoringAnalysis | null
  }
}

/**
 * Run full ATS analysis on a resume
 */
export async function runATSAnalysis(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const { checkId, fileName, fileType, rawText, jobDescription, jobTitle } = input

  console.log('[ATS Analyzer] Starting analysis:', {
    checkId,
    fileName,
    textLength: rawText.length,
    hasJobDescription: !!jobDescription,
  })

  // Step 1: Parse resume into structured format
  let parsed: ParsedResume
  try {
    parsed = parseResumeContent(rawText)
    console.log('[ATS Analyzer] Resume parsed:', {
      name: parsed.contact.name,
      experienceCount: parsed.workExperience.length,
      skillCount: parsed.skills.length,
    })
  } catch (error) {
    console.error('[ATS Analyzer] Parsing failed:', error)
    throw new Error('Failed to parse resume content')
  }

  // Step 2: Run all category checks in parallel where possible
  const [contentChecks, sectionChecks, essentialsChecks] = await Promise.all([
    runContentChecks(rawText, parsed),
    Promise.resolve(runSectionChecks(parsed)),
    Promise.resolve(runEssentialsChecks(rawText, fileType)),
  ])

  // Step 3: Calculate category scores
  const content = calculateContentScore(contentChecks)
  const sections = calculateSectionsScore(sectionChecks)
  const atsEssentials = calculateEssentialsScore(essentialsChecks)

  // Step 4: Run tailoring analysis if job description provided
  let tailoring: TailoringAnalysis | null = null
  if (jobDescription && jobDescription.trim().length > 50) {
    try {
      tailoring = await runTailoringAnalysis(parsed, jobDescription, jobTitle)
    } catch (error) {
      console.error('[ATS Analyzer] Tailoring analysis failed:', error)
      // Continue without tailoring score
    }
  }

  // Step 5: Calculate overall score
  const overallScore = calculateOverallScore(content, sections, atsEssentials, tailoring)

  // Step 6: Collect and sort all issues
  const issues = collectAllIssues(content, sections, atsEssentials, tailoring)
  const issueCount = countIssuesBySeverity(issues)

  // Step 7: Generate summary
  const summary = generateSummary(content, sections, atsEssentials, tailoring, issues)

  // Assemble final result
  const result: ATSCheckResult = {
    checkId,
    fileName,
    fileType,
    analyzedAt: new Date().toISOString(),
    overallScore,
    content,
    sections,
    atsEssentials,
    tailoring,
    issues,
    issueCount,
    summary,
  }

  const categoryDetails = {
    content,
    sections,
    atsEssentials,
    tailoring,
  }

  console.log('[ATS Analyzer] Analysis complete:', {
    overallScore,
    contentScore: content.score,
    sectionsScore: sections.score,
    essentialsScore: atsEssentials.score,
    tailoringScore: tailoring?.score ?? 'N/A',
    totalIssues: issues.length,
  })

  return { result, categoryDetails }
}

/**
 * Run tailoring analysis comparing resume to job description
 */
async function runTailoringAnalysis(
  parsed: ParsedResume,
  jobDescription: string,
  jobTitle?: string
): Promise<TailoringAnalysis> {
  const { callJsonModel } = await import('@/lib/llm')
  const { z } = await import('zod')
  const { v4: uuidv4 } = await import('uuid')

  // Schema for tailoring analysis
  const TailoringSchema = z.object({
    hardSkillsFound: z.array(z.string()),
    hardSkillsMissing: z.array(z.string()),
    softSkillsFound: z.array(z.string()),
    softSkillsMissing: z.array(z.string()),
    requiredSkillsPresent: z.array(z.string()),
    requiredSkillsMissing: z.array(z.string()),
    keywordMatchScore: z.number().min(0).max(100),
    skillsAlignmentScore: z.number().min(0).max(100),
  })

  // Prepare resume content for analysis
  const resumeContent = [
    parsed.summary || '',
    parsed.skills.join(', '),
    ...parsed.workExperience.flatMap(exp => exp.bullets),
  ].join('\n')

  try {
    const result = await callJsonModel(
      `Compare this resume content against the job description.

RESUME CONTENT:
${resumeContent.slice(0, 4000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

${jobTitle ? `TARGET JOB TITLE: ${jobTitle}` : ''}

Analyze and return:
1. hardSkillsFound: Technical skills from job description that ARE in the resume
2. hardSkillsMissing: Technical skills from job description that are MISSING from resume
3. softSkillsFound: Soft skills from job description that ARE in the resume
4. softSkillsMissing: Soft skills from job description that are MISSING
5. requiredSkillsPresent: Must-have requirements that the candidate meets
6. requiredSkillsMissing: Must-have requirements the candidate is missing
7. keywordMatchScore: 0-100 score for keyword alignment
8. skillsAlignmentScore: 0-100 score for overall skills match`,
      TailoringSchema,
      { temperature: 0.2, maxTokens: 1500 }
    )

    // Build subcategory results
    const keywordMatchIssues: any[] = []
    const skillsAlignmentIssues: any[] = []

    // Generate issues for missing skills
    if (result.hardSkillsMissing.length > 3) {
      keywordMatchIssues.push({
        id: uuidv4(),
        category: 'tailoring',
        subcategory: 'keyword_match',
        severity: 'warning',
        title: 'Missing Key Technical Skills',
        description: `Your resume is missing ${result.hardSkillsMissing.length} technical skills mentioned in the job description.`,
        recommendation: `Consider adding relevant skills like: ${result.hardSkillsMissing.slice(0, 5).join(', ')}.`,
        fixable: true,
      })
    }

    if (result.softSkillsMissing.length > 2) {
      keywordMatchIssues.push({
        id: uuidv4(),
        category: 'tailoring',
        subcategory: 'keyword_match',
        severity: 'info',
        title: 'Missing Soft Skills',
        description: `Some soft skills from the job description are not highlighted: ${result.softSkillsMissing.slice(0, 3).join(', ')}.`,
        recommendation: 'Incorporate these soft skills into your experience descriptions where applicable.',
        fixable: true,
      })
    }

    if (result.requiredSkillsMissing.length > 0) {
      skillsAlignmentIssues.push({
        id: uuidv4(),
        category: 'tailoring',
        subcategory: 'skills_alignment',
        severity: result.requiredSkillsMissing.length > 2 ? 'critical' : 'warning',
        title: 'Missing Required Qualifications',
        description: `You may be missing ${result.requiredSkillsMissing.length} required qualifications.`,
        recommendation: `Review if you have experience with: ${result.requiredSkillsMissing.join(', ')}.`,
        fixable: true,
      })
    }

    // Calculate overall tailoring score
    const score = Math.round(
      result.keywordMatchScore * 0.6 + result.skillsAlignmentScore * 0.4
    )

    return {
      score,
      weight: 15,
      subcategories: [
        {
          name: 'Keyword Match',
          key: 'keyword_match',
          score: result.keywordMatchScore,
          status: result.keywordMatchScore >= 80 ? 'pass' : result.keywordMatchScore >= 60 ? 'warning' : 'fail',
          issues: keywordMatchIssues,
          details: `${result.hardSkillsFound.length} of ${result.hardSkillsFound.length + result.hardSkillsMissing.length} keywords found`,
        },
        {
          name: 'Skills Alignment',
          key: 'skills_alignment',
          score: result.skillsAlignmentScore,
          status: result.skillsAlignmentScore >= 80 ? 'pass' : result.skillsAlignmentScore >= 60 ? 'warning' : 'fail',
          issues: skillsAlignmentIssues,
          details: `${result.requiredSkillsPresent.length} required skills present`,
        },
      ],
      keywordMatch: {
        name: 'Keyword Match',
        key: 'keyword_match',
        score: result.keywordMatchScore,
        status: result.keywordMatchScore >= 80 ? 'pass' : result.keywordMatchScore >= 60 ? 'warning' : 'fail',
        issues: keywordMatchIssues,
        hardSkillsFound: result.hardSkillsFound,
        hardSkillsMissing: result.hardSkillsMissing,
        softSkillsFound: result.softSkillsFound,
        softSkillsMissing: result.softSkillsMissing,
      },
      skillsAlignment: {
        name: 'Skills Alignment',
        key: 'skills_alignment',
        score: result.skillsAlignmentScore,
        status: result.skillsAlignmentScore >= 80 ? 'pass' : result.skillsAlignmentScore >= 60 ? 'warning' : 'fail',
        issues: skillsAlignmentIssues,
        requiredSkillsPresent: result.requiredSkillsPresent,
        requiredSkillsMissing: result.requiredSkillsMissing,
      },
    }
  } catch (error) {
    console.error('[ATS Analyzer] Tailoring AI analysis failed:', error)
    throw error
  }
}

/**
 * Quick preview analysis (before email capture)
 * Returns basic stats without full analysis
 */
export function getQuickPreview(rawText: string): {
  estimatedSections: number
  hasContactInfo: boolean
  hasExperience: boolean
  estimatedWordCount: number
} {
  const parsed = parseResumeContent(rawText)

  let sectionCount = 0
  if (parsed.contact.name || parsed.contact.email) sectionCount++
  if (parsed.workExperience.length > 0) sectionCount++
  if (parsed.education.length > 0) sectionCount++
  if (parsed.skills.length > 0) sectionCount++
  if (parsed.summary) sectionCount++

  return {
    estimatedSections: sectionCount,
    hasContactInfo: !!(parsed.contact.name || parsed.contact.email),
    hasExperience: parsed.workExperience.length > 0,
    estimatedWordCount: rawText.split(/\s+/).filter(Boolean).length,
  }
}
