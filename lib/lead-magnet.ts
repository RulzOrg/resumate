/**
 * Lead Magnet Utility Functions
 * Handles database operations and business logic for the resume builder lead magnet
 */

import { sql } from './db';
import { calculateFileHash, uploadFile, getDownloadUrl } from './r2';

export interface LeadMagnetSubmission {
  id: string;
  email: string;
  original_file_name: string;
  original_file_url: string;
  original_file_hash: string | null;
  optimized_file_url: string | null;
  optimized_file_hash: string | null;
  status: string;
  processing_error: string | null;
  improvements_summary: any;
  ip_address: string | null;
  user_agent: string | null;
  download_expires_at: Date | null;
  email_sent_at: Date | null;
  downloaded_at: Date | null;
  converted_to_user: boolean;
  submitted_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a new lead magnet submission
 * @param data - Submission data
 * @returns Created submission
 */
export async function createLeadMagnetSubmission(data: {
  email: string;
  originalFileName: string;
  originalFileUrl: string;
  originalFileHash: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<LeadMagnetSubmission> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  const result = await sql<LeadMagnetSubmission>`
    INSERT INTO lead_magnet_submissions (
      email,
      original_file_name,
      original_file_url,
      original_file_hash,
      ip_address,
      user_agent,
      download_expires_at,
      status
    ) VALUES (
      ${data.email},
      ${data.originalFileName},
      ${data.originalFileUrl},
      ${data.originalFileHash},
      ${data.ipAddress || null},
      ${data.userAgent || null},
      ${expiresAt.toISOString()},
      'pending'
    )
    RETURNING *
  `;

  return result[0];
}

/**
 * Get a lead magnet submission by ID
 * @param id - Submission ID
 * @returns Submission or null
 */
export async function getLeadMagnetSubmission(
  id: string
): Promise<LeadMagnetSubmission | null> {
  const result = await sql<LeadMagnetSubmission>`
    SELECT * FROM lead_magnet_submissions
    WHERE id = ${id}
    LIMIT 1
  `;

  return result[0] || null;
}

/**
 * Update lead magnet submission
 * @param id - Submission ID
 * @param data - Data to update
 * @returns Updated submission
 */
export async function updateLeadMagnetSubmission(
  id: string,
  data: {
    status?: string;
    optimizedFileUrl?: string;
    optimizedFileHash?: string;
    improvementsSummary?: any;
    processingError?: string;
    emailSentAt?: Date;
    downloadedAt?: Date;
  }
): Promise<LeadMagnetSubmission> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.status !== undefined) {
    updates.push(`status = $${values.length + 1}`);
    values.push(data.status);
  }

  if (data.optimizedFileUrl !== undefined) {
    updates.push(`optimized_file_url = $${values.length + 1}`);
    values.push(data.optimizedFileUrl);
  }

  if (data.optimizedFileHash !== undefined) {
    updates.push(`optimized_file_hash = $${values.length + 1}`);
    values.push(data.optimizedFileHash);
  }

  if (data.improvementsSummary !== undefined) {
    updates.push(`improvements_summary = $${values.length + 1}`);
    values.push(JSON.stringify(data.improvementsSummary));
  }

  if (data.processingError !== undefined) {
    updates.push(`processing_error = $${values.length + 1}`);
    values.push(data.processingError);
  }

  if (data.emailSentAt !== undefined) {
    updates.push(`email_sent_at = $${values.length + 1}`);
    values.push(data.emailSentAt.toISOString());
  }

  if (data.downloadedAt !== undefined) {
    updates.push(`downloaded_at = $${values.length + 1}`);
    values.push(data.downloadedAt.toISOString());
  }

  updates.push(`updated_at = NOW()`);

  // Build the query manually since sql`` doesn't support dynamic updates easily
  const query = `
    UPDATE lead_magnet_submissions
    SET ${updates.join(', ')}
    WHERE id = $${values.length + 1}
    RETURNING *
  `;
  values.push(id);

  // Execute with raw SQL
  const result = await sql.unsafe<LeadMagnetSubmission>(query, values);

  return result[0];
}

/**
 * Upload lead magnet file to storage
 * @param fileBuffer - File content
 * @param fileName - Original file name
 * @param contentType - MIME type
 * @param submissionId - Submission ID for organizing files
 * @returns Storage key and URL
 */
