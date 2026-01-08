import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { normalizeSalaryRange, normalizeJobField, type SalaryRangeInput } from "./normalizers"
import type { SystemPromptV1Output, QASection } from "./schemas-v2"
import type { ParsedResume } from "@/lib/resume-parser"
import { createSupabaseSQL, withTransaction } from "./supabase-db"

type SqlClient = <T = Record<string, any>>(strings: TemplateStringsArray, ...values: any[]) => Promise<T[]>

/**
 * SQL client using Supabase PostgreSQL
 */
const sql: SqlClient = createSupabaseSQL()

export { sql }

// Monitoring and debugging utilities
export async function logConstraintViolation(
  operation: string,
  error: any,
  context: Record<string, any>
) {
  const violationType = error.code === "23503" ? "foreign_key" :
    error.code === "23505" ? "unique_constraint" : "unknown"

  console.error(`[DB_CONSTRAINT_VIOLATION] ${violationType.toUpperCase()}:`, {
    timestamp: new Date().toISOString(),
    operation,
    error_code: error.code,
    error_message: error.message,
    context,
    constraint_name: error.constraint_name || 'unknown'
  })

  // In production, you might want to send this to a monitoring service
  // await sendToMonitoringService({ operation, error, context })
}

// Database health check function
export async function checkDatabaseHealth() {
  try {
    const results = await Promise.all([
      // Check if we can connect to database
      sql`SELECT 1 as health_check`,

      // Check users_sync table structure
      sql`SELECT COUNT(*) as user_count FROM users_sync WHERE deleted_at IS NULL`,

      // Check for orphaned records (shouldn't happen with foreign keys)
      sql`
        SELECT COUNT(*) as orphaned_job_analyses
        FROM job_analysis ja
        LEFT JOIN users_sync u ON ja.user_id = u.id
        WHERE u.id IS NULL
      `
    ])

    const [healthCheck, userCount, orphanedCount] = results

    console.log('[DB_HEALTH_CHECK] Database health status:', {
      timestamp: new Date().toISOString(),
      connection: healthCheck[0]?.health_check === 1 ? 'healthy' : 'unhealthy',
      user_count: userCount[0]?.user_count || 0,
      orphaned_job_analyses: orphanedCount[0]?.orphaned_job_analyses || 0
    })

    return {
      healthy: true,
      userCount: userCount[0]?.user_count || 0,
      orphanedCount: orphanedCount[0]?.orphaned_job_analyses || 0
    }
  } catch (error: any) {
    console.error('[DB_HEALTH_CHECK] Database health check failed:', {
      timestamp: new Date().toISOString(),
      error: error.message,
      code: error.code
    })
    return { healthy: false, error: error.message }
  }
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export interface User {
  id: string
  email: string
  name: string
  clerk_user_id?: string
  subscription_status: string
  subscription_plan: string
  subscription_period_end?: string
  polar_customer_id?: string | null
  polar_subscription_id?: string | null
  beehiiv_subscriber_id?: string | null
  onboarding_completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface PendingPolarSubscription {
  id: string
  polar_subscription_id: string
  polar_customer_id: string
  polar_checkout_id?: string | null
  customer_email: string
  customer_name?: string | null
  plan_type: string
  status: string
  amount: number
  currency: string
  recurring_interval?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
  linked_user_id?: string | null
  linked_at?: string | null
  raw_webhook_data?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface Resume {
  id: string
  user_id: string
  title: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  file_hash?: string | null
  content_text?: string
  kind: ResumeKind
  processing_status: ResumeProcessingStatus
  processing_error?: string | null
  parsed_sections?: Record<string, any> | null
  extracted_at?: string | null
  source_metadata?: Record<string, any> | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface ResumeVersionSnapshot {
  id: string
  user_id: string
  resume_id: string
  kind: ResumeKind
  version: number
  file_name: string
  file_type: string
  file_size: number
  file_hash: string
  storage_key: string
  metadata?: Record<string, any> | null
  change_type: string
  change_summary?: string | null
  created_at: string
}

export type ResumeKind = "uploaded" | "master" | "generated" | "duplicate"

export type ResumeProcessingStatus = "pending" | "processing" | "completed" | "failed"

export interface JobApplication {
  id: string
  user_id: string
  resume_id: string
  job_title: string
  company_name: string
  job_url?: string
  job_description?: string
  status: string
  applied_at: string
  created_at: string
  updated_at: string
}

export interface JobTarget {
  id: string
  user_id: string
  job_url: string
  job_title?: string | null
  company_name?: string | null
  status: string
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface JobAnalysis {
  id: string
  user_id: string
  job_title: string
  company_name?: string
  job_url?: string
  job_description: string
  analysis_result: {
    keywords: string[]
    required_skills: string[]
    preferred_skills: string[]
    experience_level: string
    salary_range?: string
    location?: string
    key_requirements: string[]
    nice_to_have: string[]
    company_culture: string[]
    benefits: string[]
    match_score?: number
    analysis_quality?: {
      confidence: number
      completeness: number
      content_processed: boolean
    }
    // Categorized skills for ATS matching
    categorized_skills?: {
      hard: string[]
      soft: string[]
      other: string[]
    }
  }
  keywords: string[]
  required_skills: string[]
  preferred_skills: string[]
  experience_level?: string
  salary_range?: string
  location?: string
  created_at: string
  updated_at: string
}

export interface OptimizedResume {
  id: string
  user_id: string
  original_resume_id: string
  job_analysis_id?: string | null
  job_title?: string
  company_name?: string | null
  job_description?: string
  title: string
  optimized_content: string
  optimization_summary: {
    changes_made: string[]
    keywords_added: string[]
    skills_highlighted: string[]
    sections_improved: string[]
    match_score_before: number
    match_score_after: number
    recommendations: string[]
  }
  match_score?: number
  improvements_made: string[]
  keywords_added: string[]
  skills_highlighted: string[]
  created_at: string
  updated_at: string
}

// System Prompt v1.1 Extended Resume with Structured Output
export interface OptimizedResumeV2 extends OptimizedResume {
  structured_output?: SystemPromptV1Output | null
  qa_metrics?: QASection | null
  export_formats?: {
    docx_url?: string
    pdf_url?: string
    txt_url?: string
  } | null
}

export interface UserProfile {
  id: string
  clerk_user_id: string
  user_id: string
  bio?: string
  company?: string
  job_title?: string
  experience_level?: string
  skills: string[]
  // Categorized skills for ATS matching
  categorized_skills?: {
    hard: string[]
    soft: string[]
    other: string[]
  }
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ClerkWebhookEvent {
  id: string
  event_type: string
  event_id: string
  user_id?: string
  processed_at: string
  raw_data: Record<string, any>
  created_at: string
}

// Utility to create or update a users_sync record by database id.
export async function ensureUserSyncRecord(params: {
  id: string
  clerkUserId?: string | null
  email?: string | null
  name?: string | null
  subscription_status?: string | null
  subscription_plan?: string | null
}) {
  const safeEmail = params.email && params.email.trim().length > 0 ? params.email : `${params.id}@placeholder.resumate.ai`
  const safeName = params.name && params.name.trim().length > 0 ? params.name : "ResuMate User"

  try {
    const [record] = await sql`
      INSERT INTO users_sync (id, clerk_user_id, email, name, subscription_status, subscription_plan, created_at, updated_at)
      VALUES (
        ${params.id},
        ${params.clerkUserId || null},
        ${safeEmail},
        ${safeName},
        ${params.subscription_status || 'free'},
        ${params.subscription_plan || 'free'},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
        SET clerk_user_id = COALESCE(EXCLUDED.clerk_user_id, users_sync.clerk_user_id),
            email = COALESCE(EXCLUDED.email, users_sync.email),
            name = COALESCE(EXCLUDED.name, users_sync.name),
            subscription_status = COALESCE(EXCLUDED.subscription_status, users_sync.subscription_status),
            subscription_plan = COALESCE(EXCLUDED.subscription_plan, users_sync.subscription_plan),
            updated_at = NOW()
      RETURNING *
    `

    return record as User
  } catch (error: any) {
    if (error.code === '23505' && error.constraint === 'users_sync_clerk_user_id_key' && params.clerkUserId) {
      const [existing] = await sql`
        UPDATE users_sync
        SET email = COALESCE(${safeEmail}, email),
            name = COALESCE(${safeName}, name),
            subscription_status = COALESCE(${params.subscription_status || 'free'}, subscription_status),
            subscription_plan = COALESCE(${params.subscription_plan || 'free'}, subscription_plan),
            updated_at = NOW()
        WHERE clerk_user_id = ${params.clerkUserId}
        RETURNING *
      `
      return existing as User
    }

    throw error
  }
}

// Backfill helper to migrate legacy records that referenced a different user_id
export async function migrateUserOwnedRecords(legacyUserId: string, newUserId: string) {
  if (!legacyUserId || !newUserId || legacyUserId === newUserId) {
    return { resumes: 0, jobAnalyses: 0, optimizedResumes: 0, jobApplications: 0, jobTargets: 0 }
  }

  const updateStatements = [
    sql`UPDATE resumes SET user_id = ${newUserId}, updated_at = NOW() WHERE user_id = ${legacyUserId}`,
    sql`UPDATE job_analysis SET user_id = ${newUserId}, updated_at = NOW() WHERE user_id = ${legacyUserId}`,
    sql`UPDATE optimized_resumes SET user_id = ${newUserId}, updated_at = NOW() WHERE user_id = ${legacyUserId}`,
    sql`UPDATE job_applications SET user_id = ${newUserId}, updated_at = NOW() WHERE user_id = ${legacyUserId}`,
    sql`UPDATE job_targets SET user_id = ${newUserId}, updated_at = NOW() WHERE user_id = ${legacyUserId}`,
  ]

  const [resumesResult, jobAnalysesResult, optimizedResult, applicationsResult, targetsResult] = await Promise.all(updateStatements)

  return {
    resumes: (resumesResult as any).rowCount || 0,
    jobAnalyses: (jobAnalysesResult as any).rowCount || 0,
    optimizedResumes: (optimizedResult as any).rowCount || 0,
    jobApplications: (applicationsResult as any).rowCount || 0,
    jobTargets: (targetsResult as any).rowCount || 0,
  }
}

// User functions
export async function getUserByEmail(email: string) {
  const [user] = await sql`
    SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan,
           subscription_period_end, onboarding_completed_at, created_at, updated_at
    FROM users_sync
    WHERE email = ${email} AND deleted_at IS NULL
  `
  return user as User | undefined
}

export async function createUserFromClerk(clerkUserId: string, email: string, name: string) {
  // First, check if a user with this email already exists (different auth method, same email)
  const existingUserByEmail = await getUserByEmail(email)

  if (existingUserByEmail) {
    // User exists with this email - update their clerk_user_id to link accounts
    const [user] = await sql`
      UPDATE users_sync
      SET clerk_user_id = ${clerkUserId},
          name = ${name},
          deleted_at = NULL,
          updated_at = NOW()
      WHERE email = ${email}
      RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan, subscription_period_end, onboarding_completed_at, created_at, updated_at
    `
    return user as User
  }

  // No existing user with this email, proceed with upsert on clerk_user_id
  const [user] = await sql`
    INSERT INTO users_sync (clerk_user_id, email, name, subscription_status, subscription_plan, onboarding_completed_at, created_at, updated_at)
    VALUES (${clerkUserId}, ${email}, ${name}, 'free', 'free', NULL, NOW(), NOW())
    ON CONFLICT (clerk_user_id) DO UPDATE
      SET email = EXCLUDED.email,
          name = EXCLUDED.name,
          deleted_at = NULL,
          updated_at = NOW()
    RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan, subscription_period_end, onboarding_completed_at, created_at, updated_at
  `
  return user as User
}

export async function getUserByClerkId(clerkUserId: string) {
  const [user] = await sql`
    SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan, 
           subscription_period_end, polar_customer_id, polar_subscription_id,
           beehiiv_subscriber_id, onboarding_completed_at, created_at, updated_at
    FROM users_sync
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
  `
  return user as User | undefined
}

export async function getUserById(id: string) {
  const [user] = await sql`
    SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan,
           subscription_period_end, polar_customer_id, polar_subscription_id,
           beehiiv_subscriber_id, onboarding_completed_at, created_at, updated_at
    FROM users_sync
    WHERE id = ${id} AND deleted_at IS NULL
  `
  return user as User | undefined
}

export async function updateUser(id: string, data: Partial<{ email: string; name: string }>) {
  const [user] = await sql`
    UPDATE users_sync
    SET email = COALESCE(${data.email ?? null}, email),
        name = COALESCE(${data.name ?? null}, name),
        updated_at = NOW()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING *
  `
  return user as User | undefined
}

export async function updateUserFromClerk(clerkUserId: string, data: { email?: string; name?: string }) {
  const [user] = await sql`
    UPDATE users_sync
    SET email = COALESCE(${data.email}, email),
        name = COALESCE(${data.name}, name),
        updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
    RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan, onboarding_completed_at, created_at, updated_at
  `
  return user as User | undefined
}

export async function deleteUserByClerkId(clerkUserId: string) {
  const [user] = await sql`
    UPDATE users_sync 
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
    RETURNING id, clerk_user_id, email, name
  `
  return user as User | undefined
}

export async function markUserOnboardingComplete(userId: string) {
  const [user] = await sql`
    UPDATE users_sync 
    SET onboarding_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${userId} AND deleted_at IS NULL
    RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan, subscription_period_end, onboarding_completed_at, created_at, updated_at
  `
  return user as User | undefined
}

// Resume functions
export async function createResume(data: {
  user_id: string
  title: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  file_hash?: string | null
  content_text?: string
  kind?: ResumeKind
  processing_status?: ResumeProcessingStatus
  processing_error?: string | null
  parsed_sections?: Record<string, any> | null
  extracted_at?: string | Date | null
  source_metadata?: Record<string, any> | null
  is_primary?: boolean
}) {
  const kind = data.kind ?? "uploaded"
  const processingStatus = data.processing_status ?? "completed"
  const processedSections = data.parsed_sections ? JSON.stringify(data.parsed_sections) : null
  const sourceMetadata = data.source_metadata ? JSON.stringify(data.source_metadata) : null
  const extractedAt = data.extracted_at ? new Date(data.extracted_at) : null

  const [resume] = await sql`
    INSERT INTO resumes (
      user_id,
      title,
      file_name,
      file_url,
      file_type,
      file_size,
      file_hash,
      content_text,
      kind,
      processing_status,
      processing_error,
      parsed_sections,
      extracted_at,
      source_metadata,
      is_primary,
      created_at,
      updated_at
    )
    VALUES (
      ${data.user_id},
      ${data.title},
      ${data.file_name},
      ${data.file_url},
      ${data.file_type},
      ${data.file_size},
      ${data.file_hash || null},
      ${data.content_text || null},
      ${kind},
      ${processingStatus},
      ${data.processing_error || null},
      ${processedSections},
      ${extractedAt},
      ${sourceMetadata},
      ${data.is_primary || false},
      NOW(),
      NOW()
    )
    RETURNING *
  `
  return resume as Resume
}

export async function createResumeVersion(data: {
  user_id: string
  resume_id: string
  kind: ResumeKind
  file_name: string
  file_type: string
  file_size: number
  file_hash: string
  storage_key: string
  metadata?: Record<string, any> | null
  change_type?: string
  change_summary?: string | null
}): Promise<ResumeVersionSnapshot> {
  // Ensure user exists in users_sync to satisfy FK constraint
  let userRow = await getUserById(data.user_id)

  if (!userRow) {
    // User not found in database - verify current Clerk user owns this user_id before creating
    const currentClerkUser = await currentUser()

    if (!currentClerkUser) {
      throw new Error(
        `[createResumeVersion] User ${data.user_id} not found in users_sync and no authenticated Clerk user available. ` +
        `Call ensureUserExists() or getOrCreateUser() first to establish proper user record.`
      )
    }

    // Check if current Clerk user has an existing users_sync record
    const clerkUserRow = await getUserByClerkId(currentClerkUser.id)

    if (clerkUserRow) {
      // Clerk user exists in database - verify it matches the requested user_id
      if (clerkUserRow.id !== data.user_id) {
        throw new Error(
          `[createResumeVersion] Clerk user ${currentClerkUser.id} is authenticated but owns database user ${clerkUserRow.id}, ` +
          `not the requested user_id ${data.user_id}. Cannot create resume version for different user.`
        )
      }
      // IDs match, use the existing record
      userRow = clerkUserRow
    } else {
      // Current Clerk user has no users_sync record - cannot safely create one with data.user_id
      throw new Error(
        `[createResumeVersion] User ${data.user_id} not found and current Clerk user ${currentClerkUser.id} has no users_sync record. ` +
        `Call ensureUserExists() or getOrCreateUser() first to establish proper user mapping.`
      )
    }
  } else {
    // User exists - optionally verify it matches current Clerk user
    const currentClerkUser = await currentUser()
    if (currentClerkUser && userRow.clerk_user_id && userRow.clerk_user_id !== currentClerkUser.id) {
      throw new Error(
        `[createResumeVersion] User ${data.user_id} exists but is linked to Clerk user ${userRow.clerk_user_id}, ` +
        `not current authenticated Clerk user ${currentClerkUser.id}. Cannot create resume version for different user.`
      )
    }
  }

  const metadata = data.metadata ? JSON.stringify(data.metadata) : null
  const changeType = data.change_type ?? "upload"
  const changeSummary = data.change_summary ?? null

  const [nextVersionRow] = await sql`
    SELECT COALESCE(MAX(version), 0) + 1 AS next_version
    FROM resume_versions
    WHERE user_id = ${data.user_id} AND kind = ${data.kind}
  `

  const nextVersion = Number((nextVersionRow as any)?.next_version || 1)

  const [snapshot] = await sql`
    INSERT INTO resume_versions (
      user_id,
      resume_id,
      kind,
      version,
      file_name,
      file_type,
      file_size,
      file_hash,
      storage_key,
      metadata,
      change_type,
      change_summary,
      created_at
    )
    VALUES (
      ${data.user_id},
      ${data.resume_id},
      ${data.kind},
      ${nextVersion},
      ${data.file_name},
      ${data.file_type},
      ${data.file_size},
      ${data.file_hash},
      ${data.storage_key},
      ${metadata},
      ${changeType},
      ${changeSummary},
      NOW()
    )
    RETURNING *
  `

  return snapshot as ResumeVersionSnapshot
}

export async function getUserResumes(user_id: string) {
  const resumes = await sql`
    SELECT * FROM resumes 
    WHERE user_id = ${user_id} AND deleted_at IS NULL 
    ORDER BY is_primary DESC, created_at DESC
  `
  return resumes as Resume[]
}

export async function getMasterResume(user_id: string) {
  const [resume] = await sql`
    SELECT * FROM resumes
    WHERE user_id = ${user_id}
      AND kind = 'master'
      AND deleted_at IS NULL
    ORDER BY is_primary DESC, updated_at DESC
    LIMIT 1
  `

  return resume as Resume | undefined
}

export async function getResumeById(id: string, user_id: string) {
  const [resume] = await sql`
    SELECT * FROM resumes 
    WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
  `
  return resume as Resume | undefined
}

export async function updateResume(id: string, user_id: string, data: Partial<Resume>) {
  // Convert undefined to null to avoid UNDEFINED_VALUE error from SQL library
  const title = data.title ?? null
  const is_primary = data.is_primary ?? null

  const [resume] = await sql`
    UPDATE resumes
    SET title = COALESCE(${title}, title),
        is_primary = COALESCE(${is_primary}, is_primary),
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
    RETURNING *
  `
  return resume as Resume | undefined
}

export async function deleteResume(id: string, user_id: string) {
  const [resume] = await sql`
    UPDATE resumes 
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
    RETURNING *
  `
  return resume as Resume | undefined
}

export async function setPrimaryResume(id: string, user_id: string) {
  // First, unset all primary resumes for the user
  await sql`
    UPDATE resumes 
    SET is_primary = false, updated_at = NOW()
    WHERE user_id = ${user_id} AND deleted_at IS NULL
  `

  // Then set the specified resume as primary
  const [resume] = await sql`
    UPDATE resumes 
    SET is_primary = true, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
    RETURNING *
  `
  return resume as Resume | undefined
}

// Simplified createResume function for duplication
export async function createResumeDuplicate(user_id: string, title: string, content: string) {
  const [resume] = await sql`
    INSERT INTO resumes (
      user_id,
      title,
      file_name,
      file_url,
      file_type,
      file_size,
      content_text,
      kind,
      processing_status,
      is_primary,
      created_at,
      updated_at
    )
    VALUES (
      ${user_id},
      ${title},
      'duplicated.txt',
      '',
      'text/plain',
      ${content.length},
      ${content},
      'generated',
      'completed',
      false,
      NOW(),
      NOW()
    )
    RETURNING *
  `
  return resume as Resume
}

export async function updateResumePrimary(user_id: string, resume_id: string) {
  return await setPrimaryResume(resume_id, user_id)
}

export async function updateResumeContent(id: string, content_text: string) {
  const [resume] = await sql`
    UPDATE resumes 
    SET content_text = ${content_text}, updated_at = NOW()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING *
  `
  return resume as Resume | undefined
}

export async function updateResumeAnalysis(
  id: string,
  user_id: string,
  data: {
    content_text?: string | null
    parsed_sections?: Record<string, any> | null
    processing_status?: ResumeProcessingStatus
    processing_error?: string | null
    extracted_at?: string | Date | null
    source_metadata?: Record<string, any> | null
    warnings?: string[]
    modeUsed?: string | null
    truncated?: boolean
    pageCount?: number | null
  },
) {
  // If no data to update, just return the current resume
  if (Object.keys(data).length === 0) {
    const [resume] = await sql`
      SELECT * FROM resumes WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
    `
    return resume as Resume | undefined
  }

  // Use multiple UPDATE statements to handle optional fields properly
  let [resume] = await sql`
    SELECT * FROM resumes WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
  `

  if (!resume) {
    return undefined
  }

  // Update each field individually if provided
  if (data.content_text !== undefined) {
    [resume] = await sql`
      UPDATE resumes SET content_text = ${data.content_text}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.parsed_sections !== undefined) {
    const parsedSections = data.parsed_sections ? JSON.stringify(data.parsed_sections) : null
      ;[resume] = await sql`
      UPDATE resumes SET parsed_sections = ${parsedSections}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.processing_status !== undefined) {
    ;[resume] = await sql`
      UPDATE resumes SET processing_status = ${data.processing_status}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.processing_error !== undefined) {
    ;[resume] = await sql`
      UPDATE resumes SET processing_error = ${data.processing_error}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.extracted_at !== undefined) {
    const extractedAt = data.extracted_at ? new Date(data.extracted_at) : null
      ;[resume] = await sql`
      UPDATE resumes SET extracted_at = ${extractedAt}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.source_metadata !== undefined) {
    const sourceMetadata = data.source_metadata ? JSON.stringify(data.source_metadata) : null
      ;[resume] = await sql`
      UPDATE resumes SET source_metadata = ${sourceMetadata}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.warnings !== undefined) {
    ;[resume] = await sql`
      UPDATE resumes SET warnings = ${data.warnings}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.modeUsed !== undefined) {
    ;[resume] = await sql`
      UPDATE resumes SET mode_used = ${data.modeUsed}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.truncated !== undefined) {
    ;[resume] = await sql`
      UPDATE resumes SET truncated = ${data.truncated}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.pageCount !== undefined) {
    ;[resume] = await sql`
      UPDATE resumes SET page_count = ${data.pageCount}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
      RETURNING *
    `
  }

  return resume as Resume | undefined
}

// Job application functions
export async function createJobApplication(data: {
  user_id: string
  resume_id: string
  job_title: string
  company_name: string
  job_url?: string
  job_description?: string
}) {
  const [application] = await sql`
    INSERT INTO job_applications (user_id, resume_id, job_title, company_name, job_url, job_description, created_at, updated_at)
    VALUES (${data.user_id}, ${data.resume_id}, ${data.job_title}, ${data.company_name}, ${data.job_url || null}, ${data.job_description || null}, NOW(), NOW())
    RETURNING *
  `
  return application as JobApplication
}

export async function getUserJobApplications(user_id: string) {
  const applications = await sql`
    SELECT ja.*, r.title as resume_title 
    FROM job_applications ja
    JOIN resumes r ON ja.resume_id = r.id
    WHERE ja.user_id = ${user_id}
    ORDER BY ja.created_at DESC
  `
  return applications as (JobApplication & { resume_title: string })[]
}

// Job target functions (onboarding)
function normalizeJobUrl(url: string) {
  if (!url) return ""
  try {
    const parsed = new URL(url.trim())
    parsed.hash = ""
    parsed.hostname = parsed.hostname.toLowerCase()
    return parsed.toString()
  } catch {
    return url.trim()
  }
}

export async function createJobTarget(data: {
  user_id: string
  job_url: string
  job_title?: string | null
  company_name?: string | null
  status?: string
  notes?: string | null
}) {
  const sanitizedUrl = normalizeJobUrl(data.job_url)
  if (!sanitizedUrl) {
    throw new Error("Job URL is required")
  }

  const [target] = await sql`
    INSERT INTO job_targets (user_id, job_url, job_title, company_name, status, notes, created_at, updated_at)
    VALUES (
      ${data.user_id},
      ${sanitizedUrl},
      ${data.job_title || null},
      ${data.company_name || null},
      ${data.status ?? null},
      ${data.notes || null},
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, job_url)
    DO UPDATE SET
      job_title = COALESCE(EXCLUDED.job_title, job_targets.job_title),
      company_name = COALESCE(EXCLUDED.company_name, job_targets.company_name),
      status = COALESCE(EXCLUDED.status, job_targets.status),
      notes = COALESCE(EXCLUDED.notes, job_targets.notes),
      updated_at = NOW()
    RETURNING *
  `

  return target as JobTarget
}

export async function getUserJobTargets(user_id: string) {
  const targets = await sql`
    SELECT *
    FROM job_targets
    WHERE user_id = ${user_id}
    ORDER BY created_at DESC
  `
  return targets as JobTarget[]
}

export async function deleteJobTarget(id: string, user_id: string) {
  const [target] = await sql`
    DELETE FROM job_targets
    WHERE id = ${id} AND user_id = ${user_id}
    RETURNING *
  `
  return target as JobTarget | undefined
}

// Enhanced job analysis creation with user verification
export async function createJobAnalysisWithVerification(data: {
  user_id: string
  job_title: string
  company_name?: string
  job_url?: string
  job_description: string
  analysis_result: JobAnalysis["analysis_result"]
}) {
  console.log('Starting job analysis creation with verification:', {
    user_id: data.user_id,
    job_title: data.job_title,
    company_name: data.company_name
  })

  try {
    // Step 1: Verify user exists in database with retry logic
    let user = await getUserById(data.user_id)

    // If user not found, try to ensure they exist via ensureUserSyncRecord
    if (!user) {
      console.warn('User not found on first lookup, attempting to ensure user sync:', { user_id: data.user_id })

      try {
        // Try to get user by their original ID to find clerk_user_id
        const userRecord = await sql`SELECT * FROM users_sync WHERE id = ${data.user_id} LIMIT 1`
        if (userRecord && userRecord.length > 0) {
          user = userRecord[0] as User
        } else {
          // Last resort: ensure the user record exists
          await ensureUserSyncRecord({
            id: data.user_id,
          })

          // Wait a moment for the transaction to commit
          await new Promise(resolve => setTimeout(resolve, 100))

          // Try one more time
          user = await getUserById(data.user_id)
        }
      } catch (syncError: any) {
        console.error('Failed to sync user record:', { error: syncError.message, user_id: data.user_id })
      }
    }

    if (!user) {
      console.error('User not found for job analysis creation after retries:', { user_id: data.user_id })
      throw new Error(`User not found with ID: ${data.user_id}. Cannot create job analysis.`)
    }

    console.log('User verification successful:', {
      user_id: user.id,
      email: user.email,
      clerk_user_id: user.clerk_user_id
    })

    // Step 2: Validate analysis_result structure
    if (!data.analysis_result || typeof data.analysis_result !== 'object') {
      throw new Error('Invalid analysis_result: must be an object')
    }

    // Step 3: Extract fields safely with fallbacks
    const normalizedAnalysis = {
      ...data.analysis_result,
      salary_range: normalizeSalaryRange(data.analysis_result.salary_range as SalaryRangeInput),
    }

    const keywords = Array.isArray(normalizedAnalysis.keywords) ? normalizedAnalysis.keywords : []
    const required_skills = Array.isArray(normalizedAnalysis.required_skills) ? normalizedAnalysis.required_skills : []
    const preferred_skills = Array.isArray(normalizedAnalysis.preferred_skills) ? normalizedAnalysis.preferred_skills : []
    // Cap DB-bound string fields to match schema limits to avoid varchar overflows
    const safeJobTitle = typeof data.job_title === "string" ? data.job_title.slice(0, 255) : data.job_title
    const safeCompanyName = typeof data.company_name === "string" ? data.company_name.slice(0, 255) : data.company_name
    const experience_level = typeof (normalizedAnalysis as any).experience_level === "string"
      ? (normalizedAnalysis as any).experience_level.trim().slice(0, 100)
      : (normalizedAnalysis as any).experience_level || null
    const salary_range = typeof (normalizedAnalysis as any).salary_range === "string"
      ? (normalizedAnalysis as any).salary_range.trim().slice(0, 100)
      : (normalizedAnalysis as any).salary_range || null
    const location = typeof (normalizedAnalysis as any).location === "string"
      ? (normalizedAnalysis as any).location.trim().slice(0, 255)
      : (normalizedAnalysis as any).location || null

    // Step 4: Generate UUID fallback if database doesn't handle it
    const id = generateUUID()

    console.log('Inserting job analysis into database:', {
      id,
      user_id: data.user_id,
      job_title: data.job_title,
      analysis_keys: Object.keys(data.analysis_result)
    })

    // Step 5: Insert with comprehensive error handling
    const [analysis] = await sql`
      INSERT INTO job_analysis (
        id, user_id, job_title, company_name, job_url, job_description, 
        analysis_result, keywords, required_skills, preferred_skills,
        experience_level, salary_range, location, created_at, updated_at
      )
      VALUES (
        ${id}, ${data.user_id}, ${safeJobTitle}, ${safeCompanyName || null}, 
        ${data.job_url || null}, ${data.job_description}, ${JSON.stringify(normalizedAnalysis)},
        ${keywords}, ${required_skills}, ${preferred_skills}, ${experience_level},
        ${salary_range}, ${location}, NOW(), NOW()
      )
      ON CONFLICT (user_id, job_title, company_name)
      DO UPDATE SET
        job_url = EXCLUDED.job_url,
        job_description = EXCLUDED.job_description,
        analysis_result = EXCLUDED.analysis_result,
        keywords = EXCLUDED.keywords,
        required_skills = EXCLUDED.required_skills,
        preferred_skills = EXCLUDED.preferred_skills,
        experience_level = EXCLUDED.experience_level,
        salary_range = EXCLUDED.salary_range,
        location = EXCLUDED.location,
        updated_at = NOW()
      RETURNING *
    `

    const isNewRecord = analysis.id === id

    console.log(isNewRecord ? 'Job analysis created successfully:' : 'Job analysis upserted (duplicate resolved):', {
      analysis_id: analysis.id,
      user_id: analysis.user_id,
      job_title: analysis.job_title
    })

    // Only increment usage for new records, not updates
    if (isNewRecord) {
      try {
        await incrementUsage(user.id, 'job_analysis', user.subscription_plan || 'free')
      } catch (usageError) {
        // Log but don't fail - usage tracking is non-critical
        console.error('[createJobAnalysis] Failed to increment usage:', usageError)
      }
    }

    return analysis as JobAnalysis
  } catch (error: any) {
    console.error('Failed to create job analysis with verification:', {
      error: error.message,
      code: error.code,
      user_id: data.user_id,
      job_title: data.job_title,
      analysis_structure: data.analysis_result ? Object.keys(data.analysis_result) : 'null'
    })

    // Enhanced error handling for foreign key constraint violations
    if (error.code === "23503" || error.code === "23505") {
      await logConstraintViolation('createJobAnalysis', error, {
        user_id: data.user_id,
        job_title: data.job_title,
        company_name: data.company_name,
        operation_step: 'job_analysis_insertion'
      })

      if (error.code === "23503") {
        throw new Error(`Cannot create job analysis: User with ID ${data.user_id} does not exist in the database. Please ensure the user is properly created first.`)
      }
    }

    throw error
  }
}

// Original job analysis function (kept for backward compatibility)
export async function createJobAnalysis(data: {
  user_id: string
  job_title: string
  company_name?: string
  job_url?: string
  job_description: string
  analysis_result: JobAnalysis["analysis_result"]
}) {
  // Delegate to the enhanced version with verification
  return await createJobAnalysisWithVerification(data)
}

export async function getUserJobAnalyses(user_id: string) {
  const analyses = await sql`
    SELECT * FROM job_analysis 
    WHERE user_id = ${user_id}
    ORDER BY created_at DESC
  `
  return analyses as JobAnalysis[]
}

export async function getJobAnalysisById(id: string, user_id: string) {
  const [analysis] = await sql`
    SELECT * FROM job_analysis 
    WHERE id = ${id} AND user_id = ${user_id}
  `
  return analysis as JobAnalysis | undefined
}

export async function getExistingJobAnalysis(user_id: string, job_title: string, company_name?: string) {
  // The job_title and company_name are already normalized by the caller
  // but we'll apply additional normalization here for safety
  const normalizedTitle = normalizeJobField(job_title)
  if (!normalizedTitle) {
    throw new Error('job_title must be a non-empty string')
  }
  const normalizedCompany = normalizeJobField(company_name)

  const [analysis] = await sql`
    SELECT * FROM job_analysis 
    WHERE user_id = ${user_id}
      AND LOWER(TRIM(REGEXP_REPLACE(job_title, '\s+', ' ', 'g'))) = ${normalizedTitle}
      AND LOWER(TRIM(REGEXP_REPLACE(COALESCE(company_name, ''), '\s+', ' ', 'g'))) = ${normalizedCompany || ''}
    ORDER BY created_at ASC
    LIMIT 1
  `
  return analysis as JobAnalysis | undefined
}

export async function deleteJobAnalysis(id: string, user_id: string) {
  const [analysis] = await sql`
    DELETE FROM job_analysis 
    WHERE id = ${id} AND user_id = ${user_id}
    RETURNING *
  `
  return analysis as JobAnalysis | undefined
}

export async function cleanupDuplicateJobAnalyses(specificUserId?: string) {
  try {
    // Find all duplicate job analyses (same user_id + job_title + company_name with multiple records)
    const duplicateGroups = await sql`
      SELECT 
        user_id,
        LOWER(TRIM(job_title)) as normalized_title,
        LOWER(TRIM(COALESCE(company_name, ''))) as normalized_company,
        COUNT(*) as count,
        MIN(id) as oldest_id,
        ARRAY_AGG(id ORDER BY created_at) as all_ids
      FROM job_analysis
      ${specificUserId ? sql`WHERE user_id = ${specificUserId}` : sql``}
      GROUP BY user_id, normalized_title, normalized_company
      HAVING COUNT(*) > 1
      ORDER BY user_id, normalized_title
    `

    if (!duplicateGroups || duplicateGroups.length === 0) {
      return {
        success: true,
        duplicateGroupsFound: 0,
        duplicatesDeleted: 0,
        optimizedResumesUpdated: 0,
        message: 'No duplicate job analyses found'
      }
    }

    let totalDeleted = 0
    let totalUpdated = 0

    for (const group of duplicateGroups) {
      const oldestId = group.oldest_id
      const allIds = group.all_ids as string[]
      const idsToDelete = allIds.filter((id: string) => id !== oldestId)

      if (idsToDelete.length === 0) continue

      // Step 1: Update optimized_resumes to point to the oldest job analysis
      const updateResult = await sql`
        UPDATE optimized_resumes
        SET job_analysis_id = ${oldestId}
        WHERE job_analysis_id = ANY(${idsToDelete}::uuid[])
        RETURNING id
      `
      totalUpdated += updateResult.length

      // Step 2: Delete the duplicate job analyses
      const deleteResult = await sql`
        DELETE FROM job_analysis
        WHERE id = ANY(${idsToDelete}::uuid[])
        RETURNING id
      `
      totalDeleted += deleteResult.length

      console.log(`[Cleanup] Removed ${deleteResult.length} duplicates for "${group.normalized_title}" (${group.normalized_company || 'N/A'}) - kept: ${oldestId}`)
    }

    return {
      success: true,
      duplicateGroupsFound: duplicateGroups.length,
      duplicatesDeleted: totalDeleted,
      optimizedResumesUpdated: totalUpdated,
      message: `Cleaned up ${totalDeleted} duplicate job analyses and updated ${totalUpdated} optimized resume references`
    }
  } catch (error: any) {
    console.error('[Cleanup] Failed to cleanup duplicate job analyses:', error.message)
    throw error
  }
}

// Optimized resume functions
export async function createOptimizedResume(data: {
  user_id: string
  original_resume_id: string
  job_analysis_id?: string | null
  job_title?: string
  company_name?: string | null
  job_description?: string
  title: string
  optimized_content: string
  optimization_summary: OptimizedResume["optimization_summary"]
  match_score?: number
}) {
  const insert = async () => {
    const [optimizedResume] = await sql`
      INSERT INTO optimized_resumes (
        user_id, original_resume_id, job_analysis_id, job_title, company_name,
        job_description, title, optimized_content, optimization_summary, match_score, 
        improvements_made, keywords_added, skills_highlighted, created_at, updated_at
      )
      VALUES (
        ${data.user_id}, ${data.original_resume_id}, ${data.job_analysis_id || null},
        ${data.job_title || null}, ${data.company_name || null}, ${data.job_description || null},
        ${data.title}, ${data.optimized_content}, ${JSON.stringify(data.optimization_summary)},
        ${data.match_score || null}, ${data.optimization_summary.changes_made},
        ${data.optimization_summary.keywords_added}, ${data.optimization_summary.skills_highlighted},
        NOW(), NOW()
      )
      RETURNING *
    `
    return optimizedResume as OptimizedResume
  }

  try {
    return await insert()
  } catch (error: any) {
    if (error.code === "23503" && error.constraint === "optimized_resumes_user_id_fkey") {
      await ensureUserSyncRecord({ id: data.user_id })
      return await insert()
    }

    throw error
  }
}

export async function getUserOptimizedResumes(user_id: string) {
  const optimizedResumes = await sql`
    SELECT opt_res.*, r.title as original_resume_title,
           COALESCE(opt_res.job_title, ja.job_title) as job_title,
           COALESCE(opt_res.company_name, ja.company_name) as company_name
    FROM optimized_resumes opt_res
    JOIN resumes r ON opt_res.original_resume_id = r.id
    LEFT JOIN job_analysis ja ON opt_res.job_analysis_id = ja.id
    WHERE opt_res.user_id = ${user_id}
    ORDER BY opt_res.created_at DESC
  `
  return optimizedResumes as (OptimizedResume & {
    original_resume_title: string
    job_title: string
    company_name?: string
  })[]
}

export async function getOptimizedResumeById(id: string, user_id: string) {
  const [optimizedResume] = await sql`
    SELECT opt_res.*, r.title as original_resume_title,
           COALESCE(opt_res.job_title, ja.job_title) as job_title,
           COALESCE(opt_res.company_name, ja.company_name) as company_name
    FROM optimized_resumes opt_res
    JOIN resumes r ON opt_res.original_resume_id = r.id
    LEFT JOIN job_analysis ja ON opt_res.job_analysis_id = ja.id
    WHERE opt_res.id = ${id} AND opt_res.user_id = ${user_id}
  `
  return optimizedResume as
    | (OptimizedResumeV2 & {
      original_resume_title: string
      job_title: string
      company_name?: string
    })
    | undefined
}

export async function updateOptimizedResume(
  id: string,
  user_id: string,
  data: {
    optimized_content?: string
    optimization_summary?: OptimizedResume["optimization_summary"]
    match_score?: number
  }
) {
  // Convert undefined to null for SQL compatibility
  const optimizedContent = data.optimized_content ?? null
  const optimizationSummary = data.optimization_summary !== undefined 
    ? JSON.stringify(data.optimization_summary) 
    : null
  const matchScore = data.match_score ?? null

  const [optimizedResume] = await sql`
    UPDATE optimized_resumes
    SET 
      optimized_content = COALESCE(${optimizedContent}, optimized_content),
      optimization_summary = COALESCE(${optimizationSummary}::jsonb, optimization_summary),
      match_score = COALESCE(${matchScore}, match_score),
      updated_at = NOW()
    WHERE id = ${id} AND user_id = ${user_id}
    RETURNING *
  `
  return optimizedResume as OptimizedResume | undefined
}

type ExportFormats = {
  docx_url?: string
  pdf_url?: string
  txt_url?: string
}

export async function updateOptimizedResumeV2(
  id: string,
  user_id: string,
  data: {
    structured_output?: SystemPromptV1Output
    qa_metrics?: QASection
    export_formats?: ExportFormats
    optimized_content?: string
    match_score?: number
  }
) {
  console.log('[DB] Updating resume:', id)
  console.log('[DB] Fields being updated:', Object.keys(data).filter(k => (data as any)[k] !== undefined))

  // Prepare JSON values outside SQL query for better type safety
  const structuredOutputJson = data.structured_output !== undefined
    ? JSON.stringify(data.structured_output)
    : null
  const qaMetricsJson = data.qa_metrics !== undefined
    ? JSON.stringify(data.qa_metrics)
    : null
  const exportFormatsJson = data.export_formats !== undefined
    ? JSON.stringify(data.export_formats)
    : null

  if (structuredOutputJson) {
    console.log('[DB] Structured output size:', structuredOutputJson.length, 'bytes')
  }

  const [optimizedResume] = await sql`
    UPDATE optimized_resumes
    SET 
      structured_output = COALESCE(${structuredOutputJson}::jsonb, structured_output),
      qa_metrics = COALESCE(${qaMetricsJson}::jsonb, qa_metrics),
      export_formats = COALESCE(${exportFormatsJson}::jsonb, export_formats),
      optimized_content = COALESCE(${data.optimized_content ?? null}, optimized_content),
      match_score = COALESCE(${data.match_score ?? null}, match_score),
      updated_at = NOW()
    WHERE id = ${id} AND user_id = ${user_id}
    RETURNING *
  `

  console.log('[DB] Update result:', optimizedResume ? 'Success ✓' : 'Failed - No rows updated')

  return optimizedResume as OptimizedResumeV2 | undefined
}

export async function deleteOptimizedResume(id: string, user_id: string) {
  const [optimizedResume] = await sql`
    DELETE FROM optimized_resumes 
    WHERE id = ${id} AND user_id = ${user_id}
    RETURNING *
  `
  return optimizedResume as OptimizedResume | undefined
}

// User profile functions
export async function createUserProfile(data: {
  clerk_user_id: string
  user_id: string
  bio?: string
  company?: string
  job_title?: string
  experience_level?: string
  skills?: string[]
  preferences?: Record<string, any>
}) {
  const [profile] = await sql`
    INSERT INTO user_profiles (clerk_user_id, user_id, bio, company, job_title, experience_level, skills, preferences, created_at, updated_at)
    VALUES (${data.clerk_user_id}, ${data.user_id}, ${data.bio || null}, ${data.company || null}, 
            ${data.job_title || null}, ${data.experience_level || null}, ${data.skills || []}, 
            ${JSON.stringify(data.preferences || {})}, NOW(), NOW())
    RETURNING *
  `
  return profile as UserProfile
}

export async function getUserProfile(clerkUserId: string) {
  const [profile] = await sql`
    SELECT * FROM user_profiles 
    WHERE clerk_user_id = ${clerkUserId}
  `
  return profile as UserProfile | undefined
}

export async function updateUserProfile(clerkUserId: string, data: Partial<UserProfile>) {
  const [profile] = await sql`
    UPDATE user_profiles 
    SET bio = COALESCE(${data.bio}, bio),
        company = COALESCE(${data.company}, company),
        job_title = COALESCE(${data.job_title}, job_title),
        experience_level = COALESCE(${data.experience_level}, experience_level),
        skills = COALESCE(${data.skills}, skills),
        preferences = COALESCE(${JSON.stringify(data.preferences)}, preferences),
        updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId}
    RETURNING *
  `
  return profile as UserProfile | undefined
}

// Subscription functions for billing integration
export async function updateUserSubscription(
  clerkUserId: string,
  data: {
    subscription_status?: string
    subscription_plan?: string
    subscription_period_end?: string | null
    polar_customer_id?: string | null
    polar_subscription_id?: string | null
  },
) {
  // If no data to update, return current user
  if (Object.keys(data).length === 0) {
    const [current] = await sql`
      SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan,
             subscription_period_end, polar_customer_id, polar_subscription_id
      FROM users_sync
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
    `
    return current as User | undefined
  }

  // Use individual UPDATE statements so that explicit nulls are written as NULL
  let [user] = await sql`
    SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan,
           subscription_period_end, polar_customer_id, polar_subscription_id
    FROM users_sync
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
  `

  if (!user) {
    return undefined
  }

  if (data.subscription_status !== undefined) {
    ;[user] = await sql`
      UPDATE users_sync
      SET subscription_status = ${data.subscription_status}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan,
                subscription_period_end, polar_customer_id, polar_subscription_id
    `
  }

  if (data.subscription_plan !== undefined) {
    ;[user] = await sql`
      UPDATE users_sync
      SET subscription_plan = ${data.subscription_plan}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan,
                subscription_period_end, polar_customer_id, polar_subscription_id
    `
  }

  if (data.subscription_period_end !== undefined) {
    ;[user] = await sql`
      UPDATE users_sync
      SET subscription_period_end = ${data.subscription_period_end}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan,
                subscription_period_end, polar_customer_id, polar_subscription_id
    `
  }

  if (data.polar_customer_id !== undefined) {
    ;[user] = await sql`
      UPDATE users_sync
      SET polar_customer_id = ${data.polar_customer_id}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan,
                subscription_period_end, polar_customer_id, polar_subscription_id
    `
  }

  if (data.polar_subscription_id !== undefined) {
    ;[user] = await sql`
      UPDATE users_sync
      SET polar_subscription_id = ${data.polar_subscription_id}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan,
                subscription_period_end, polar_customer_id, polar_subscription_id
    `
  }

  return user as User | undefined
}

// Webhook event logging
export async function logClerkWebhookEvent(data: {
  event_type: string
  event_id: string
  user_id?: string
  raw_data: Record<string, any>
}) {
  const [event] = await sql`
    INSERT INTO clerk_webhook_events (event_type, event_id, user_id, raw_data, created_at)
    VALUES (${data.event_type}, ${data.event_id}, ${data.user_id || null}, ${JSON.stringify(data.raw_data)}, NOW())
    RETURNING *
  `
  return event as ClerkWebhookEvent
}

// Beehiiv subscriber tracking
export async function updateBeehiivSubscriberId(
  clerkUserId: string,
  beehiivSubscriberId: string | null
): Promise<User | undefined> {
  const [user] = await sql`
    UPDATE users_sync
    SET beehiiv_subscriber_id = ${beehiivSubscriberId},
        updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
    RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan,
              subscription_period_end, polar_customer_id, polar_subscription_id,
              beehiiv_subscriber_id, onboarding_completed_at, created_at, updated_at
  `
  return user as User | undefined
}

export async function getBeehiivSubscriberId(clerkUserId: string): Promise<string | null> {
  const [user] = await sql`
    SELECT beehiiv_subscriber_id
    FROM users_sync
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
  `
  return user?.beehiiv_subscriber_id || null
}

// Enhanced user verification function
export async function ensureUserExists(userId: string): Promise<User | null> {
  // First, try to get the user from database
  let dbUser = await getUserByClerkId(userId)

  // Check if user exists and is not soft-deleted
  if (dbUser) {
    console.log('User found in database:', { id: dbUser.id, clerk_user_id: dbUser.clerk_user_id })
    return dbUser
  }

  console.log('User not found in database, attempting to create:', { clerk_user_id: userId })

  // User doesn't exist, try to create them
  const { clerkUser, email, name } = await fetchClerkUser(userId)
  if (!clerkUser) {
    return null
  }

  // Retry logic for user creation with exponential backoff
  let retryCount = 0
  const maxRetries = 3
  let delay = 100 // Start with 100ms

  while (retryCount <= maxRetries) {
    try {
      console.log(`Attempting to create user (attempt ${retryCount + 1}/${maxRetries + 1}):`, {
        clerk_user_id: userId,
        email,
        name
      })

      const newUser = await createUserFromClerk(userId, email, name)
      console.log('User created successfully:', { id: newUser.id, clerk_user_id: newUser.clerk_user_id })
      return newUser
    } catch (error: any) {
      console.error(`User creation attempt ${retryCount + 1} failed:`, {
        error: error.message,
        code: error.code,
        clerk_user_id: userId
      })

      if (error.code === "23505") {
        // Unique constraint violation - user was created concurrently
        await logConstraintViolation('createUserFromClerk', error, {
          clerk_user_id: userId,
          email,
          name,
          attempt: retryCount + 1
        })

        console.log("User creation race condition detected, fetching existing user")
        // Try to find by clerk_user_id first
        const existingUser = await getUserByClerkId(userId)
        if (existingUser) {
          console.log('Found existing user by clerk_user_id after race condition:', { id: existingUser.id })
          return existingUser
        }
        // If not found by clerk_user_id, try by email (handles email constraint violations)
        const existingUserByEmail = await getUserByEmail(email)
        if (existingUserByEmail) {
          console.log('Found existing user by email after race condition:', { id: existingUserByEmail.id })
          // Update the clerk_user_id to link this auth method to the existing account
          const [updatedUser] = await sql`
            UPDATE users_sync
            SET clerk_user_id = ${userId},
                deleted_at = NULL,
                updated_at = NOW()
            WHERE id = ${existingUserByEmail.id}
            RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan, subscription_period_end, onboarding_completed_at, created_at, updated_at
          `
          return updatedUser as User
        }
      }

      if (retryCount >= maxRetries) {
        console.error("Max retries exceeded for user creation:", { clerk_user_id: userId })
        throw error
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2
      retryCount++
    }
  }

  return null
}

// Utility functions
export async function getOrCreateUser(passedUserId?: string) {
  const clerkAuth = passedUserId ? null : await auth()
  const userId = passedUserId ?? clerkAuth?.userId

  if (!userId) {
    console.log("No userId available for getOrCreateUser, returning null")
    return null
  }

  console.log("Getting or creating user for:", { clerk_user_id: userId })

  // Use enhanced user verification with retry logic
  try {
    const user = await ensureUserExists(userId)
    if (!user) {
      console.error("Failed to ensure user exists:", { clerk_user_id: userId })
    }
    return user
  } catch (error: any) {
    console.error("Error in getOrCreateUser:", {
      error: error.message,
      code: error.code,
      clerk_user_id: userId
    })

    // Additional fallback for foreign key constraint violations
    if (error.code === "23503") {
      console.log("Foreign key constraint error detected, attempting one more user creation")
      try {
        // Wait a moment for any database operations to settle
        await new Promise(resolve => setTimeout(resolve, 200))
        return await ensureUserExists(userId)
      } catch (fallbackError: any) {
        console.error("Fallback user creation also failed:", {
          error: fallbackError.message,
          code: fallbackError.code,
          clerk_user_id: userId
        })
      }
    }

    throw error
  }
}

async function fetchClerkUser(userId: string): Promise<{
  clerkUser: any | null
  email: string
  name: string
}> {
  try {
    const sessionUser = await currentUser()
    if (sessionUser && sessionUser.id === userId) {
      const email =
        sessionUser.emailAddresses?.find((address) => address.id === sessionUser.primaryEmailAddressId)?.emailAddress ||
        sessionUser.emailAddresses?.[0]?.emailAddress ||
        ""
      const name = sessionUser.fullName || sessionUser.firstName || sessionUser.username || "User"

      return { clerkUser: sessionUser, email, name }
    }
  } catch (error) {
    console.warn("currentUser() lookup failed", { userId, error })
  }

  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    console.error("CLERK_SECRET_KEY not set; cannot fetch user via Clerk API", { userId })
    return { clerkUser: null, email: "", name: "" }
  }

  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("Clerk REST API returned non-OK status", { userId, status: response.status })
      return { clerkUser: null, email: "", name: "" }
    }

    const clerkUser = await response.json()

    const email = extractPrimaryEmail(clerkUser)
    const name =
      clerkUser.full_name ||
      [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ") ||
      clerkUser.username ||
      "User"

    return { clerkUser, email, name }
  } catch (error) {
    console.error("Failed to fetch Clerk user via REST API", { userId, error })
    return { clerkUser: null, email: "", name: "" }
  }
}

function extractPrimaryEmail(clerkUser: any): string {
  if (!clerkUser) return ""

  if (Array.isArray(clerkUser.emailAddresses)) {
    const match = clerkUser.emailAddresses.find((address: any) => address.id === clerkUser.primaryEmailAddressId)
    if (match?.emailAddress) return match.emailAddress
    if (clerkUser.emailAddresses[0]?.emailAddress) return clerkUser.emailAddresses[0].emailAddress
  }

  if (Array.isArray(clerkUser.email_addresses)) {
    const primaryId = clerkUser.primary_email_address_id
    const match = clerkUser.email_addresses.find((address: any) => address.id === primaryId)
    if (match?.email_address) return match.email_address
    if (clerkUser.email_addresses[0]?.email_address) return clerkUser.email_addresses[0].email_address
  }

  return clerkUser.email_address || clerkUser.email || ""
}

// ==================== USAGE TRACKING FUNCTIONS ====================

export type FeatureType = 'resume_optimization' | 'job_analysis' | 'resume_version'

export interface UsageTracking {
  id: string
  user_id: string
  feature_type: FeatureType
  usage_count: number
  period_start: Date
  period_end: Date
  subscription_plan: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Get or create usage tracking record for a user and feature in the current period
 */
export async function getOrCreateUsageTracking(
  userId: string,
  featureType: FeatureType,
  subscriptionPlan: string = 'free'
): Promise<UsageTracking> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1) // First day of current month
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) // Last day of current month

  const result = await sql`
    INSERT INTO usage_tracking (
      user_id, feature_type, usage_count, period_start, period_end, subscription_plan
    ) VALUES (
      ${userId}, ${featureType}, 0, ${periodStart}, ${periodEnd}, ${subscriptionPlan}
    )
    ON CONFLICT (user_id, feature_type, period_start, period_end)
    DO UPDATE SET updated_at = NOW()
    RETURNING *
  `

  return result[0] as UsageTracking
}

/**
 * Get current usage for a user and feature in the current period
 */
export async function getCurrentUsage(
  userId: string,
  featureType: FeatureType
): Promise<number> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const result = await sql`
    SELECT usage_count
    FROM usage_tracking
    WHERE user_id = ${userId}
      AND feature_type = ${featureType}
      AND period_start <= ${now}
      AND period_end >= ${now}
    ORDER BY created_at DESC
    LIMIT 1
  `

  return result.length > 0 ? result[0].usage_count : 0
}

/**
 * Get all usage for a user in the current period
 */
export async function getAllCurrentUsage(userId: string): Promise<{
  resumeOptimizations: number
  jobAnalyses: number
  resumeVersions: number
}> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const result = await sql`
    SELECT feature_type, usage_count
    FROM usage_tracking
    WHERE user_id = ${userId}
      AND period_start <= ${now}
      AND period_end >= ${now}
  `

  const usage = {
    resumeOptimizations: 0,
    jobAnalyses: 0,
    resumeVersions: 0
  }

  for (const row of result) {
    switch (row.feature_type) {
      case 'resume_optimization':
        usage.resumeOptimizations = row.usage_count
        break
      case 'job_analysis':
        usage.jobAnalyses = row.usage_count
        break
      case 'resume_version':
        usage.resumeVersions = row.usage_count
        break
    }
  }

  return usage
}

/**
 * Increment usage for a user and feature
 */
export async function incrementUsage(
  userId: string,
  featureType: FeatureType,
  subscriptionPlan: string = 'free'
): Promise<number> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // First ensure the record exists
  await getOrCreateUsageTracking(userId, featureType, subscriptionPlan)

  // Then increment the count
  const result = await sql`
    UPDATE usage_tracking
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE user_id = ${userId}
      AND feature_type = ${featureType}
      AND period_start <= ${now}
      AND period_end >= ${now}
    RETURNING usage_count
  `

  return result.length > 0 ? result[0].usage_count : 1
}

/**
 * Reset usage for a user (used when subscription is upgraded/renewed)
 */
export async function resetUsage(
  userId: string,
  featureType?: FeatureType
): Promise<void> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  if (featureType) {
    await sql`
      UPDATE usage_tracking
      SET usage_count = 0,
          updated_at = NOW()
      WHERE user_id = ${userId}
        AND feature_type = ${featureType}
        AND period_start <= ${now}
        AND period_end >= ${now}
    `
  } else {
    // Reset all features
    await sql`
      UPDATE usage_tracking
      SET usage_count = 0,
          updated_at = NOW()
      WHERE user_id = ${userId}
        AND period_start <= ${now}
        AND period_end >= ${now}
    `
  }
}

/**
 * Check if user has exceeded their usage limit for a feature
 */
export async function hasExceededUsageLimit(
  userId: string,
  featureType: FeatureType,
  limit: number
): Promise<boolean> {
  const currentUsage = await getCurrentUsage(userId, featureType)
  return currentUsage >= limit
}

// Caching functions for LLM extraction
export async function getCachedStructure(resumeId: string): Promise<ParsedResume | null> {
  try {
    const [resume] = await sql`
      SELECT parsed_structure FROM resumes
      WHERE id = ${resumeId}
    `
    const cached = resume?.parsed_structure as unknown as ParsedResume | null
    if (!cached) return null

    // Normalize the cached structure - ensure all required arrays exist
    // This handles legacy cached structures that may be missing newer fields
    const normalized = {
      contact: cached.contact || { name: '' },
      targetTitle: cached.targetTitle,
      summary: cached.summary,
      workExperience: cached.workExperience || [],
      education: cached.education || [],
      skills: cached.skills || [],
      interests: cached.interests || [],
      certifications: cached.certifications || [],
      awards: cached.awards || [],
      projects: cached.projects || [],
      volunteering: cached.volunteering || [],
      publications: cached.publications || [],
    }

    // Validate that essential fields exist - if not, return null to force re-extraction
    // This handles legacy/incomplete caches that are missing contact info or other important data
    const hasContactName = normalized.contact?.name && normalized.contact.name.trim().length > 0
    const hasWorkExperience = normalized.workExperience && normalized.workExperience.length > 0

    if (!hasContactName) {
      console.log('[getCachedStructure] Invalid cache - missing contact name, forcing re-extraction:', {
        resumeId,
        contactName: normalized.contact?.name?.substring(0, 20) || '(empty)',
      })
      return null
    }

    if (!hasWorkExperience) {
      console.warn('[getCachedStructure] Warning: cached resume has no work experience:', { resumeId })
    }

    return normalized
  } catch (error: any) {
    // Handle case where column doesn't exist yet (migration not applied or connection pool cache)
    if (error.message?.includes('parsed_structure') && error.message?.includes('does not exist')) {
      console.warn('[getCachedStructure] parsed_structure column not found - migration may not be applied or server needs restart')
      return null
    }
    throw error
  }
}

export async function saveParsedStructure(resumeId: string, structure: ParsedResume): Promise<void> {
  try {
    await sql`
      UPDATE resumes
      SET parsed_structure = ${structure},
          parsed_at = NOW(),
          updated_at = NOW()
      WHERE id = ${resumeId}
    `
  } catch (error: any) {
    // Handle case where column doesn't exist yet (migration not applied or connection pool cache)
    if (error.message?.includes('parsed_structure') && error.message?.includes('does not exist')) {
      console.warn('[saveParsedStructure] parsed_structure column not found - migration may not be applied or server needs restart')
      // Silently fail - caching is non-critical
      return
    }
    throw error
  }
}

export async function clearParsedStructure(resumeId: string): Promise<void> {
  try {
    await sql`
      UPDATE resumes
      SET parsed_structure = NULL,
          parsed_at = NULL,
          updated_at = NOW()
      WHERE id = ${resumeId}
    `
    console.log(`[clearParsedStructure] Cleared cache for resume: ${resumeId}`)
  } catch (error: any) {
    if (error.message?.includes('parsed_structure') && error.message?.includes('does not exist')) {
      console.warn('[clearParsedStructure] parsed_structure column not found - ignoring')
      return
    }
    throw error
  }
}

// ==================== POLAR SUBSCRIPTION FUNCTIONS ====================

/**
 * Normalize email address by removing the +alias part
 * e.g., "hello+new@example.com" -> "hello@example.com"
 */
export function normalizeEmail(email: string): string {
  const [localPart, domain] = email.toLowerCase().split('@')
  if (!domain) return email.toLowerCase()

  // Remove everything after + in the local part
  const normalizedLocal = localPart.split('+')[0]
  return `${normalizedLocal}@${domain}`
}

/**
 * Get pending Polar subscription by customer email (unlinked, active)
 * Also checks for email alias matches (e.g., hello+new@domain.com matches hello@domain.com)
 */
export async function getPendingSubscriptionByEmail(email: string): Promise<PendingPolarSubscription | null> {
  const normalizedEmail = normalizeEmail(email)

  // First try exact match, then try normalized match on both sides
  const [subscription] = await sql`
    SELECT *
    FROM pending_polar_subscriptions
    WHERE (
      customer_email = ${email}
      OR customer_email = ${normalizedEmail}
      OR LOWER(SPLIT_PART(SPLIT_PART(customer_email, '@', 1), '+', 1) || '@' || SPLIT_PART(customer_email, '@', 2)) = ${normalizedEmail}
    )
      AND linked_user_id IS NULL
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `
  return subscription as PendingPolarSubscription | null
}

// Supported plan types for Polar subscriptions
const SUPPORTED_PLAN_TYPES = ['free', 'pro', 'enterprise'] as const
type SupportedPlanType = typeof SUPPORTED_PLAN_TYPES[number]

// Common ISO 4217 currency codes we support
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const
type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

/**
 * Extract plan type from Polar webhook data
 */
function extractPlanTypeFromWebhook(webhookData: Record<string, any> | null | undefined): string | null {
  if (!webhookData) return null

  // Try common Polar webhook paths for plan information
  const planType = webhookData.product?.name?.toLowerCase() ||
    webhookData.plan?.name?.toLowerCase() ||
    webhookData.subscription?.product?.name?.toLowerCase() ||
    webhookData.data?.product?.name?.toLowerCase() ||
    webhookData.data?.subscription?.product?.name?.toLowerCase()

  if (!planType) return null

  // Normalize plan names to our supported types
  if (planType.includes('pro') || planType.includes('premium')) return 'pro'
  if (planType.includes('enterprise') || planType.includes('business')) return 'enterprise'
  if (planType.includes('free') || planType.includes('starter')) return 'free'

  return planType
}

/**
 * Extract currency from Polar webhook data
 */
function extractCurrencyFromWebhook(webhookData: Record<string, any> | null | undefined): string | null {
  if (!webhookData) return null

  // Try common Polar webhook paths for currency
  return webhookData.currency ||
    webhookData.price?.currency ||
    webhookData.subscription?.price?.currency ||
    webhookData.data?.currency ||
    webhookData.data?.subscription?.price?.currency ||
    null
}

/**
 * Create a pending Polar subscription record from webhook data
 *
 * @throws Error if plan_type or currency cannot be determined and are not provided
 */
export async function createPendingPolarSubscription(data: {
  polar_subscription_id: string
  polar_customer_id: string
  polar_checkout_id?: string | null
  customer_email: string
  customer_name?: string | null
  plan_type?: string | null
  status: string
  amount: number
  currency?: string | null
  recurring_interval?: string | null
  current_period_start?: Date | string | null
  current_period_end?: Date | string | null
  raw_webhook_data?: Record<string, any> | null
}): Promise<PendingPolarSubscription> {
  const periodStart = data.current_period_start ? new Date(data.current_period_start) : null
  const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null

  // Resolve plan_type: use provided value, extract from webhook, or throw error
  let resolvedPlanType = data.plan_type
  if (!resolvedPlanType) {
    resolvedPlanType = extractPlanTypeFromWebhook(data.raw_webhook_data)
  }

  if (!resolvedPlanType) {
    throw new Error(
      `[createPendingPolarSubscription] plan_type is required but was not provided and could not be extracted from webhook data. ` +
      `polar_subscription_id: ${data.polar_subscription_id}, customer_email: ${data.customer_email}`
    )
  }

  // Validate plan_type is supported (warn but don't block for unknown types)
  if (!SUPPORTED_PLAN_TYPES.includes(resolvedPlanType as SupportedPlanType)) {
    console.warn(
      `[createPendingPolarSubscription] Unknown plan_type '${resolvedPlanType}' - not in supported list: ${SUPPORTED_PLAN_TYPES.join(', ')}. ` +
      `Proceeding anyway. polar_subscription_id: ${data.polar_subscription_id}`
    )
  }

  // Resolve currency: use provided value, extract from webhook, or throw error
  let resolvedCurrency = data.currency
  if (!resolvedCurrency) {
    resolvedCurrency = extractCurrencyFromWebhook(data.raw_webhook_data)
  }

  if (!resolvedCurrency) {
    throw new Error(
      `[createPendingPolarSubscription] currency is required but was not provided and could not be extracted from webhook data. ` +
      `polar_subscription_id: ${data.polar_subscription_id}, customer_email: ${data.customer_email}`
    )
  }

  // Normalize currency to uppercase
  resolvedCurrency = resolvedCurrency.toUpperCase()

  // Validate currency is supported (warn but don't block for unknown currencies)
  if (!SUPPORTED_CURRENCIES.includes(resolvedCurrency as SupportedCurrency)) {
    console.warn(
      `[createPendingPolarSubscription] Unknown currency '${resolvedCurrency}' - not in supported list: ${SUPPORTED_CURRENCIES.join(', ')}. ` +
      `Proceeding anyway. polar_subscription_id: ${data.polar_subscription_id}`
    )
  }

  console.log('[createPendingPolarSubscription] Creating subscription with validated values:', {
    polar_subscription_id: data.polar_subscription_id,
    customer_email: data.customer_email,
    plan_type: resolvedPlanType,
    currency: resolvedCurrency
  })

  const [subscription] = await sql`
    INSERT INTO pending_polar_subscriptions (
      polar_subscription_id,
      polar_customer_id,
      polar_checkout_id,
      customer_email,
      customer_name,
      plan_type,
      status,
      amount,
      currency,
      recurring_interval,
      current_period_start,
      current_period_end,
      raw_webhook_data,
      created_at,
      updated_at
    ) VALUES (
      ${data.polar_subscription_id},
      ${data.polar_customer_id},
      ${data.polar_checkout_id || null},
      ${data.customer_email},
      ${data.customer_name || null},
      ${resolvedPlanType},
      ${data.status},
      ${data.amount},
      ${resolvedCurrency},
      ${data.recurring_interval || null},
      ${periodStart},
      ${periodEnd},
      ${data.raw_webhook_data ? JSON.stringify(data.raw_webhook_data) : null},
      NOW(),
      NOW()
    )
    ON CONFLICT (polar_subscription_id) DO UPDATE SET
      status = EXCLUDED.status,
      plan_type = EXCLUDED.plan_type,
      currency = EXCLUDED.currency,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      raw_webhook_data = EXCLUDED.raw_webhook_data,
      updated_at = NOW()
    RETURNING *
  `

  return subscription as PendingPolarSubscription
}

/**
 * Link a pending Polar subscription to a user
 * Uses a transaction to ensure both updates succeed or both fail
 */
export async function linkPendingSubscription(
  userId: string,
  pendingSub: PendingPolarSubscription
): Promise<User | null> {
  try {
    const updatedUser = await withTransaction(async (tx) => {
      // Update the user's subscription data
      const [user] = await tx`
        UPDATE users_sync
        SET subscription_status = 'active',
            subscription_plan = ${pendingSub.plan_type},
            subscription_period_end = ${pendingSub.current_period_end},
            polar_customer_id = ${pendingSub.polar_customer_id},
            polar_subscription_id = ${pendingSub.polar_subscription_id},
            updated_at = NOW()
        WHERE id = ${userId} AND deleted_at IS NULL
        RETURNING *
      `

      if (!user) {
        throw new Error(`Failed to update user: ${userId}`)
      }

      // Mark the pending subscription as linked
      await tx`
        UPDATE pending_polar_subscriptions
        SET linked_user_id = ${userId},
            linked_at = NOW(),
            updated_at = NOW()
        WHERE id = ${pendingSub.id}
      `

      return user
    })

    console.log('[linkPendingSubscription] Successfully linked subscription:', {
      userId,
      polarSubscriptionId: pendingSub.polar_subscription_id,
      plan: pendingSub.plan_type
    })

    return updatedUser as unknown as User
  } catch (error) {
    console.error('[linkPendingSubscription] Transaction failed:', {
      userId,
      pendingSubId: pendingSub.id,
      error: error instanceof Error ? error.message : error
    })
    return null
  }
}

/**
 * Link a pending Polar subscription to a user by email
 * Uses a transaction to ensure both updates succeed or both fail
 * This is useful for webhook scenarios where we have email but need to find the user
 */
export async function linkPendingSubscriptionByEmail(
  email: string,
  pendingSub: PendingPolarSubscription
): Promise<User | null> {
  try {
    const updatedUser = await withTransaction(async (tx) => {
      // First, find the user by email
      const [user] = await tx`
        SELECT id FROM users_sync
        WHERE email = ${email} AND deleted_at IS NULL
        LIMIT 1
      `

      if (!user) {
        throw new Error(`User not found with email: ${email}`)
      }

      const userId = user.id

      // Update the user's subscription data
      const [updatedUser] = await tx`
        UPDATE users_sync
        SET subscription_status = 'active',
            subscription_plan = ${pendingSub.plan_type},
            subscription_period_end = ${pendingSub.current_period_end},
            polar_customer_id = ${pendingSub.polar_customer_id},
            polar_subscription_id = ${pendingSub.polar_subscription_id},
            updated_at = NOW()
        WHERE id = ${userId} AND deleted_at IS NULL
        RETURNING *
      `

      if (!updatedUser) {
        throw new Error(`Failed to update user: ${userId}`)
      }

      // Mark the pending subscription as linked
      await tx`
        UPDATE pending_polar_subscriptions
        SET linked_user_id = ${userId},
            linked_at = NOW(),
            updated_at = NOW()
        WHERE id = ${pendingSub.id}
      `

      return updatedUser
    })

    console.log('[linkPendingSubscriptionByEmail] Successfully linked subscription:', {
      email,
      polarSubscriptionId: pendingSub.polar_subscription_id,
      plan: pendingSub.plan_type
    })

    return updatedUser as unknown as User
  } catch (error) {
    console.error('[linkPendingSubscriptionByEmail] Transaction failed:', {
      email,
      pendingSubId: pendingSub.id,
      error: error instanceof Error ? error.message : error
    })
    return null
  }
}

/**
 * Update user subscription with Polar data (for existing users)
 */
export async function updateUserPolarSubscription(
  clerkUserId: string,
  data: {
    subscription_status?: string
    subscription_plan?: string
    subscription_period_end?: string | Date | null
    polar_customer_id?: string | null
    polar_subscription_id?: string | null
  }
): Promise<User | null> {
  const periodEnd = data.subscription_period_end
    ? (typeof data.subscription_period_end === 'string'
      ? data.subscription_period_end
      : data.subscription_period_end.toISOString())
    : null

  let [user] = await sql`
    SELECT * FROM users_sync
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
  `

  if (!user) {
    return null
  }

  if (data.subscription_status !== undefined) {
    [user] = await sql`
      UPDATE users_sync
      SET subscription_status = ${data.subscription_status}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.subscription_plan !== undefined) {
    [user] = await sql`
      UPDATE users_sync
      SET subscription_plan = ${data.subscription_plan}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.subscription_period_end !== undefined) {
    [user] = await sql`
      UPDATE users_sync
      SET subscription_period_end = ${periodEnd}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.polar_customer_id !== undefined) {
    [user] = await sql`
      UPDATE users_sync
      SET polar_customer_id = ${data.polar_customer_id}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING *
    `
  }

  if (data.polar_subscription_id !== undefined) {
    [user] = await sql`
      UPDATE users_sync
      SET polar_subscription_id = ${data.polar_subscription_id}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING *
    `
  }

  return user as User
}

/**
 * Update user subscription by email (for users who paid before creating account)
 */
export async function updateUserSubscriptionByEmail(
  email: string,
  data: {
    subscription_status?: string
    subscription_plan?: string
    subscription_period_end?: string | Date | null
    polar_customer_id?: string | null
    polar_subscription_id?: string | null
  }
): Promise<User | null> {
  const periodEnd = data.subscription_period_end
    ? (typeof data.subscription_period_end === 'string'
      ? data.subscription_period_end
      : data.subscription_period_end.toISOString())
    : null

  const [user] = await sql`
    UPDATE users_sync
    SET subscription_status = COALESCE(${data.subscription_status ?? null}, subscription_status),
        subscription_plan = COALESCE(${data.subscription_plan ?? null}, subscription_plan),
        subscription_period_end = COALESCE(${periodEnd}, subscription_period_end),
        polar_customer_id = COALESCE(${data.polar_customer_id ?? null}, polar_customer_id),
        polar_subscription_id = COALESCE(${data.polar_subscription_id ?? null}, polar_subscription_id),
        updated_at = NOW()
    WHERE email = ${email} AND deleted_at IS NULL
    RETURNING *
  `

  return user as User | null
}

/**
 * Update pending subscription status (for cancellations, etc.)
 */
export async function updatePendingSubscriptionStatus(
  polarSubscriptionId: string,
  status: string
): Promise<PendingPolarSubscription | null> {
  const [subscription] = await sql`
    UPDATE pending_polar_subscriptions
    SET status = ${status},
        updated_at = NOW()
    WHERE polar_subscription_id = ${polarSubscriptionId}
    RETURNING *
  `

  return subscription as PendingPolarSubscription | null
}
