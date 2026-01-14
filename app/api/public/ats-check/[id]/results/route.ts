/**
 * GET /api/public/ats-check/[id]/results
 * Get ATS analysis results
 */

import { NextRequest, NextResponse } from 'next/server'
import { getATSCheckById, getATSCheckByIdAndEmail } from '@/lib/ats-checker'
import type { ATSCheckResult } from '@/lib/ats-checker'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: checkId } = await params

  try {
    // Get email from query params (optional verification)
    const email = request.nextUrl.searchParams.get('email')

    // Get the ATS check record
    let atsCheck
    if (email) {
      // Verify email ownership
      atsCheck = await getATSCheckByIdAndEmail(checkId, email)
      if (!atsCheck) {
        return NextResponse.json(
          {
            status: 'error',
            error: 'Not found',
            code: 'CHECK_NOT_FOUND',
            userMessage: 'Results not found for this email. Please check your email or upload a new resume.',
          },
          { status: 404 }
        )
      }
    } else {
      // Get without email verification (for direct links)
      atsCheck = await getATSCheckById(checkId)
      if (!atsCheck) {
        return NextResponse.json(
          {
            status: 'error',
            error: 'Not found',
            code: 'CHECK_NOT_FOUND',
            userMessage: 'Resume check not found. It may have expired.',
          },
          { status: 404 }
        )
      }
    }

    // Check if analysis is complete
    if (atsCheck.status !== 'completed') {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Analysis not complete',
          code: 'NOT_COMPLETED',
          userMessage: atsCheck.status === 'analyzing'
            ? 'Analysis is still in progress. Please wait a moment.'
            : 'Please submit your email to run the analysis.',
          currentStatus: atsCheck.status,
        },
        { status: 400 }
      )
    }

    // Check if expired
    if (atsCheck.expiresAt && new Date(atsCheck.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Results expired',
          code: 'EXPIRED',
          userMessage: 'These results have expired. Please upload a new resume to check again.',
        },
        { status: 410 }
      )
    }

    // Parse JSONB fields - they might come as strings from the database
    const categoryDetails = typeof atsCheck.categoryDetails === 'string'
      ? JSON.parse(atsCheck.categoryDetails)
      : atsCheck.categoryDetails || {}

    const issues = typeof atsCheck.issues === 'string'
      ? JSON.parse(atsCheck.issues)
      : Array.isArray(atsCheck.issues) ? atsCheck.issues : []

    const result: ATSCheckResult = {
      checkId: atsCheck.id,
      fileName: atsCheck.originalFileName,
      fileType: atsCheck.fileType,
      analyzedAt: atsCheck.analyzedAt?.toISOString() || new Date().toISOString(),
      overallScore: atsCheck.overallScore!,
      content: categoryDetails.content,
      sections: categoryDetails.sections,
      atsEssentials: categoryDetails.atsEssentials,
      tailoring: categoryDetails.tailoring,
      issues,
      issueCount: {
        critical: issues.filter((i: any) => i.severity === 'critical').length,
        warning: issues.filter((i: any) => i.severity === 'warning').length,
        info: issues.filter((i: any) => i.severity === 'info').length,
        total: issues.length,
      },
      summary: generateSummaryFromResults(categoryDetails, issues),
    }

    return NextResponse.json({
      status: 'success',
      data: result,
    })
  } catch (error) {
    console.error('[ATS Check] Error fetching results:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        userMessage: 'Failed to load results. Please try again.',
      },
      { status: 500 }
    )
  }
}

/**
 * Generate summary from stored results
 */
function generateSummaryFromResults(
  categoryDetails: any,
  issues: any[]
): { strengths: string[]; criticalIssues: string[]; quickWins: string[] } {
  const strengths: string[] = []
  const criticalIssues: string[] = []
  const quickWins: string[] = []

  // Identify strengths
  if (categoryDetails.content?.parseRate?.score >= 90) {
    strengths.push('Excellent ATS parse rate')
  }
  if (categoryDetails.sections?.experience?.score >= 90) {
    strengths.push('Strong work experience section')
  }
  if (categoryDetails.sections?.skills?.skillCount >= 10) {
    strengths.push(`Good skills coverage (${categoryDetails.sections.skills.skillCount} skills)`)
  }
  if (categoryDetails.atsEssentials?.fileFormat?.score === 100) {
    strengths.push('ATS-compatible file format')
  }

  // Critical issues
  const critical = issues.filter(i => i.severity === 'critical')
  for (const issue of critical.slice(0, 3)) {
    criticalIssues.push(issue.title)
  }

  // Quick wins
  const quickFixCategories = ['repetition', 'spelling_grammar', 'dates', 'headings']
  for (const issue of issues) {
    if (issue.severity !== 'critical' && quickFixCategories.includes(issue.subcategory)) {
      quickWins.push(issue.recommendation)
      if (quickWins.length >= 3) break
    }
  }

  // Defaults
  if (strengths.length === 0) {
    strengths.push('Resume successfully analyzed')
  }
  if (criticalIssues.length === 0 && issues.length > 0) {
    criticalIssues.push('No critical issues found')
  }

  return { strengths, criticalIssues, quickWins }
}
