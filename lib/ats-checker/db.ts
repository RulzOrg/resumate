/**
 * ATS Checker Database Operations
 * CRUD operations for the ats_checks table
 */

import { sql } from '@/lib/db'
import type {
  ATSCheckRecord,
  ATSCheckStatus,
  ATSIssue,
  ContentAnalysis,
  SectionsAnalysis,
  EssentialsAnalysis,
  TailoringAnalysis,
} from './types'

/**
 * Create a new ATS check record after file upload
 */
export async function createATSCheck(data: {
  originalFileName: string
  originalFileUrl: string
  originalFileHash?: string
  fileType: string
  fileSize: number
  ipAddress?: string
  userAgent?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
}): Promise<ATSCheckRecord> {
  const results = await sql<any>`
    INSERT INTO ats_checks (
      original_file_name,
      original_file_url,
      original_file_hash,
      file_type,
      file_size,
      ip_address,
      user_agent,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      status,
      created_at
    ) VALUES (
      ${data.originalFileName},
      ${data.originalFileUrl},
      ${data.originalFileHash || null},
      ${data.fileType},
      ${data.fileSize},
      ${data.ipAddress || null},
      ${data.userAgent || null},
      ${data.utmSource || null},
      ${data.utmMedium || null},
      ${data.utmCampaign || null},
      ${data.referrer || null},
      'uploaded',
      NOW()
    )
    RETURNING *
  `

  if (!results[0]) {
    throw new Error('Failed to create ATS check record')
  }

  return mapDbToRecord(results[0])
}

/**
 * Get an ATS check by ID
 */
export async function getATSCheckById(id: string): Promise<ATSCheckRecord | null> {
  const results = await sql<any>`
    SELECT * FROM ats_checks WHERE id = ${id}
  `

  if (!results[0]) {
    return null
  }

  return mapDbToRecord(results[0])
}

/**
 * Get an ATS check by ID and verify email ownership
 */
export async function getATSCheckByIdAndEmail(id: string, email: string): Promise<ATSCheckRecord | null> {
  const results = await sql<any>`
    SELECT * FROM ats_checks
    WHERE id = ${id} AND LOWER(email) = LOWER(${email})
  `

  if (!results[0]) {
    return null
  }

  return mapDbToRecord(results[0])
}

/**
 * Update ATS check status
 */
export async function updateATSCheckStatus(
  id: string,
  status: ATSCheckStatus,
  error?: string
): Promise<void> {
  await sql`
    UPDATE ats_checks
    SET
      status = ${status},
      processing_error = ${error || null},
      updated_at = NOW()
    WHERE id = ${id}
  `
}

/**
 * Capture email and update record
 */
export async function captureEmail(
  id: string,
  data: {
    email: string
    firstName?: string
    marketingConsent: boolean
    jobDescription?: string
    jobTitle?: string
  }
): Promise<void> {
  // Normalize email to lowercase for consistent storage and lookups
  const normalizedEmail = data.email.toLowerCase().trim()
  
  await sql`
    UPDATE ats_checks
    SET
      email = ${normalizedEmail},
      first_name = ${data.firstName || null},
      marketing_consent = ${data.marketingConsent},
      job_description = ${data.jobDescription || null},
      job_title = ${data.jobTitle || null},
      email_submitted_at = NOW(),
      status = 'email_captured',
      updated_at = NOW()
    WHERE id = ${id}
  `
}

/**
 * Save extracted text and parsed sections
 */
export async function saveExtractedContent(
  id: string,
  extractedText: string,
  parsedSections: Record<string, any>
): Promise<void> {
  await sql`
    UPDATE ats_checks
    SET
      extracted_text = ${extractedText},
      parsed_sections = ${JSON.stringify(parsedSections)},
      updated_at = NOW()
    WHERE id = ${id}
  `
}

/**
 * Save analysis results
 */
