import { neon } from "@neondatabase/serverless"
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { normalizeSalaryRange, type SalaryRangeInput } from "./normalizers"

const databaseUrl = process.env.DATABASE_URL
const isDbConfigured = Boolean(databaseUrl)

type SqlClient = <T = Record<string, any>>(strings: TemplateStringsArray, ...values: any[]) => Promise<T[]>

const sql: SqlClient = databaseUrl
  ? (neon(databaseUrl) as unknown as SqlClient)
  : (async () => {
      throw new Error("DATABASE_URL is not configured. Set it to enable database features.")
    }) as unknown as SqlClient

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
  stripe_customer_id?: string
  stripe_subscription_id?: string
  onboarding_completed_at?: string | null
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
  job_analysis_id: string
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

export interface UserProfile {
  id: string
  clerk_user_id: string
  user_id: string
  bio?: string
  company?: string
  job_title?: string
  experience_level?: string
  skills: string[]
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
export async function createUserFromClerk(clerkUserId: string, email: string, name: string) {
  const [user] = await sql`
    INSERT INTO users_sync (clerk_user_id, email, name, subscription_status, subscription_plan, onboarding_completed_at, created_at, updated_at)
    VALUES (${clerkUserId}, ${email}, ${name}, 'free', 'free', NULL, NOW(), NOW())
    ON CONFLICT (clerk_user_id) DO UPDATE
      SET email = EXCLUDED.email,
          name = EXCLUDED.name,
          deleted_at = NULL,
          updated_at = NOW()
    RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan, subscription_period_end, stripe_customer_id, stripe_subscription_id, onboarding_completed_at, created_at, updated_at
  `
  return user as User
}

export async function getUserByClerkId(clerkUserId: string) {
  const [user] = await sql`
    SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan, 
           subscription_period_end, stripe_customer_id, stripe_subscription_id, onboarding_completed_at, created_at, updated_at
    FROM users_sync
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
  `
  return user as User | undefined
}

export async function getUserById(id: string) {
  const [user] = await sql`
    SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan, 
           subscription_period_end, stripe_customer_id, stripe_subscription_id, onboarding_completed_at, created_at, updated_at
    FROM users_sync
    WHERE id = ${id} AND deleted_at IS NULL
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
    RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan, subscription_period_end, stripe_customer_id, stripe_subscription_id, onboarding_completed_at, created_at, updated_at
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
  const [resume] = await sql`
    UPDATE resumes 
    SET title = COALESCE(${data.title}, title),
        is_primary = COALESCE(${data.is_primary}, is_primary),
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL
    RETURNING *
  `
  return resume as Resume | undefined
}

export async function updateResumeFieldsAtomic(
  id: string,
  user_id: string,
  data: {
    content_text?: string
    parsed_sections?: Record<string, any>
    processing_status?: ResumeProcessingStatus
    processing_error?: string | null
    title?: string
  }
) {
  // Build dynamic UPDATE with only provided fields for single atomic operation
  const parsedSections = data.parsed_sections !== undefined ? JSON.stringify(data.parsed_sections) : undefined
  
  const [resume] = await sql`
    UPDATE resumes
    SET content_text = COALESCE(${data.content_text}, content_text),
        parsed_sections = COALESCE(${parsedSections}, parsed_sections),
        processing_status = COALESCE(${data.processing_status}, processing_status),
        processing_error = COALESCE(${data.processing_error}, processing_error),
        title = COALESCE(${data.title}, title),
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

// Master Resume functions with enhanced metadata
export async function getMasterResumesWithMetadata(user_id: string) {
  const resumes = await sql`
    SELECT * FROM resumes 
    WHERE user_id = ${user_id} 
      AND kind IN ('master', 'uploaded', 'duplicate')
      AND deleted_at IS NULL 
    ORDER BY is_primary DESC, updated_at DESC
  `
  return resumes as Resume[]
}

export async function duplicateResume(resume_id: string, user_id: string, new_title: string) {
  // Get the original resume
  const [original] = await sql`
    SELECT * FROM resumes 
    WHERE id = ${resume_id} AND user_id = ${user_id} AND deleted_at IS NULL
  `
  
  if (!original) {
    throw new Error('Resume not found')
  }

  // Create the duplicate
  const [duplicate] = await sql`
    INSERT INTO resumes (
      user_id,
      title,
      file_name,
      file_url,
      file_type,
      file_size,
      content_text,
      parsed_sections,
      kind,
      processing_status,
      is_primary,
      created_at,
      updated_at
    )
    VALUES (
      ${user_id},
      ${new_title},
      ${'Copy of ' + original.file_name},
      ${original.file_url || ''},
      ${original.file_type || 'text/plain'},
      ${original.file_size || 0},
      ${original.content_text || ''},
      ${original.parsed_sections ? JSON.stringify(original.parsed_sections) : null},
      'duplicate',
      'completed',
      false,
      NOW(),
      NOW()
    )
    RETURNING *
  `
  return duplicate as Resume
}

export async function getMasterResumeActivity(user_id: string, limit: number = 10) {
  const activities = await sql`
    SELECT 
      id,
      title,
      updated_at,
      created_at,
      kind
    FROM resumes 
    WHERE user_id = ${user_id} 
      AND kind IN ('master', 'uploaded', 'duplicate')
      AND deleted_at IS NULL 
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `
  return activities as Resume[]
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

// Enhanced application functions for new dashboard
export async function getUserApplicationsWithDetails(user_id: string) {
  const applications = await sql`
    SELECT 
      or_res.id,
      or_res.title,
      or_res.created_at,
      or_res.match_score,
      ja_analysis.job_title,
      ja_analysis.company_name,
      ja_analysis.job_url,
      r.title as variant_name,
      'pending' as status
    FROM optimized_resumes or_res
    JOIN job_analysis ja_analysis ON or_res.job_analysis_id = ja_analysis.id
    JOIN resumes r ON or_res.original_resume_id = r.id
    WHERE or_res.user_id = ${user_id}
    ORDER BY or_res.created_at DESC
  `
  return applications as Array<{
    id: string
    title: string
    created_at: string
    match_score: number | null
    job_title: string
    company_name: string | null
    job_url: string | null
    variant_name: string
    status: string
  }>
}

export async function getApplicationStats(user_id: string) {
  const [stats] = await sql`
    SELECT 
      COUNT(DISTINCT or_res.id) as total_applications,
      COUNT(DISTINCT or_res.id) as total_optimizations,
      COUNT(DISTINCT or_res.original_resume_id) as total_variants,
      COALESCE(AVG(or_res.match_score), 0) as avg_match
    FROM optimized_resumes or_res
    WHERE or_res.user_id = ${user_id}
  `
  return {
    applications: parseInt(stats?.total_applications || '0'),
    optimizations: parseInt(stats?.total_optimizations || '0'),
    variants: parseInt(stats?.total_variants || '0'),
    avgMatch: Math.round(parseFloat(stats?.avg_match || '0')),
  }
}

export async function getActivityFeed(user_id: string, limit: number = 10) {
  const activities = await sql`
    SELECT 
      or_res.id,
      or_res.title,
      or_res.created_at,
      or_res.match_score,
      ja_analysis.job_title,
      ja_analysis.company_name,
      'optimization' as activity_type
    FROM optimized_resumes or_res
    JOIN job_analysis ja_analysis ON or_res.job_analysis_id = ja_analysis.id
    WHERE or_res.user_id = ${user_id}
    ORDER BY or_res.created_at DESC
    LIMIT ${limit}
  `
  return activities as Array<{
    id: string
    title: string
    created_at: string
    match_score: number | null
    job_title: string
    company_name: string | null
    activity_type: string
  }>
}

export async function updateApplicationStatus(id: string, user_id: string, status: string) {
  const [application] = await sql`
    UPDATE job_applications
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${user_id}
    RETURNING *
  `
  return application as JobApplication | undefined
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
    // Step 1: Verify user exists in database
    const user = await getUserById(data.user_id)
    if (!user) {
      console.error('User not found for job analysis creation:', { user_id: data.user_id })
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
    
    // Truncate fields to fit database constraints (prevent varchar overflow)
    const experience_level = normalizedAnalysis.experience_level 
      ? String(normalizedAnalysis.experience_level).substring(0, 50) 
      : null
    const salary_range = normalizedAnalysis.salary_range 
      ? (typeof normalizedAnalysis.salary_range === 'string' 
          ? normalizedAnalysis.salary_range.substring(0, 100)
          : JSON.stringify(normalizedAnalysis.salary_range).substring(0, 100))
      : null
    const location = normalizedAnalysis.location 
      ? String(normalizedAnalysis.location).substring(0, 255) 
      : null

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
        ${id}, ${data.user_id}, ${data.job_title}, ${data.company_name || null}, 
        ${data.job_url || null}, ${data.job_description}, ${JSON.stringify(normalizedAnalysis)},
        ${keywords}, ${required_skills}, ${preferred_skills}, ${experience_level},
        ${salary_range}, ${location}, NOW(), NOW()
      )
      RETURNING *
    `

    console.log('Job analysis created successfully:', { 
      analysis_id: analysis.id, 
      user_id: analysis.user_id,
      job_title: analysis.job_title 
    })

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

export async function deleteJobAnalysis(id: string, user_id: string) {
  const [analysis] = await sql`
    DELETE FROM job_analysis 
    WHERE id = ${id} AND user_id = ${user_id}
    RETURNING *
  `
  return analysis as JobAnalysis | undefined
}

// Enhanced job functions for new Jobs page
export async function getJobStats(user_id: string) {
  const [stats] = await sql`
    SELECT 
      COUNT(DISTINCT ja.id) as jobs_saved,
      COUNT(DISTINCT or_res.id) as cvs_generated,
      (
        SELECT COUNT(DISTINCT unnested_keyword)
        FROM job_analysis ja2,
        LATERAL unnest(ja2.keywords) as unnested_keyword
        WHERE ja2.user_id = ${user_id}
      ) as keywords_extracted,
      COALESCE(AVG(or_res.match_score), 0) as avg_match
    FROM job_analysis ja
    LEFT JOIN optimized_resumes or_res ON ja.id = or_res.job_analysis_id AND or_res.user_id = ${user_id}
    WHERE ja.user_id = ${user_id}
  `
  
  return {
    jobsSaved: parseInt(stats?.jobs_saved || '0'),
    cvsGenerated: parseInt(stats?.cvs_generated || '0'),
    keywordsExtracted: parseInt(stats?.keywords_extracted || '0'),
    avgMatch: Math.round(parseFloat(stats?.avg_match || '0')),
  }
}

export async function getJobTrends(user_id: string) {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [trend] = await sql`
    SELECT
      (SELECT COUNT(*) FROM job_analysis WHERE user_id = ${user_id} AND created_at >= ${oneWeekAgo.toISOString()}) AS jobs_saved_this_week,
      (SELECT COUNT(*) FROM job_analysis WHERE user_id = ${user_id} AND created_at >= ${twoWeeksAgo.toISOString()} AND created_at < ${oneWeekAgo.toISOString()}) AS jobs_saved_last_week,
      (SELECT COUNT(*) FROM optimized_resumes WHERE user_id = ${user_id} AND created_at >= ${oneWeekAgo.toISOString()}) AS cvs_generated_this_week,
      (SELECT COUNT(*) FROM optimized_resumes WHERE user_id = ${user_id} AND created_at >= ${twoWeeksAgo.toISOString()} AND created_at < ${oneWeekAgo.toISOString()}) AS cvs_generated_last_week,
      (
        SELECT COALESCE(SUM(cardinality(COALESCE(keywords, '{}'::text[]))), 0)
        FROM job_analysis
        WHERE user_id = ${user_id} AND created_at >= ${oneWeekAgo.toISOString()}
      ) AS keywords_this_week,
      (
        SELECT COALESCE(SUM(cardinality(COALESCE(keywords, '{}'::text[]))), 0)
        FROM job_analysis
        WHERE user_id = ${user_id} AND created_at >= ${twoWeeksAgo.toISOString()} AND created_at < ${oneWeekAgo.toISOString()}
      ) AS keywords_last_week,
      (SELECT COALESCE(AVG(match_score), 0) FROM optimized_resumes WHERE user_id = ${user_id} AND created_at >= ${oneWeekAgo.toISOString()}) AS avg_match_this_week,
      (SELECT COALESCE(AVG(match_score), 0) FROM optimized_resumes WHERE user_id = ${user_id} AND created_at >= ${twoWeeksAgo.toISOString()} AND created_at < ${oneWeekAgo.toISOString()}) AS avg_match_last_week
  `

  const toNumber = (value: any) => Number(value) || 0

  const jobsSavedThisWeek = toNumber(trend?.jobs_saved_this_week)
  const jobsSavedLastWeek = toNumber(trend?.jobs_saved_last_week)
  const cvsGeneratedThisWeek = toNumber(trend?.cvs_generated_this_week)
  const cvsGeneratedLastWeek = toNumber(trend?.cvs_generated_last_week)
  const keywordsThisWeek = toNumber(trend?.keywords_this_week)
  const keywordsLastWeek = toNumber(trend?.keywords_last_week)
  const avgMatchThisWeek = toNumber(trend?.avg_match_this_week)
  const avgMatchLastWeek = toNumber(trend?.avg_match_last_week)

  return {
    jobsSavedChange: jobsSavedThisWeek - jobsSavedLastWeek,
    cvsGeneratedChange: cvsGeneratedThisWeek - cvsGeneratedLastWeek,
    keywordsExtractedChange: keywordsThisWeek - keywordsLastWeek,
    avgMatchChange: Math.round(avgMatchThisWeek - avgMatchLastWeek),
  }
}

export async function getJobsWithDetails(user_id: string) {
  const jobs = await sql`
    SELECT 
      ja.id,
      ja.job_title,
      ja.company_name,
      ja.created_at,
      ja.keywords,
      ja.required_skills,
      COALESCE(AVG(or_res.match_score), 0) as match_score,
      COUNT(or_res.id) as cv_count
    FROM job_analysis ja
    LEFT JOIN optimized_resumes or_res ON ja.id = or_res.job_analysis_id
    WHERE ja.user_id = ${user_id}
    GROUP BY ja.id, ja.job_title, ja.company_name, ja.created_at, ja.keywords, ja.required_skills
    ORDER BY ja.created_at DESC
  `
  
  return jobs.map(job => ({
    id: job.id,
    job_title: job.job_title,
    company_name: job.company_name,
    created_at: job.created_at,
    keywords: (job.keywords || []).slice(0, 4),
    match_score: Math.round(parseFloat(job.match_score || '0')),
    cv_count: parseInt(job.cv_count || '0'),
  }))
}

export async function getTopKeywords(user_id: string, limit: number = 10) {
  const results = await sql`
    SELECT unnested_keyword as keyword, COUNT(*) as frequency
    FROM job_analysis,
    LATERAL unnest(keywords) as unnested_keyword
    WHERE user_id = ${user_id}
    GROUP BY unnested_keyword
    ORDER BY frequency DESC
    LIMIT ${limit}
  `
  
  return results.map(r => ({
    keyword: r.keyword,
    frequency: parseInt(r.frequency || '0'),
  }))
}

export async function getJobActivity(user_id: string, limit: number = 5) {
  const activities = await sql`
    (
      SELECT
        ja.id,
        'job_added' as activity_type,
        ja.job_title,
        ja.company_name,
        ja.keywords,
        ja.created_at,
        NULL::numeric as match_score
      FROM job_analysis ja
      WHERE ja.user_id = ${user_id}
      ORDER BY ja.created_at DESC
      LIMIT ${limit}
    )
    UNION ALL
    (
      SELECT
        or_res.id,
        'cv_generated' as activity_type,
        ja.job_title,
        ja.company_name,
        ARRAY[]::text[] as keywords,
        or_res.created_at,
        or_res.match_score
      FROM optimized_resumes or_res
      JOIN job_analysis ja ON or_res.job_analysis_id = ja.id
      WHERE or_res.user_id = ${user_id}
      ORDER BY or_res.created_at DESC
      LIMIT ${limit}
    )
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return activities.map(a => ({
    id: a.id,
    activity_type: a.activity_type,
    job_title: a.job_title,
    company_name: a.company_name,
    keywords: a.keywords || [],
    created_at: a.created_at,
    match_score: a.match_score ? Math.round(parseFloat(a.match_score)) : null,
  }))
}

// Keywords gap analysis - compares resume keywords vs job requirements
export async function getKeywordGap(user_id: string) {
  // Get the most recent job analysis keywords
  const [latestJob] = await sql`
    SELECT keywords, required_skills
    FROM job_analysis
    WHERE user_id = ${user_id}
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (!latestJob) {
    return { missingCount: 0, missingKeywords: [] }
  }

  // Get user's most recent resume keywords (from optimized_resumes)
  const [latestResume] = await sql`
    SELECT improvements
    FROM optimized_resumes
    WHERE user_id = ${user_id}
    ORDER BY created_at DESC
    LIMIT 1
  `

  // Extract job keywords
  const jobKeywords = new Set([
    ...(latestJob.keywords || []),
    ...(latestJob.required_skills || [])
  ])

  // Extract resume keywords from improvements (if available)
  const resumeKeywords = new Set(
    latestResume?.improvements ?
    JSON.parse(latestResume.improvements).keywords || [] :
    []
  )

  // Find missing keywords
  const missingKeywords = Array.from(jobKeywords).filter(
    keyword => !resumeKeywords.has(keyword)
  ).slice(0, 5) // Top 5 missing keywords

  return {
    missingCount: missingKeywords.length,
    missingKeywords: missingKeywords
  }
}

// Get weekly trends for KPI cards
export async function getApplicationTrends(user_id: string) {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // This week's stats
  const [thisWeek] = await sql`
    SELECT
      COUNT(DISTINCT or_res.id) as applications,
      COUNT(DISTINCT or_res.id) as optimizations,
      COUNT(DISTINCT or_res.original_resume_id) as variants,
      COALESCE(AVG(or_res.match_score), 0) as avg_match
    FROM optimized_resumes or_res
    WHERE or_res.user_id = ${user_id}
      AND or_res.created_at >= ${oneWeekAgo.toISOString()}
  `

  // Last week's stats
  const [lastWeek] = await sql`
    SELECT
      COUNT(DISTINCT or_res.id) as applications,
      COUNT(DISTINCT or_res.id) as optimizations,
      COUNT(DISTINCT or_res.original_resume_id) as variants,
      COALESCE(AVG(or_res.match_score), 0) as avg_match
    FROM optimized_resumes or_res
    WHERE or_res.user_id = ${user_id}
      AND or_res.created_at >= ${twoWeeksAgo.toISOString()}
      AND or_res.created_at < ${oneWeekAgo.toISOString()}
  `

  const thisWeekData = {
    applications: parseInt(thisWeek?.applications || '0'),
    optimizations: parseInt(thisWeek?.optimizations || '0'),
    variants: parseInt(thisWeek?.variants || '0'),
    avgMatch: Math.round(parseFloat(thisWeek?.avg_match || '0'))
  }

  const lastWeekData = {
    applications: parseInt(lastWeek?.applications || '0'),
    optimizations: parseInt(lastWeek?.optimizations || '0'),
    variants: parseInt(lastWeek?.variants || '0'),
    avgMatch: Math.round(parseFloat(lastWeek?.avg_match || '0'))
  }

  return {
    applicationsChange: thisWeekData.applications - lastWeekData.applications,
    optimizationsChange: thisWeekData.optimizations - lastWeekData.optimizations,
    variantsChange: thisWeekData.variants - lastWeekData.variants,
    matchChange: thisWeekData.avgMatch - lastWeekData.avgMatch
  }
}

// Enhanced resume functions for Resumes page
export async function getResumeStats(user_id: string) {
  const [stats] = await sql`
    SELECT 
      COUNT(*) as resumes_saved,
      COALESCE(SUM(cardinality(COALESCE(improvements_made, '{}'::text[]))), 0) as edits_made,
      COALESCE(AVG(match_score), 0) as avg_score
    FROM optimized_resumes
    WHERE user_id = ${user_id}
  `

  let pdfExports = 0
  try {
    const [exportStats] = await sql`
      SELECT COUNT(*) as export_count
      FROM resume_exports
      WHERE user_id = ${user_id}
    `
    pdfExports = parseInt(exportStats?.export_count || '0')
  } catch (error: any) {
    if (error?.code !== '42P01') {
      throw error
    }
    pdfExports = 0
  }

  return {
    resumesSaved: parseInt(stats?.resumes_saved || '0'),
    pdfExports,
    editsMade: parseInt(stats?.edits_made || '0'),
    avgScore: Math.round(parseFloat(stats?.avg_score || '0')),
  }
}

export async function getResumesWithDetails(user_id: string) {
  const resumes = await sql`
    SELECT 
      or_res.id,
      or_res.title,
      or_res.created_at,
      or_res.match_score,
      ja.job_title,
      ja.company_name,
      r.title as original_resume_title
    FROM optimized_resumes or_res
    JOIN job_analysis ja ON or_res.job_analysis_id = ja.id
    JOIN resumes r ON or_res.original_resume_id = r.id
    WHERE or_res.user_id = ${user_id}
    ORDER BY or_res.created_at DESC
  `
  
  return resumes.map(resume => ({
    id: resume.id,
    title: resume.title,
    job_title: resume.job_title,
    company_name: resume.company_name || 'Unknown Company',
    created_at: resume.created_at,
    match_score: Math.round(parseFloat(resume.match_score || '0')),
    original_resume_title: resume.original_resume_title,
  }))
}

export async function getTopResumesRoles(user_id: string, limit: number = 3) {
  const roles = await sql`
    SELECT 
      ja.job_title,
      COUNT(*) as count
    FROM optimized_resumes or_res
    JOIN job_analysis ja ON or_res.job_analysis_id = ja.id
    WHERE or_res.user_id = ${user_id}
    GROUP BY ja.job_title
    ORDER BY count DESC
    LIMIT ${limit}
  `
  
  return roles.map(role => ({
    role: role.job_title,
    count: parseInt(role.count || '0'),
  }))
}

export async function getResumeActivity(user_id: string, limit: number = 5) {
  const activities = await sql`
    SELECT 
      or_res.id,
      'resume_generated' as activity_type,
      or_res.title,
      ja.job_title,
      ja.company_name,
      or_res.created_at,
      or_res.match_score
    FROM optimized_resumes or_res
    JOIN job_analysis ja ON or_res.job_analysis_id = ja.id
    WHERE or_res.user_id = ${user_id}
    ORDER BY or_res.created_at DESC
    LIMIT ${limit}
  `
  
  return activities.map(a => ({
    id: a.id,
    activity_type: a.activity_type,
    title: a.title,
    job_title: a.job_title,
    company_name: a.company_name,
    created_at: a.created_at,
    match_score: a.match_score ? Math.round(parseFloat(a.match_score)) : null,
  }))
}

export async function getResumeTrends(user_id: string) {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [optimizedStats] = await sql`
    SELECT
      (SELECT COUNT(*) FROM optimized_resumes WHERE user_id = ${user_id} AND created_at >= ${oneWeekAgo.toISOString()}) AS resumes_this_week,
      (SELECT COUNT(*) FROM optimized_resumes WHERE user_id = ${user_id} AND created_at >= ${twoWeeksAgo.toISOString()} AND created_at < ${oneWeekAgo.toISOString()}) AS resumes_last_week,
      (
        SELECT COALESCE(SUM(cardinality(COALESCE(improvements_made, '{}'::text[]))), 0)
        FROM optimized_resumes
        WHERE user_id = ${user_id} AND created_at >= ${oneWeekAgo.toISOString()}
      ) AS edits_this_week,
      (
        SELECT COALESCE(SUM(cardinality(COALESCE(improvements_made, '{}'::text[]))), 0)
        FROM optimized_resumes
        WHERE user_id = ${user_id} AND created_at >= ${twoWeeksAgo.toISOString()} AND created_at < ${oneWeekAgo.toISOString()}
      ) AS edits_last_week,
      (SELECT COALESCE(AVG(match_score), 0) FROM optimized_resumes WHERE user_id = ${user_id} AND created_at >= ${oneWeekAgo.toISOString()}) AS avg_score_this_week,
      (SELECT COALESCE(AVG(match_score), 0) FROM optimized_resumes WHERE user_id = ${user_id} AND created_at >= ${twoWeeksAgo.toISOString()} AND created_at < ${oneWeekAgo.toISOString()}) AS avg_score_last_week
  `

  let exportsThisWeek = 0
  let exportsLastWeek = 0
  try {
    const [exportStats] = await sql`
      SELECT
        (SELECT COUNT(*) FROM resume_exports WHERE user_id = ${user_id} AND created_at >= ${oneWeekAgo.toISOString()}) AS exports_this_week,
        (SELECT COUNT(*) FROM resume_exports WHERE user_id = ${user_id} AND created_at >= ${twoWeeksAgo.toISOString()} AND created_at < ${oneWeekAgo.toISOString()}) AS exports_last_week
    `
    exportsThisWeek = parseInt(exportStats?.exports_this_week || '0')
    exportsLastWeek = parseInt(exportStats?.exports_last_week || '0')
  } catch (error: any) {
    if (error?.code !== '42P01') {
      throw error
    }
  }

  const toNumber = (value: any) => Number(value) || 0

  const resumesThisWeek = toNumber(optimizedStats?.resumes_this_week)
  const resumesLastWeek = toNumber(optimizedStats?.resumes_last_week)
  const editsThisWeek = toNumber(optimizedStats?.edits_this_week)
  const editsLastWeek = toNumber(optimizedStats?.edits_last_week)
  const avgScoreThisWeek = toNumber(optimizedStats?.avg_score_this_week)
  const avgScoreLastWeek = toNumber(optimizedStats?.avg_score_last_week)

  return {
    resumesSavedChange: resumesThisWeek - resumesLastWeek,
    pdfExportsChange: exportsThisWeek - exportsLastWeek,
    editsMadeChange: editsThisWeek - editsLastWeek,
    avgScoreChange: Math.round(avgScoreThisWeek - avgScoreLastWeek),
  }
}

// Optimized resume functions
export async function createOptimizedResume(data: {
  user_id: string
  original_resume_id: string
  job_analysis_id: string
  title: string
  optimized_content: string
  optimization_summary: OptimizedResume["optimization_summary"]
  match_score?: number
}) {
  const insert = async () => {
    const [optimizedResume] = await sql`
      INSERT INTO optimized_resumes (
        user_id, original_resume_id, job_analysis_id, title, optimized_content,
        optimization_summary, match_score, improvements_made, keywords_added, 
        skills_highlighted, created_at, updated_at
      )
      VALUES (
        ${data.user_id}, ${data.original_resume_id}, ${data.job_analysis_id}, 
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
    SELECT opt_res.*, r.title as original_resume_title, ja.job_title, ja.company_name
    FROM optimized_resumes opt_res
    JOIN resumes r ON opt_res.original_resume_id = r.id
    JOIN job_analysis ja ON opt_res.job_analysis_id = ja.id
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
    SELECT opt_res.*, r.title as original_resume_title, ja.job_title, ja.company_name
    FROM optimized_resumes opt_res
    JOIN resumes r ON opt_res.original_resume_id = r.id
    JOIN job_analysis ja ON opt_res.job_analysis_id = ja.id
    WHERE opt_res.id = ${id} AND opt_res.user_id = ${user_id}
  `
  return optimizedResume as
    | (OptimizedResume & {
        original_resume_title: string
        job_title: string
        company_name?: string
      })
    | undefined
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

// Enhanced settings functions
export async function getOrCreateUserProfile(clerkUserId: string, userId: string) {
  let profile = await getUserProfile(clerkUserId)
  
  if (!profile) {
    // Create default profile
    profile = await createUserProfile({
      clerk_user_id: clerkUserId,
      user_id: userId,
      skills: [],
      preferences: {
        timezone: 'UTC',
        job_focus: 'Software Engineering',
        theme: 'dark',
        notifications: true
      }
    })
  }
  
  return profile
}

export async function updateUserBasicInfo(userId: string, data: { name?: string; email?: string }) {
  const updateFields = []
  const values = []
  
  if (data.name !== undefined) {
    updateFields.push('name = $' + (values.length + 2))
    values.push(data.name)
  }
  
  if (data.email !== undefined) {
    updateFields.push('email = $' + (values.length + 2))
    values.push(data.email)
  }
  
  if (updateFields.length === 0) {
    return await getUserById(userId)
  }
  
  const [user] = await sql`
    UPDATE users_sync
    SET name = COALESCE(${data.name}, name),
        email = COALESCE(${data.email}, email),
        updated_at = NOW()
    WHERE id = ${userId} AND deleted_at IS NULL
    RETURNING *
  `
  
  return user as User | undefined
}

export async function updateUserProfilePreferences(clerkUserId: string, preferences: Record<string, any>) {
  // Get existing profile
  const profile = await getUserProfile(clerkUserId)
  
  if (!profile) {
    return null
  }
  
  // Merge preferences
  const currentPrefs = profile.preferences || {}
  const mergedPrefs = { ...currentPrefs, ...preferences }
  
  const [updatedProfile] = await sql`
    UPDATE user_profiles
    SET preferences = ${JSON.stringify(mergedPrefs)},
        updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId}
    RETURNING *
  `
  
  return updatedProfile as UserProfile | undefined
}

export async function getUserSubscriptionUsage(userId: string) {
  // Get current billing period start (1st of current month)
  const periodStart = new Date()
  periodStart.setDate(1)
  periodStart.setHours(0, 0, 0, 0)
  
  const [stats] = await sql`
    SELECT 
      (SELECT COUNT(*) FROM job_analysis WHERE user_id = ${userId} AND created_at >= ${periodStart.toISOString()}) as jobs_saved,
      (SELECT COUNT(*) FROM optimized_resumes WHERE user_id = ${userId} AND created_at >= ${periodStart.toISOString()}) as cvs_generated,
      (
        (SELECT COUNT(*) FROM job_analysis WHERE user_id = ${userId} AND created_at >= ${periodStart.toISOString()}) * 100 +
        (SELECT COUNT(*) FROM optimized_resumes WHERE user_id = ${userId} AND created_at >= ${periodStart.toISOString()}) * 500
      ) as ai_credits
  `
  
  return {
    jobs_saved: parseInt(stats?.jobs_saved || '0'),
    cvs_generated: parseInt(stats?.cvs_generated || '0'),
    ai_credits: parseInt(stats?.ai_credits || '0'),
    period_start: periodStart.toISOString()
  }
}

// Subscription functions for billing integration
export async function updateUserSubscription(
  clerkUserId: string,
  data: {
    subscription_status?: string
    subscription_plan?: string
    subscription_period_end?: string | null
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
  },
) {
  // If no data to update, return current user
  if (Object.keys(data).length === 0) {
    const [current] = await sql`
      SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan,
             subscription_period_end, stripe_customer_id, stripe_subscription_id
      FROM users_sync
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
    `
    return current as User | undefined
  }

  // Use individual UPDATE statements so that explicit nulls are written as NULL
  let [user] = await sql`
    SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan,
           subscription_period_end, stripe_customer_id, stripe_subscription_id
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
                subscription_period_end, stripe_customer_id, stripe_subscription_id
    `
  }

  if (data.subscription_plan !== undefined) {
    ;[user] = await sql`
      UPDATE users_sync
      SET subscription_plan = ${data.subscription_plan}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan,
                subscription_period_end, stripe_customer_id, stripe_subscription_id
    `
  }

  if (data.subscription_period_end !== undefined) {
    ;[user] = await sql`
      UPDATE users_sync
      SET subscription_period_end = ${data.subscription_period_end}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan,
                subscription_period_end, stripe_customer_id, stripe_subscription_id
    `
  }

  if (data.stripe_customer_id !== undefined) {
    ;[user] = await sql`
      UPDATE users_sync
      SET stripe_customer_id = ${data.stripe_customer_id}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan,
                subscription_period_end, stripe_customer_id, stripe_subscription_id
    `
  }

  if (data.stripe_subscription_id !== undefined) {
    ;[user] = await sql`
      UPDATE users_sync
      SET stripe_subscription_id = ${data.stripe_subscription_id}, updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
      RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan,
                subscription_period_end, stripe_customer_id, stripe_subscription_id
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
        const existingUser = await getUserByClerkId(userId)
        if (existingUser) {
          console.log('Found existing user after race condition:', { id: existingUser.id })
          return existingUser
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

// ===========================
// Admin Functions
// ===========================

export interface AdminUserListItem {
  id: string
  email: string
  name: string
  clerk_user_id?: string
  subscription_status: string
  subscription_plan: string
  subscription_period_end?: string
  created_at: string
  updated_at: string
  resume_count: number
  job_analysis_count: number
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  freeUsers: number
  proUsers: number
  enterpriseUsers: number
  totalResumes: number
  totalJobAnalyses: number
  usersCreatedToday: number
  usersCreatedThisWeek: number
  usersCreatedThisMonth: number
}

export interface AdminAuditLog {
  id: string
  admin_user_id: string
  action: string
  target_user_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

/**
 * Get all users with pagination and optional search
 */
export async function getAllUsersAdmin(params: {
  page?: number
  limit?: number
  search?: string
  subscription_status?: string
  sortBy?: 'created_at' | 'name' | 'email'
  sortOrder?: 'asc' | 'desc'
}) {
  const {
    page = 1,
    limit = 50,
    search = '',
    subscription_status = '',
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = params

  const offset = (page - 1) * limit
  const searchPattern = `%${search}%`

  // Build the query dynamically based on filters
  let users: any[]
  let countResult: any[]

  if (search && subscription_status) {
    // Both search and subscription filter
    users = await sql`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.clerk_user_id,
        u.subscription_status,
        u.subscription_plan,
        u.subscription_period_end,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT r.id)::int as resume_count,
        COUNT(DISTINCT ja.id)::int as job_analysis_count
      FROM users_sync u
      LEFT JOIN resumes r ON r.user_id = u.id AND r.deleted_at IS NULL
      LEFT JOIN job_analysis ja ON ja.user_id = u.id
      WHERE u.deleted_at IS NULL 
        AND (u.email ILIKE ${searchPattern} OR u.name ILIKE ${searchPattern})
        AND u.subscription_status = ${subscription_status}
      GROUP BY u.id, u.email, u.name, u.clerk_user_id, u.subscription_status, u.subscription_plan, u.subscription_period_end, u.created_at, u.updated_at
      ORDER BY u.${sql.unsafe(sortBy)} ${sql.unsafe(sortOrder.toUpperCase())}
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM users_sync
      WHERE deleted_at IS NULL 
        AND (email ILIKE ${searchPattern} OR name ILIKE ${searchPattern})
        AND subscription_status = ${subscription_status}
    `
  } else if (search) {
    // Only search filter
    users = await sql`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.clerk_user_id,
        u.subscription_status,
        u.subscription_plan,
        u.subscription_period_end,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT r.id)::int as resume_count,
        COUNT(DISTINCT ja.id)::int as job_analysis_count
      FROM users_sync u
      LEFT JOIN resumes r ON r.user_id = u.id AND r.deleted_at IS NULL
      LEFT JOIN job_analysis ja ON ja.user_id = u.id
      WHERE u.deleted_at IS NULL 
        AND (u.email ILIKE ${searchPattern} OR u.name ILIKE ${searchPattern})
      GROUP BY u.id, u.email, u.name, u.clerk_user_id, u.subscription_status, u.subscription_plan, u.subscription_period_end, u.created_at, u.updated_at
      ORDER BY u.${sql.unsafe(sortBy)} ${sql.unsafe(sortOrder.toUpperCase())}
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM users_sync
      WHERE deleted_at IS NULL 
        AND (email ILIKE ${searchPattern} OR name ILIKE ${searchPattern})
    `
  } else if (subscription_status) {
    // Only subscription filter
    users = await sql`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.clerk_user_id,
        u.subscription_status,
        u.subscription_plan,
        u.subscription_period_end,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT r.id)::int as resume_count,
        COUNT(DISTINCT ja.id)::int as job_analysis_count
      FROM users_sync u
      LEFT JOIN resumes r ON r.user_id = u.id AND r.deleted_at IS NULL
      LEFT JOIN job_analysis ja ON ja.user_id = u.id
      WHERE u.deleted_at IS NULL 
        AND u.subscription_status = ${subscription_status}
      GROUP BY u.id, u.email, u.name, u.clerk_user_id, u.subscription_status, u.subscription_plan, u.subscription_period_end, u.created_at, u.updated_at
      ORDER BY u.${sql.unsafe(sortBy)} ${sql.unsafe(sortOrder.toUpperCase())}
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM users_sync
      WHERE deleted_at IS NULL 
        AND subscription_status = ${subscription_status}
    `
  } else {
    // No filters
    users = await sql`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.clerk_user_id,
        u.subscription_status,
        u.subscription_plan,
        u.subscription_period_end,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT r.id)::int as resume_count,
        COUNT(DISTINCT ja.id)::int as job_analysis_count
      FROM users_sync u
      LEFT JOIN resumes r ON r.user_id = u.id AND r.deleted_at IS NULL
      LEFT JOIN job_analysis ja ON ja.user_id = u.id
      WHERE u.deleted_at IS NULL
      GROUP BY u.id, u.email, u.name, u.clerk_user_id, u.subscription_status, u.subscription_plan, u.subscription_period_end, u.created_at, u.updated_at
      ORDER BY u.${sql.unsafe(sortBy)} ${sql.unsafe(sortOrder.toUpperCase())}
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM users_sync
      WHERE deleted_at IS NULL
    `
  }

  return {
    users: users as AdminUserListItem[],
    total: parseInt(countResult[0]?.total || '0'),
    page,
    limit,
    totalPages: Math.ceil(parseInt(countResult[0]?.total || '0') / limit)
  }
}

/**
 * Get detailed user information for admin
 */
export async function getUserDetailsAdmin(userId: string) {
  const [user] = await sql`
    SELECT 
      id,
      email,
      name,
      clerk_user_id,
      subscription_status,
      subscription_plan,
      subscription_period_end,
      stripe_customer_id,
      stripe_subscription_id,
      onboarding_completed_at,
      created_at,
      updated_at
    FROM users_sync
    WHERE id = ${userId} AND deleted_at IS NULL
  `

  if (!user) return null

  const resumes = await sql`
    SELECT id, title, file_name, kind, processing_status, created_at
    FROM resumes
    WHERE user_id = ${userId} AND deleted_at IS NULL
    ORDER BY created_at DESC
  `

  const jobAnalyses = await sql`
    SELECT id, job_title, company_name, created_at
    FROM job_analysis
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 10
  `

  const applications = await sql`
    SELECT id, job_title, company_name, status, applied_at
    FROM job_applications
    WHERE user_id = ${userId}
    ORDER BY applied_at DESC
    LIMIT 10
  `

  return {
    user,
    resumes,
    jobAnalyses,
    applications
  }
}

/**
 * Get platform statistics for admin dashboard
 */
export async function getAdminStats(): Promise<AdminStats> {
  const [stats] = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_users,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND onboarding_completed_at IS NOT NULL) as active_users,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND subscription_status = 'free') as free_users,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND subscription_status = 'active' AND subscription_plan = 'pro') as pro_users,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND subscription_status = 'active' AND subscription_plan = 'enterprise') as enterprise_users,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '1 day') as users_today,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days') as users_week,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '30 days') as users_month
    FROM users_sync
  `

  const [resumeStats] = await sql`
    SELECT COUNT(*) as total_resumes
    FROM resumes
    WHERE deleted_at IS NULL
  `

  const [jobStats] = await sql`
    SELECT COUNT(*) as total_job_analyses
    FROM job_analysis
  `

  return {
    totalUsers: parseInt(stats?.total_users || '0'),
    activeUsers: parseInt(stats?.active_users || '0'),
    freeUsers: parseInt(stats?.free_users || '0'),
    proUsers: parseInt(stats?.pro_users || '0'),
    enterpriseUsers: parseInt(stats?.enterprise_users || '0'),
    totalResumes: parseInt(resumeStats?.total_resumes || '0'),
    totalJobAnalyses: parseInt(jobStats?.total_job_analyses || '0'),
    usersCreatedToday: parseInt(stats?.users_today || '0'),
    usersCreatedThisWeek: parseInt(stats?.users_week || '0'),
    usersCreatedThisMonth: parseInt(stats?.users_month || '0')
  }
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(data: {
  admin_user_id: string
  action: string
  target_user_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
}) {
  try {
    await sql`
      INSERT INTO admin_audit_logs (
        admin_user_id,
        action,
        target_user_id,
        details,
        ip_address,
        user_agent,
        created_at
      )
      VALUES (
        ${data.admin_user_id},
        ${data.action},
        ${data.target_user_id || null},
        ${data.details ? JSON.stringify(data.details) : null},
        ${data.ip_address || null},
        ${data.user_agent || null},
        NOW()
      )
    `
  } catch (error) {
    console.error('[ADMIN_AUDIT] Failed to log admin action:', error)
  }
}

/**
 * Get admin audit logs with pagination
 */
export async function getAdminAuditLogs(params: {
  page?: number
  limit?: number
  admin_user_id?: string
  target_user_id?: string
  action?: string
}) {
  const {
    page = 1,
    limit = 50,
    admin_user_id = '',
    target_user_id = '',
    action = ''
  } = params

  const offset = (page - 1) * limit

  // Build query based on filters
  let logs: any[]
  let countResult: any[]

  const hasAdminFilter = !!admin_user_id
  const hasTargetFilter = !!target_user_id
  const hasActionFilter = !!action

  if (hasAdminFilter && hasTargetFilter && hasActionFilter) {
    logs = await sql`
      SELECT id, admin_user_id, action, target_user_id, details, ip_address, user_agent, created_at
      FROM admin_audit_logs
      WHERE admin_user_id = ${admin_user_id}
        AND target_user_id = ${target_user_id}
        AND action = ${action}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_audit_logs
      WHERE admin_user_id = ${admin_user_id}
        AND target_user_id = ${target_user_id}
        AND action = ${action}
    `
  } else if (hasAdminFilter && hasTargetFilter) {
    logs = await sql`
      SELECT id, admin_user_id, action, target_user_id, details, ip_address, user_agent, created_at
      FROM admin_audit_logs
      WHERE admin_user_id = ${admin_user_id}
        AND target_user_id = ${target_user_id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_audit_logs
      WHERE admin_user_id = ${admin_user_id}
        AND target_user_id = ${target_user_id}
    `
  } else if (hasAdminFilter && hasActionFilter) {
    logs = await sql`
      SELECT id, admin_user_id, action, target_user_id, details, ip_address, user_agent, created_at
      FROM admin_audit_logs
      WHERE admin_user_id = ${admin_user_id}
        AND action = ${action}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_audit_logs
      WHERE admin_user_id = ${admin_user_id}
        AND action = ${action}
    `
  } else if (hasTargetFilter && hasActionFilter) {
    logs = await sql`
      SELECT id, admin_user_id, action, target_user_id, details, ip_address, user_agent, created_at
      FROM admin_audit_logs
      WHERE target_user_id = ${target_user_id}
        AND action = ${action}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_audit_logs
      WHERE target_user_id = ${target_user_id}
        AND action = ${action}
    `
  } else if (hasAdminFilter) {
    logs = await sql`
      SELECT id, admin_user_id, action, target_user_id, details, ip_address, user_agent, created_at
      FROM admin_audit_logs
      WHERE admin_user_id = ${admin_user_id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_audit_logs
      WHERE admin_user_id = ${admin_user_id}
    `
  } else if (hasTargetFilter) {
    logs = await sql`
      SELECT id, admin_user_id, action, target_user_id, details, ip_address, user_agent, created_at
      FROM admin_audit_logs
      WHERE target_user_id = ${target_user_id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_audit_logs
      WHERE target_user_id = ${target_user_id}
    `
  } else if (hasActionFilter) {
    logs = await sql`
      SELECT id, admin_user_id, action, target_user_id, details, ip_address, user_agent, created_at
      FROM admin_audit_logs
      WHERE action = ${action}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_audit_logs
      WHERE action = ${action}
    `
  } else {
    logs = await sql`
      SELECT id, admin_user_id, action, target_user_id, details, ip_address, user_agent, created_at
      FROM admin_audit_logs
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_audit_logs
    `
  }

  return {
    logs: logs as AdminAuditLog[],
    total: parseInt(countResult[0]?.total || '0'),
    page,
    limit,
    totalPages: Math.ceil(parseInt(countResult[0]?.total || '0') / limit)
  }
}

/**
 * Update user subscription status (admin only)
 */
export async function updateUserSubscriptionAdmin(userId: string, data: {
  subscription_status: string
  subscription_plan?: string
  subscription_period_end?: string | null
}) {
  const [user] = await sql`
    UPDATE users_sync
    SET 
      subscription_status = ${data.subscription_status},
      subscription_plan = COALESCE(${data.subscription_plan}, subscription_plan),
      subscription_period_end = ${data.subscription_period_end || null},
      updated_at = NOW()
    WHERE id = ${userId} AND deleted_at IS NULL
    RETURNING id, email, name, subscription_status, subscription_plan, subscription_period_end
  `

  return user as User | undefined
}
