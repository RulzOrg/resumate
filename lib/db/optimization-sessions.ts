/**
 * Database operations for optimization sessions
 *
 * Provides CRUD operations for persisting and retrieving
 * resume optimization flow state.
 */

import { sql } from "@/lib/db"
import { execRawSQL } from "@/lib/supabase-db"
import type {
  OptimizeFlowState,
  FlowStep,
  AnalysisResult,
  RewriteResult,
  EditedContent,
  ATSScanResult,
  InterviewPrepResult,
} from "@/lib/types/optimize-flow"
import type { ParsedResume } from "@/lib/resume-parser"

// ============================================
// Types
// ============================================

export type SessionStatus = "in_progress" | "completed" | "abandoned"

export interface OptimizationSession {
  id: string
  user_id: string
  resume_id: string
  job_title: string
  job_description: string
  company_name: string | null
  current_step: FlowStep
  status: SessionStatus
  resume_text: string | null
  analysis_result: AnalysisResult | null
  rewrite_result: RewriteResult | null
  edited_content: EditedContent | null
  reviewed_resume: ParsedResume | null
  ats_scan_result: ATSScanResult | null
  interview_prep_result: InterviewPrepResult | null
  last_active_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateSessionInput {
  user_id: string
  resume_id: string
  job_title: string
  job_description: string
  company_name?: string
  resume_text?: string
}

export interface UpdateSessionInput {
  current_step?: FlowStep
  status?: SessionStatus
  resume_text?: string
  analysis_result?: AnalysisResult
  rewrite_result?: RewriteResult
  edited_content?: EditedContent
  reviewed_resume?: ParsedResume
  ats_scan_result?: ATSScanResult
  interview_prep_result?: InterviewPrepResult
}

export interface SessionSummary {
  id: string
  resume_id: string
  job_title: string
  company_name: string | null
  current_step: FlowStep
  status: SessionStatus
  last_active_at: string
  created_at: string
  // Include resume info for display
  resume_title?: string
  resume_file_name?: string
}

// ============================================
// Create Operations
// ============================================

/**
 * Create a new optimization session
 */
export async function createOptimizationSession(
  input: CreateSessionInput
): Promise<OptimizationSession> {
  const results = await sql<OptimizationSession>`
    INSERT INTO public.optimization_sessions (
      user_id,
      resume_id,
      job_title,
      job_description,
      company_name,
      resume_text,
      current_step,
      status
    ) VALUES (
      ${input.user_id},
      ${input.resume_id},
      ${input.job_title},
      ${input.job_description},
      ${input.company_name || null},
      ${input.resume_text || null},
      1,
      'in_progress'
    )
    RETURNING *
  `

  if (!results[0]) {
    throw new Error("Failed to create optimization session")
  }

  return parseSessionFromDb(results[0])
}

// ============================================
// Read Operations
// ============================================

/**
 * Get a session by ID
 */
export async function getOptimizationSessionById(
  sessionId: string,
  userId: string
): Promise<OptimizationSession | null> {
  const results = await sql<OptimizationSession>`
    SELECT * FROM public.optimization_sessions
    WHERE id = ${sessionId}
    AND user_id = ${userId}
  `

  if (!results[0]) {
    return null
  }

  return parseSessionFromDb(results[0])
}

/**
 * Get all in-progress sessions for a user
 */
export async function getInProgressSessions(
  userId: string,
  limit: number = 5
): Promise<SessionSummary[]> {
  const results = await sql<SessionSummary & { resume_title: string; resume_file_name: string }>`
    SELECT
      os.id,
      os.resume_id,
      os.job_title,
      os.company_name,
      os.current_step,
      os.status,
      os.last_active_at,
      os.created_at,
      r.title as resume_title,
      r.file_name as resume_file_name
    FROM public.optimization_sessions os
    LEFT JOIN public.resumes r ON os.resume_id = r.id
    WHERE os.user_id = ${userId}
    AND os.status = 'in_progress'
    ORDER BY os.last_active_at DESC
    LIMIT ${limit}
  `

  return results.map((row) => ({
    id: row.id,
    resume_id: row.resume_id,
    job_title: row.job_title,
    company_name: row.company_name,
    current_step: row.current_step as FlowStep,
    status: row.status as SessionStatus,
    last_active_at: row.last_active_at,
    created_at: row.created_at,
    resume_title: row.resume_title,
    resume_file_name: row.resume_file_name,
  }))
}

/**
 * Get recent sessions for a user (any status)
 */
export async function getRecentSessions(
  userId: string,
  limit: number = 10
): Promise<SessionSummary[]> {
  const results = await sql<SessionSummary & { resume_title: string; resume_file_name: string }>`
    SELECT
      os.id,
      os.resume_id,
      os.job_title,
      os.company_name,
      os.current_step,
      os.status,
      os.last_active_at,
      os.created_at,
      r.title as resume_title,
      r.file_name as resume_file_name
    FROM public.optimization_sessions os
    LEFT JOIN public.resumes r ON os.resume_id = r.id
    WHERE os.user_id = ${userId}
    ORDER BY os.last_active_at DESC
    LIMIT ${limit}
  `

  return results.map((row) => ({
    id: row.id,
    resume_id: row.resume_id,
    job_title: row.job_title,
    company_name: row.company_name,
    current_step: row.current_step as FlowStep,
    status: row.status as SessionStatus,
    last_active_at: row.last_active_at,
    created_at: row.created_at,
    resume_title: row.resume_title,
    resume_file_name: row.resume_file_name,
  }))
}

/**
 * Check if user has an existing in-progress session for a resume + job combo
 */
export async function findExistingSession(
  userId: string,
  resumeId: string,
  jobTitle: string
): Promise<OptimizationSession | null> {
  const results = await sql<OptimizationSession>`
    SELECT * FROM public.optimization_sessions
    WHERE user_id = ${userId}
    AND resume_id = ${resumeId}
    AND job_title = ${jobTitle}
    AND status = 'in_progress'
    ORDER BY last_active_at DESC
    LIMIT 1
  `

  if (!results[0]) {
    return null
  }

  return parseSessionFromDb(results[0])
}

// ============================================
// Update Operations
// ============================================

/**
 * Update a session with new data
 */
export async function updateOptimizationSession(
  sessionId: string,
  userId: string,
  input: UpdateSessionInput
): Promise<OptimizationSession | null> {
  // Build dynamic update query
  const updates: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (input.current_step !== undefined) {
    updates.push(`current_step = $${paramIndex++}`)
    values.push(input.current_step)
  }

  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}`)
    values.push(input.status)

    // Set completed_at if status is completed
    if (input.status === "completed") {
      updates.push(`completed_at = NOW()`)
    }
  }

  if (input.resume_text !== undefined) {
    updates.push(`resume_text = $${paramIndex++}`)
    values.push(input.resume_text)
  }

  if (input.analysis_result !== undefined) {
    updates.push(`analysis_result = $${paramIndex++}`)
    values.push(JSON.stringify(input.analysis_result))
  }

  if (input.rewrite_result !== undefined) {
    updates.push(`rewrite_result = $${paramIndex++}`)
    values.push(JSON.stringify(input.rewrite_result))
  }

  if (input.edited_content !== undefined) {
    updates.push(`edited_content = $${paramIndex++}`)
    values.push(JSON.stringify(input.edited_content))
  }

  if (input.reviewed_resume !== undefined) {
    updates.push(`reviewed_resume = $${paramIndex++}`)
    values.push(JSON.stringify(input.reviewed_resume))
  }

  if (input.ats_scan_result !== undefined) {
    updates.push(`ats_scan_result = $${paramIndex++}`)
    values.push(JSON.stringify(input.ats_scan_result))
  }

  if (input.interview_prep_result !== undefined) {
    updates.push(`interview_prep_result = $${paramIndex++}`)
    values.push(JSON.stringify(input.interview_prep_result))
  }

  // Always update last_active_at
  updates.push(`last_active_at = NOW()`)

  if (updates.length === 1) {
    // Only last_active_at, just touch it
    const results = await sql<OptimizationSession>`
      UPDATE public.optimization_sessions
      SET last_active_at = NOW()
      WHERE id = ${sessionId}
      AND user_id = ${userId}
      RETURNING *
    `
    return results[0] ? parseSessionFromDb(results[0]) : null
  }

  // Use raw query for dynamic updates
  // Note: This is safe because we control the column names
  const updateClause = updates.join(", ")
  values.push(sessionId, userId)

  const query = `
    UPDATE public.optimization_sessions
    SET ${updateClause}
    WHERE id = $${paramIndex++}
    AND user_id = $${paramIndex}
    RETURNING *
  `

  const results = await execRawSQL<OptimizationSession>(query, values)

  return results[0] ? parseSessionFromDb(results[0]) : null
}

/**
 * Save step result and advance to next step
 *
 * Step flow (5 steps):
 * 1. Analysis -> 2
 * 2. Rewrite -> 3
 * 3. Review Resume -> 4
 * 4. ATS Scan -> 5
 * 5. Interview Prep -> completed
 */
export async function saveStepAndAdvance(
  sessionId: string,
  userId: string,
  step: FlowStep,
  result: AnalysisResult | RewriteResult | ParsedResume | ATSScanResult | InterviewPrepResult,
  additionalData?: {
    resumeText?: string
    editedContent?: EditedContent
  }
): Promise<OptimizationSession | null> {
  const input: UpdateSessionInput = {}

  // Map step to result field
  switch (step) {
    case 1:
      input.analysis_result = result as AnalysisResult
      input.current_step = 2
      if (additionalData?.resumeText) {
        input.resume_text = additionalData.resumeText
      }
      break
    case 2:
      input.rewrite_result = result as RewriteResult
      if (additionalData?.editedContent) {
        input.edited_content = additionalData.editedContent
      }
      input.current_step = 3
      break
    case 3:
      // Step 3: Review Resume - save the full edited ParsedResume
      input.reviewed_resume = result as ParsedResume
      input.current_step = 4
      break
    case 4:
      input.ats_scan_result = result as ATSScanResult
      input.current_step = 5
      break
    case 5:
      input.interview_prep_result = result as InterviewPrepResult
      input.status = "completed"
      break
  }

  return updateOptimizationSession(sessionId, userId, input)
}

/**
 * Mark session as abandoned
 */
export async function abandonSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const results = await sql`
    UPDATE public.optimization_sessions
    SET status = 'abandoned', last_active_at = NOW()
    WHERE id = ${sessionId}
    AND user_id = ${userId}
    RETURNING id
  `

  return results.length > 0
}

// ============================================
// Delete Operations
// ============================================

/**
 * Delete a session
 */
export async function deleteOptimizationSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const results = await sql`
    DELETE FROM public.optimization_sessions
    WHERE id = ${sessionId}
    AND user_id = ${userId}
    RETURNING id
  `

  return results.length > 0
}

/**
 * Delete old abandoned sessions (cleanup job)
 */
export async function cleanupOldSessions(
  daysOld: number = 30
): Promise<number> {
  const query = `
    DELETE FROM public.optimization_sessions
    WHERE status = 'abandoned'
    AND last_active_at < NOW() - INTERVAL '${daysOld} days'
    RETURNING id
  `

  const results = await execRawSQL(query, [])

  return results.length
}

// ============================================
// Helpers
// ============================================

/**
 * Parse JSONB fields from database row
 */
function parseSessionFromDb(row: any): OptimizationSession {
  return {
    id: row.id,
    user_id: row.user_id,
    resume_id: row.resume_id,
    job_title: row.job_title,
    job_description: row.job_description,
    company_name: row.company_name,
    current_step: row.current_step as FlowStep,
    status: row.status as SessionStatus,
    resume_text: row.resume_text,
    analysis_result: row.analysis_result
      ? (typeof row.analysis_result === "string"
          ? JSON.parse(row.analysis_result)
          : row.analysis_result)
      : null,
    rewrite_result: row.rewrite_result
      ? (typeof row.rewrite_result === "string"
          ? JSON.parse(row.rewrite_result)
          : row.rewrite_result)
      : null,
    edited_content: row.edited_content
      ? (typeof row.edited_content === "string"
          ? JSON.parse(row.edited_content)
          : row.edited_content)
      : null,
    reviewed_resume: row.reviewed_resume
      ? (typeof row.reviewed_resume === "string"
          ? JSON.parse(row.reviewed_resume)
          : row.reviewed_resume)
      : null,
    ats_scan_result: row.ats_scan_result
      ? (typeof row.ats_scan_result === "string"
          ? JSON.parse(row.ats_scan_result)
          : row.ats_scan_result)
      : null,
    interview_prep_result: row.interview_prep_result
      ? (typeof row.interview_prep_result === "string"
          ? JSON.parse(row.interview_prep_result)
          : row.interview_prep_result)
      : null,
    last_active_at: row.last_active_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Convert OptimizationSession to OptimizeFlowState for UI
 */
export function sessionToFlowState(session: OptimizationSession): OptimizeFlowState {
  return {
    currentStep: session.current_step,
    resumeId: session.resume_id,
    resumeText: session.resume_text || undefined,
    // Note: parsedResume comes from cached structure (resumes table), not the session
    // The caller should fetch it separately via getCachedStructure(session.resume_id)
    parsedResume: null,
    jobTitle: session.job_title,
    jobDescription: session.job_description,
    companyName: session.company_name || "",
    analysisResult: session.analysis_result,
    rewriteResult: session.rewrite_result,
    editedContent: session.edited_content,
    reviewedResume: session.reviewed_resume,
    atsScanResult: session.ats_scan_result,
    interviewPrepResult: session.interview_prep_result,
    isLoading: false,
    error: null,
  }
}
