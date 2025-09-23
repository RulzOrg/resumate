import { neon } from "@neondatabase/serverless"
import { auth, currentUser } from "@clerk/nextjs/server"

const sql = neon(process.env.DATABASE_URL!)

export { sql }

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
  is_primary: boolean
  created_at: string
  updated_at: string
}

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

// User functions
export async function createUserFromClerk(clerkUserId: string, email: string, name: string) {
  const [user] = await sql`
    INSERT INTO users_sync (id, clerk_user_id, email, name, subscription_status, subscription_plan, created_at, updated_at)
    VALUES (${generateUUID()}, ${clerkUserId}, ${email}, ${name}, 'free', 'free', NOW(), NOW())
    RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan, created_at, updated_at
  `
  return user as User
}

export async function getUserByClerkId(clerkUserId: string) {
  const [user] = await sql`
    SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan, 
           subscription_period_end, stripe_customer_id, stripe_subscription_id, created_at, updated_at
    FROM users_sync
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
  `
  return user as User | undefined
}

export async function getUserById(id: string) {
  const [user] = await sql`
    SELECT id, clerk_user_id, email, name, subscription_status, subscription_plan, 
           subscription_period_end, stripe_customer_id, stripe_subscription_id, created_at, updated_at
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
    RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan, created_at, updated_at
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

// Resume functions
export async function createResume(data: {
  user_id: string
  title: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  content_text?: string
  is_primary?: boolean
}) {
  const [resume] = await sql`
    INSERT INTO resumes (user_id, title, file_name, file_url, file_type, file_size, content_text, is_primary, created_at, updated_at)
    VALUES (${data.user_id}, ${data.title}, ${data.file_name}, ${data.file_url}, ${data.file_type}, ${data.file_size}, ${data.content_text || null}, ${data.is_primary || false}, NOW(), NOW())
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
    INSERT INTO resumes (user_id, title, file_name, file_url, file_type, file_size, content_text, is_primary, created_at, updated_at)
    VALUES (${user_id}, ${title}, 'duplicated.txt', '', 'text/plain', ${content.length}, ${content}, false, NOW(), NOW())
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

// Job analysis functions
export async function createJobAnalysis(data: {
  user_id: string
  job_title: string
  company_name?: string
  job_url?: string
  job_description: string
  analysis_result: JobAnalysis["analysis_result"]
}) {
  const [analysis] = await sql`
    INSERT INTO job_analysis (
      user_id, job_title, company_name, job_url, job_description, 
      analysis_result, keywords, required_skills, preferred_skills,
      experience_level, salary_range, location, created_at, updated_at
    )
    VALUES (
      ${data.user_id}, ${data.job_title}, ${data.company_name || null}, 
      ${data.job_url || null}, ${data.job_description}, ${JSON.stringify(data.analysis_result)},
      ${data.analysis_result.keywords}, ${data.analysis_result.required_skills}, 
      ${data.analysis_result.preferred_skills}, ${data.analysis_result.experience_level || null},
      ${data.analysis_result.salary_range || null}, ${data.analysis_result.location || null},
      NOW(), NOW()
    )
    RETURNING *
  `
  return analysis as JobAnalysis
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

// Subscription functions for billing integration
export async function updateUserSubscription(
  clerkUserId: string,
  data: {
    subscription_status?: string
    subscription_plan?: string
    subscription_period_end?: string
    stripe_customer_id?: string
    stripe_subscription_id?: string
  },
) {
  const [user] = await sql`
    UPDATE users_sync 
    SET subscription_status = COALESCE(${data.subscription_status}, subscription_status),
        subscription_plan = COALESCE(${data.subscription_plan}, subscription_plan),
        subscription_period_end = COALESCE(${data.subscription_period_end}, subscription_period_end),
        stripe_customer_id = COALESCE(${data.stripe_customer_id}, stripe_customer_id),
        stripe_subscription_id = COALESCE(${data.stripe_subscription_id}, stripe_subscription_id),
        updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
    RETURNING id, clerk_user_id, email, name, subscription_status, subscription_plan, 
             subscription_period_end, stripe_customer_id, stripe_subscription_id
  `
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

// Utility functions
export async function getOrCreateUser() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const user = await currentUser()
  let dbUser = await getUserByClerkId(userId)

  if (!dbUser && user) {
    dbUser = await createUserFromClerk(
      userId,
      user.emailAddresses[0]?.emailAddress || "",
      user.fullName || user.firstName || "User",
    )
  }

  return dbUser
}
