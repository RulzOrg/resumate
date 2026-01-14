/**
 * POST /api/public/ats-check/[id]/analyze
 * Submit email and run ATS analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getATSCheckById,
  captureEmail,
  saveExtractedContent,
  saveAnalysisResults,
  markBeehiivSubscribed,
  updateATSCheckStatus,
  runATSAnalysis,
} from '@/lib/ats-checker'
import { downloadLeadMagnetFile } from '@/lib/supabase-storage'
import { extractText } from '@/lib/extract'
import { subscribeUser } from '@/lib/beehiiv'

// Helper function to mask email for logging (PII protection)
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (!domain) return '***@***'
  
  const maskedLocal = localPart.length > 1 
    ? `${localPart[0]}***` 
    : '***'
  
  const [domainName, ...domainParts] = domain.split('.')
  const maskedDomain = domainName.length > 2
    ? `${domainName.slice(0, 2)}***`
    : '***'
  
  return `${maskedLocal}@${maskedDomain}.${domainParts.join('.')}`
}

// Request validation schema
const AnalyzeRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().optional(),
  jobDescription: z.string().optional(),
  jobTitle: z.string().optional(),
  marketingConsent: z.boolean().default(true),
})

export const maxDuration = 60 // Allow up to 60 seconds for analysis

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: checkId } = await params

  try {
    // Validate request body
    const body = await request.json()
    const validationResult = AnalyzeRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Invalid request',
          code: 'INVALID_EMAIL',
          userMessage: validationResult.error.errors[0]?.message || 'Please enter a valid email address.',
        },
        { status: 400 }
      )
    }

    const { email, firstName, jobDescription, jobTitle, marketingConsent } = validationResult.data

    // Get the ATS check record
    const atsCheck = await getATSCheckById(checkId)

    if (!atsCheck) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Check not found',
          code: 'CHECK_NOT_FOUND',
          userMessage: 'This resume check was not found. Please upload again.',
        },
        { status: 404 }
      )
    }

    // Check if already analyzed
    if (atsCheck.status === 'completed') {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Already analyzed',
          code: 'ALREADY_ANALYZED',
          userMessage: 'This resume has already been analyzed. View your results or upload a new resume.',
        },
        { status: 400 }
      )
    }

    // Capture email
    await captureEmail(checkId, {
      email,
      firstName,
      marketingConsent,
      jobDescription,
      jobTitle,
    })

    // Subscribe to Beehiiv newsletter (non-blocking)
    try {
      const subscriberResult = await subscribeUser({ email, firstName })
      if (subscriberResult.success && subscriberResult.data?.id) {
        await markBeehiivSubscribed(checkId, subscriberResult.data.id)
      }
    } catch (beehiivError) {
      console.warn('[ATS Check] Beehiiv subscription failed (non-blocking):', beehiivError)
    }

    // Update status to analyzing
    await updateATSCheckStatus(checkId, 'analyzing')

    // Get the file content and extract text
    let extractedText: string
    try {
      // Extract the storage key from the URL
      const urlParts = atsCheck.originalFileUrl.split('/')
      const leadMagnetsIndex = urlParts.indexOf('lead-magnets')
      if (leadMagnetsIndex === -1) {
        throw new Error(`Invalid file URL format: ${atsCheck.originalFileUrl}`)
      }
      const storageKey = urlParts.slice(leadMagnetsIndex + 1).join('/')

      // Download and extract text
      const fileBuffer = await downloadLeadMagnetFile(storageKey)
      const extractResult = await extractText(fileBuffer, atsCheck.fileType)
      extractedText = extractResult.text

      // Save extracted content
      await saveExtractedContent(checkId, extractedText, {})
    } catch (extractError) {
      console.error('[ATS Check] Text extraction failed:', extractError)
      await updateATSCheckStatus(checkId, 'error', 'Failed to extract text from resume')
      return NextResponse.json(
        {
          status: 'error',
          error: 'Extraction failed',
          code: 'EXTRACTION_FAILED',
          userMessage: 'Failed to read your resume. Please try uploading again.',
        },
        { status: 500 }
      )
    }

    // Run ATS analysis
    let analysisResult
    try {
      analysisResult = await runATSAnalysis({
        checkId,
        fileName: atsCheck.originalFileName,
        fileType: atsCheck.fileType,
        rawText: extractedText,
        jobDescription,
        jobTitle,
      })
    } catch (analysisError) {
      console.error('[ATS Check] Analysis failed:', analysisError)
      await updateATSCheckStatus(checkId, 'error', 'Analysis failed')
      return NextResponse.json(
        {
          status: 'error',
          error: 'Analysis failed',
          code: 'ANALYSIS_FAILED',
          userMessage: 'We couldn\'t analyze your resume. Please try again.',
        },
        { status: 500 }
      )
    }

    // Save analysis results
    await saveAnalysisResults(checkId, {
      overallScore: analysisResult.result.overallScore,
      contentScore: analysisResult.result.content.score,
      sectionsScore: analysisResult.result.sections.score,
      atsEssentialsScore: analysisResult.result.atsEssentials.score,
      tailoringScore: analysisResult.result.tailoring?.score ?? null,
      issues: analysisResult.result.issues,
      categoryDetails: analysisResult.categoryDetails,
    })

    console.log('[ATS Check] Analysis complete:', {
      checkId,
      email: maskEmail(email),
      overallScore: analysisResult.result.overallScore,
      totalIssues: analysisResult.result.issues.length,
    })

    // Return success with summary
    return NextResponse.json({
      status: 'success',
      data: {
        checkId,
        overallScore: analysisResult.result.overallScore,
        categoryScores: {
          content: analysisResult.result.content.score,
          sections: analysisResult.result.sections.score,
          atsEssentials: analysisResult.result.atsEssentials.score,
          tailoring: analysisResult.result.tailoring?.score ?? null,
        },
        issueCount: analysisResult.result.issueCount,
        resultsUrl: `/ats-checker?id=${checkId}&results=true`,
      },
    })
  } catch (error) {
    console.error('[ATS Check] Unexpected error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        userMessage: 'Something went wrong. Please try again.',
      },
      { status: 500 }
    )
  }
}