export async function uploadLeadMagnetFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  submissionId: string
): Promise<{ key: string; hash: string; url: string }> {
  const fileHash = calculateFileHash(fileBuffer);
  const timestamp = Date.now();
  const ext = fileName.split('.').pop() || 'pdf';
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 50);

  // Use a separate prefix for lead magnet files
  const key = `lead-magnet/${submissionId}/${timestamp}_${fileHash.slice(0, 8)}_${sanitizedName}`;

  const uploadResult = await uploadFile(fileBuffer, key, contentType, fileHash);

  // Generate a long-lived URL (7 days)
  const url = await getDownloadUrl(key, 7 * 24 * 60 * 60);

  return {
    key: uploadResult.key,
    hash: uploadResult.hash,
    url,
  };
}

/**
 * Generate a fresh download URL for a lead magnet file
 * @param submissionId - Submission ID
 * @returns Download URL or null if expired/not found
 */
export async function getLeadMagnetDownloadUrl(
  submissionId: string
): Promise<string | null> {
  const submission = await getLeadMagnetSubmission(submissionId);

  if (!submission) {
    console.error('[Lead Magnet] Submission not found:', submissionId);
    return null;
  }

  // Check if expired
  if (
    submission.download_expires_at &&
    new Date(submission.download_expires_at) < new Date()
  ) {
    console.warn('[Lead Magnet] Download link expired:', submissionId);
    return null;
  }

  // Check if optimized file exists
  if (!submission.optimized_file_url) {
    console.warn('[Lead Magnet] No optimized file available:', submissionId);
    return null;
  }

  // Extract the storage key from the URL (assuming it's stored as a full URL)
  // If it's stored as a key, use it directly
  const storageKey = extractStorageKeyFromUrl(submission.optimized_file_url);

  // Generate fresh signed URL
  const url = await getDownloadUrl(storageKey, 7 * 24 * 60 * 60);

  return url;
}

/**
 * Extract storage key from S3/R2 URL
 * @param url - Full URL or storage key
 * @returns Storage key
 */
function extractStorageKeyFromUrl(url: string): string {
  // If it's already a key (doesn't start with http), return as-is
  if (!url.startsWith('http')) {
    return url;
  }

  // Parse URL and extract path
  try {
    const urlObj = new URL(url);
    // Remove leading slash
    return urlObj.pathname.substring(1);
  } catch {
    // If parsing fails, assume it's already a key
    return url;
  }
}

/**
 * Mark submission as downloaded
 * @param submissionId - Submission ID
 */
export async function markAsDownloaded(submissionId: string): Promise<void> {
  await updateLeadMagnetSubmission(submissionId, {
    downloadedAt: new Date(),
  });
}

/**
 * Check rate limit for lead magnet submissions
 * @param identifier - IP address or email
 * @param limitType - 'upload' or 'email'
 * @returns Number of recent submissions
 */
export async function checkLeadMagnetRateLimit(
  identifier: string,
  limitType: 'upload' | 'email'
): Promise<number> {
  const timeWindow = limitType === 'upload' ? 1 : 24; // 1 hour for uploads, 24 hours for emails

  const result = await sql<{ count: number }>`
    SELECT COUNT(*) as count
    FROM lead_magnet_submissions
    WHERE ${limitType === 'email' ? sql`email = ${identifier}` : sql`ip_address = ${identifier}`}
    AND created_at > NOW() - INTERVAL '${timeWindow} hours'
  `;

  return Number(result[0]?.count || 0);
}

/**
 * Get recent submissions for analytics
 * @param limit - Number of submissions to retrieve
 * @returns Array of submissions
 */
export async function getRecentLeadMagnetSubmissions(
  limit: number = 50
): Promise<LeadMagnetSubmission[]> {
  const result = await sql<LeadMagnetSubmission>`
    SELECT *
    FROM lead_magnet_submissions
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result;
}

/**
 * Get conversion statistics
 * @returns Statistics object
 */
export async function getLeadMagnetStats(): Promise<{
  total_submissions: number;
  completed_submissions: number;
  conversion_rate: number;
  unique_emails: number;
}> {
  const result = await sql<{
    total_submissions: string;
    completed_submissions: string;
    unique_emails: string;
  }>`
    SELECT
      COUNT(*) as total_submissions,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_submissions,
      COUNT(DISTINCT email) as unique_emails
    FROM lead_magnet_submissions
  `;

  const stats = result[0];
  const total = Number(stats.total_submissions);
  const completed = Number(stats.completed_submissions);

  return {
    total_submissions: total,
    completed_submissions: completed,
    conversion_rate: total > 0 ? (completed / total) * 100 : 0,
    unique_emails: Number(stats.unique_emails),
  };
}