export async function saveAnalysisResults(
  id: string,
  data: {
    overallScore: number
    contentScore: number
    sectionsScore: number
    atsEssentialsScore: number
    tailoringScore: number | null
    issues: ATSIssue[]
    categoryDetails: {
      content: ContentAnalysis
      sections: SectionsAnalysis
      atsEssentials: EssentialsAnalysis
      tailoring: TailoringAnalysis | null
    }
  }
): Promise<void> {
  // Set expiration to 30 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  await sql`
    UPDATE ats_checks
    SET
      overall_score = ${data.overallScore},
      content_score = ${data.contentScore},
      sections_score = ${data.sectionsScore},
      ats_essentials_score = ${data.atsEssentialsScore},
      tailoring_score = ${data.tailoringScore},
      issues = ${JSON.stringify(data.issues)},
      category_details = ${JSON.stringify(data.categoryDetails)},
      status = 'completed',
      analyzed_at = NOW(),
      expires_at = ${expiresAt.toISOString()},
      updated_at = NOW()
    WHERE id = ${id}
  `
}

/**
 * Mark Beehiiv subscription
 */
export async function markBeehiivSubscribed(
  id: string,
  subscriberId: string
): Promise<void> {
  await sql`
    UPDATE ats_checks
    SET
      beehiiv_subscribed = true,
      beehiiv_subscriber_id = ${subscriberId},
      updated_at = NOW()
    WHERE id = ${id}
  `
}

/**
 * Track conversion when user creates account
 */
export async function trackConversion(
  email: string,
  userId: string
): Promise<{ checkId: string } | null> {
  const results = await sql<{ id: string }>`
    UPDATE ats_checks
    SET
      converted_to_user = true,
      converted_user_id = ${userId},
      converted_at = NOW(),
      updated_at = NOW()
    WHERE id IN (
      SELECT id
      FROM ats_checks
      WHERE LOWER(email) = LOWER(${email})
        AND converted_to_user = false
        AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    )
    RETURNING id
  `

  if (!results[0]) {
    return null
  }

  return { checkId: results[0].id }
}

/**
 * Get recent ATS checks by IP for rate limiting
 */
export async function getRecentChecksByIP(
  ipAddress: string,
  withinHours: number = 1
): Promise<number> {
  // Calculate cutoff time in JS since postgres.js doesn't support dynamic INTERVAL
  const cutoffTime = new Date(Date.now() - withinHours * 60 * 60 * 1000)

  const results = await sql<{ count: string }>`
    SELECT COUNT(*) as count
    FROM ats_checks
    WHERE ip_address = ${ipAddress}
      AND created_at > ${cutoffTime.toISOString()}
  `

  return parseInt(results[0]?.count || '0', 10)
}

/**
 * Get recent analyses by email for rate limiting
 */
export async function getRecentAnalysesByEmail(
  email: string,
  withinHours: number = 24
): Promise<number> {
  // Calculate cutoff time in JS since postgres.js doesn't support dynamic INTERVAL
  const cutoffTime = new Date(Date.now() - withinHours * 60 * 60 * 1000)

  const results = await sql<{ count: string }>`
    SELECT COUNT(*) as count
    FROM ats_checks
    WHERE LOWER(email) = LOWER(${email})
      AND analyzed_at IS NOT NULL
      AND analyzed_at > ${cutoffTime.toISOString()}
  `

  return parseInt(results[0]?.count || '0', 10)
}

/**
 * Get ATS check history for an email
 */
export async function getATSCheckHistory(
  email: string,
  limit: number = 10
): Promise<ATSCheckRecord[]> {
  const results = await sql<any>`
    SELECT * FROM ats_checks
    WHERE LOWER(email) = LOWER(${email})
      AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return results.map(mapDbToRecord)
}

/**
 * Clean up expired ATS checks
 */
export async function cleanupExpiredChecks(): Promise<number> {
  const results = await sql<{ count: string }>`
    WITH deleted AS (
      DELETE FROM ats_checks
      WHERE expires_at < NOW()
        AND converted_to_user = false
      RETURNING *
    )
    SELECT COUNT(*) as count FROM deleted
  `

  return parseInt(results[0]?.count || '0', 10)
}

/**
 * Get conversion metrics
 */
export async function getConversionMetrics(days: number = 30): Promise<{
  totalChecks: number
  completedChecks: number
  conversions: number
  conversionRate: number
  avgScore: number
}> {
  // Calculate cutoff time in JS since postgres.js doesn't support dynamic INTERVAL
  const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const results = await sql<{
    total_checks: string
    completed_checks: string
    conversions: string
    avg_score: string
  }>`
    SELECT
      COUNT(*) as total_checks,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_checks,
      COUNT(*) FILTER (WHERE converted_to_user = true) as conversions,
      AVG(overall_score) FILTER (WHERE overall_score IS NOT NULL) as avg_score
    FROM ats_checks
    WHERE created_at > ${cutoffTime.toISOString()}
  `

  const data = results[0]
  const completedChecks = parseInt(data?.completed_checks || '0', 10)
  const conversions = parseInt(data?.conversions || '0', 10)

  return {
    totalChecks: parseInt(data?.total_checks || '0', 10),
    completedChecks,
    conversions,
    conversionRate: completedChecks > 0 ? (conversions / completedChecks) * 100 : 0,
    avgScore: parseFloat(data?.avg_score || '0'),
  }
}

/**
 * Map database row to ATSCheckRecord
 */
function mapDbToRecord(row: any): ATSCheckRecord {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    originalFileName: row.original_file_name,
    originalFileUrl: row.original_file_url,
    originalFileHash: row.original_file_hash,
    fileType: row.file_type,
    fileSize: row.file_size,
    extractedText: row.extracted_text,
    parsedSections: row.parsed_sections
      ? typeof row.parsed_sections === 'string'
        ? JSON.parse(row.parsed_sections)
        : row.parsed_sections
      : null,
    overallScore: row.overall_score,
    contentScore: row.content_score,
    sectionsScore: row.sections_score,
    atsEssentialsScore: row.ats_essentials_score,
    tailoringScore: row.tailoring_score,
    issues: row.issues,
    categoryDetails: row.category_details,
    jobDescription: row.job_description,
    jobTitle: row.job_title,
    marketingConsent: row.marketing_consent,
    status: row.status,
    processingError: row.processing_error,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    referrer: row.referrer,
    convertedToUser: row.converted_to_user,
    convertedUserId: row.converted_user_id,
    convertedAt: row.converted_at ? new Date(row.converted_at) : null,
    beehiivSubscribed: row.beehiiv_subscribed,
    beehiivSubscriberId: row.beehiiv_subscriber_id,
    emailSubmittedAt: row.email_submitted_at ? new Date(row.email_submitted_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    analyzedAt: row.analyzed_at ? new Date(row.analyzed_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
  }
}
