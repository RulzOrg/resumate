/**
 * POST /api/public/ats-check/fix-preview
 * Generate a fix preview for an ATS issue (public, no auth required).
 * Shows what the AI would change — does not apply any changes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getATSCheckById } from '@/lib/ats-checker'
import { parseResumeContent } from '@/lib/resume-parser'
import { processEditCommand } from '@/lib/resume-chat-agent'
import { computeDiffs, validateOperations } from '@/lib/resume-diff'
import { chatEditToolSchema } from '@/lib/chat-edit-types'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { getFixStrategy, buildFixCommand } from '@/lib/ats-checker/fix-strategies'
import type { ATSIssue } from '@/lib/ats-checker/types'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  // Rate limit by IP: 3 fix previews per hour
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'

  const rateLimitResult = await rateLimit(`fix-preview:${ip}`, 3, 3600000)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        userMessage: 'You can preview up to 3 fixes per hour. Please try again later.',
      },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    const body = await request.json()
    const { checkId, issueId, userInputs } = body as {
      checkId?: string
      issueId?: string
      userInputs?: Record<string, string>
    }

    if (!checkId || !issueId) {
      return NextResponse.json(
        { status: 'error', error: 'Missing checkId or issueId', code: 'BAD_REQUEST', userMessage: 'Invalid request.' },
        { status: 400 }
      )
    }

    // Look up ATS check record
    const atsCheck = await getATSCheckById(checkId)
    if (!atsCheck) {
      return NextResponse.json(
        { status: 'error', error: 'Not found', code: 'CHECK_NOT_FOUND', userMessage: 'Resume check not found or expired.' },
        { status: 404 }
      )
    }

    if (atsCheck.status !== 'completed') {
      return NextResponse.json(
        { status: 'error', error: 'Analysis not complete', code: 'NOT_COMPLETED', userMessage: 'Analysis must be complete before fixing issues.' },
        { status: 400 }
      )
    }

    if (atsCheck.expiresAt && new Date(atsCheck.expiresAt) < new Date()) {
      return NextResponse.json(
        { status: 'error', error: 'Expired', code: 'EXPIRED', userMessage: 'These results have expired. Please upload a new resume.' },
        { status: 410 }
      )
    }

    // Find the issue
    const issues: ATSIssue[] = typeof atsCheck.issues === 'string'
      ? JSON.parse(atsCheck.issues)
      : Array.isArray(atsCheck.issues) ? atsCheck.issues : []

    const issue = issues.find(i => i.id === issueId)
    if (!issue) {
      return NextResponse.json(
        { status: 'error', error: 'Issue not found', code: 'ISSUE_NOT_FOUND', userMessage: 'The specified issue was not found.' },
        { status: 400 }
      )
    }

    // Get fix strategy
    const strategy = getFixStrategy(issue)
    if (!strategy) {
      return NextResponse.json(
        { status: 'guidance_only', recommendation: issue.recommendation },
        { status: 200 }
      )
    }

    if (strategy.type === 'guidance_only') {
      return NextResponse.json(
        { status: 'guidance_only', recommendation: issue.recommendation },
        { status: 200 }
      )
    }

    // Check if user input is required but not provided
    if (strategy.type === 'user_input_required' && strategy.requiredInputs && !userInputs) {
      return NextResponse.json(
        { status: 'input_required', fields: strategy.requiredInputs },
        { status: 200 }
      )
    }

    // Parse resume text into structured format
    if (!atsCheck.extractedText) {
      return NextResponse.json(
        { status: 'error', error: 'No resume text', code: 'NO_TEXT', userMessage: 'Resume text not available. Please try uploading again.' },
        { status: 400 }
      )
    }

    const resumeData = parseResumeContent(atsCheck.extractedText)

    // Parse category details for tailoring data
    const categoryDetails = typeof atsCheck.categoryDetails === 'string'
      ? JSON.parse(atsCheck.categoryDetails)
      : atsCheck.categoryDetails

    // Build the fix command
    const command = buildFixCommand(strategy, issue, {
      resumeData,
      resumeText: atsCheck.extractedText,
      jobDescription: atsCheck.jobDescription || undefined,
      jobTitle: atsCheck.jobTitle || undefined,
      atsResult: categoryDetails ? {
        checkId: atsCheck.id,
        fileName: atsCheck.originalFileName,
        fileType: atsCheck.fileType,
        analyzedAt: atsCheck.analyzedAt?.toISOString() || '',
        overallScore: atsCheck.overallScore || 0,
        content: categoryDetails.content,
        sections: categoryDetails.sections,
        atsEssentials: categoryDetails.atsEssentials,
        tailoring: categoryDetails.tailoring,
        issues,
        issueCount: { critical: 0, warning: 0, info: 0, total: issues.length },
        summary: { strengths: [], criticalIssues: [], quickWins: [] },
      } : undefined,
      userInputs,
    })

    if (!command) {
      return NextResponse.json(
        { status: 'guidance_only', recommendation: issue.recommendation },
        { status: 200 }
      )
    }

    // Call processEditCommand and collect the full response
    const stream = processEditCommand(command, resumeData, {
      jobTitle: atsCheck.jobTitle || undefined,
    })

    let explanation = ''
    let toolInputChunks = ''
    let currentBlockType: string | null = null

    for await (const event of stream) {
      if (event.type === 'content_block_start' && event.content_block.type === 'text') {
        currentBlockType = 'text'
      }
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        explanation += event.delta.text
      }
      if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
        currentBlockType = 'tool_use'
        toolInputChunks = ''
      }
      if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
        toolInputChunks += event.delta.partial_json
      }
      if (event.type === 'content_block_stop' && currentBlockType === 'tool_use') {
        currentBlockType = null
      }
      if (event.type === 'content_block_stop' && currentBlockType === 'text') {
        currentBlockType = null
      }
    }

    // Parse and validate the tool output
    if (!toolInputChunks) {
      // AI responded with text only — no tool call (issue might be unfixable)
      return NextResponse.json({
        status: 'no_fix',
        explanation: explanation || 'The AI could not generate a fix for this issue.',
        recommendation: issue.recommendation,
      })
    }

    const parsed = chatEditToolSchema.parse(JSON.parse(toolInputChunks))
    const validation = validateOperations(resumeData, parsed.operations)

    if (!validation.valid) {
      return NextResponse.json({
        status: 'error',
        error: 'Invalid operations',
        code: 'INVALID_OPS',
        userMessage: 'The AI generated an invalid fix. Please try again.',
      }, { status: 500 })
    }

    const diffs = computeDiffs(resumeData, parsed.operations)

    return NextResponse.json({
      status: 'success',
      preview: {
        diffs,
        explanation: parsed.explanation || explanation,
        operations: parsed.operations,
        confidence: parsed.confidence,
      },
    })
  } catch (error) {
    console.error('[Fix Preview] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        userMessage: 'Something went wrong generating the fix preview. Please try again.',
      },
      { status: 500 }
    )
  }
}
