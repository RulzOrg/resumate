/**
 * Supabase Database Validation Script
 *
 * Tests all critical database operations against Supabase PostgreSQL
 * Run with: USE_SUPABASE_DB=true npx tsx scripts/validate-supabase-db.ts
 *
 * This script validates:
 * 1. Database connection
 * 2. Schema exists (all tables)
 * 3. CRUD operations work
 * 4. Foreign key constraints
 * 5. JSON/JSONB operations
 * 6. Array operations
 */

// Force Supabase mode for testing
process.env.USE_SUPABASE_DB = "true"

import { createSupabaseSQL, checkSupabaseConnection } from "../lib/supabase-db"

const sql = createSupabaseSQL()

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

const results: TestResult[] = []

function log(
  message: string,
  type: "info" | "success" | "error" | "warn" = "info"
) {
  const prefix = {
    info: "ℹ️ ",
    success: "✅",
    error: "❌",
    warn: "⚠️ ",
  }[type]
  console.log(`${prefix} ${message}`)
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const start = Date.now()
  try {
    await testFn()
    results.push({ name, passed: true, duration: Date.now() - start })
    log(`${name}`, "success")
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    results.push({
      name,
      passed: false,
      error: errorMsg,
      duration: Date.now() - start,
    })
    log(`${name}: ${errorMsg}`, "error")
  }
}

// Test functions
async function testConnection() {
  const result = await checkSupabaseConnection()
  if (!result.connected) {
    throw new Error(result.error || "Connection failed")
  }
  log(`  Latency: ${result.latency}ms`)
}

async function testSchemaExists() {
  const tables = [
    "users_sync",
    "resumes",
    "resume_versions",
    "job_analysis",
    "job_applications",
    "optimized_resumes",
    "user_profiles",
    "usage_tracking",
  ]

  for (const table of tables) {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${table}
      ) as exists
    `
    if (!result[0]?.exists) {
      throw new Error(`Table ${table} does not exist`)
    }
  }
}

async function testBasicQuery() {
  const result = await sql`SELECT 1 + 1 as sum, NOW() as current_time`
  if (result[0]?.sum !== 2) {
    throw new Error("Basic arithmetic query failed")
  }
}

async function testUsersCRUD() {
  const testId = `test-${Date.now()}`
  const testEmail = `test-${Date.now()}@test.com`

  // Create
  const [created] = await sql`
    INSERT INTO users_sync (id, email, name, subscription_status, subscription_plan, created_at, updated_at)
    VALUES (${testId}, ${testEmail}, 'Test User', 'free', 'free', NOW(), NOW())
    RETURNING *
  `
  if (!created?.id) {
    throw new Error("User creation failed")
  }

  // Read
  const [read] = await sql`
    SELECT * FROM users_sync WHERE id = ${testId}
  `
  if (read?.email !== testEmail) {
    throw new Error("User read failed")
  }

  // Update
  const [updated] = await sql`
    UPDATE users_sync SET name = 'Updated Test User', updated_at = NOW()
    WHERE id = ${testId}
    RETURNING *
  `
  if (updated?.name !== "Updated Test User") {
    throw new Error("User update failed")
  }

  // Delete (cleanup)
  await sql`DELETE FROM users_sync WHERE id = ${testId}`

  // Verify deletion
  const [deleted] = await sql`
    SELECT * FROM users_sync WHERE id = ${testId}
  `
  if (deleted) {
    throw new Error("User deletion failed")
  }
}

async function testJSONOperations() {
  const testId = `test-json-${Date.now()}`
  const testEmail = `test-json-${Date.now()}@test.com`

  // Create user first (for FK)
  await sql`
    INSERT INTO users_sync (id, email, name, subscription_status, subscription_plan, created_at, updated_at)
    VALUES (${testId}, ${testEmail}, 'JSON Test User', 'free', 'free', NOW(), NOW())
  `

  // Create resume with JSON parsed_sections
  const jsonData = { contact: { email: "test@test.com" }, skills: ["JavaScript", "TypeScript"] }
  const [resume] = await sql`
    INSERT INTO resumes (user_id, title, file_name, file_url, file_type, file_size, parsed_sections, created_at, updated_at)
    VALUES (${testId}, 'Test Resume', 'test.pdf', 'http://test.com/test.pdf', 'application/pdf', 1000, ${JSON.stringify(jsonData)}, NOW(), NOW())
    RETURNING *
  `

  if (!resume?.parsed_sections) {
    throw new Error("JSON insertion failed")
  }

  // Query JSON
  const [queried] = await sql`
    SELECT parsed_sections->'skills' as skills FROM resumes WHERE id = ${resume.id}
  `

  if (!queried?.skills) {
    throw new Error("JSON query failed")
  }

  // Cleanup
  await sql`DELETE FROM resumes WHERE id = ${resume.id}`
  await sql`DELETE FROM users_sync WHERE id = ${testId}`
}

async function testArrayOperations() {
  const testId = `test-arr-${Date.now()}`
  const testEmail = `test-arr-${Date.now()}@test.com`

  // Create user first
  await sql`
    INSERT INTO users_sync (id, email, name, subscription_status, subscription_plan, created_at, updated_at)
    VALUES (${testId}, ${testEmail}, 'Array Test User', 'free', 'free', NOW(), NOW())
  `

  // Create job analysis with array fields
  const keywords = ["JavaScript", "React", "Node.js"]
  const [analysis] = await sql`
    INSERT INTO job_analysis (user_id, job_title, company_name, job_description, keywords, required_skills, preferred_skills, created_at, updated_at)
    VALUES (${testId}, 'Software Engineer', 'Test Corp', 'Test description', ${keywords}, ${keywords}, ${[]}, NOW(), NOW())
    RETURNING *
  `

  if (!Array.isArray(analysis?.keywords)) {
    throw new Error("Array insertion failed")
  }

  // Query with array contains
  const [queried] = await sql`
    SELECT * FROM job_analysis 
    WHERE id = ${analysis.id} AND 'JavaScript' = ANY(keywords)
  `

  if (!queried) {
    throw new Error("Array query failed")
  }

  // Cleanup
  await sql`DELETE FROM job_analysis WHERE id = ${analysis.id}`
  await sql`DELETE FROM users_sync WHERE id = ${testId}`
}

async function testForeignKeyConstraints() {
  // Try to insert a resume with non-existent user_id
  const fakeUserId = "non-existent-user-id"

  try {
    await sql`
      INSERT INTO resumes (user_id, title, file_name, file_url, file_type, file_size, created_at, updated_at)
      VALUES (${fakeUserId}, 'Test', 'test.pdf', 'http://test.com', 'application/pdf', 100, NOW(), NOW())
    `
    throw new Error("FK constraint should have prevented insert")
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    // 23503 is PostgreSQL error code for foreign key violation
    if (err.code !== "23503") {
      throw new Error(`Expected FK violation error, got: ${err.message}`)
    }
    // FK constraint working correctly
  }
}

async function testUniqueConstraints() {
  const testId = `test-uniq-${Date.now()}`
  const testEmail = `test-uniq-${Date.now()}@test.com`

  // Create user
  await sql`
    INSERT INTO users_sync (id, email, name, subscription_status, subscription_plan, created_at, updated_at)
    VALUES (${testId}, ${testEmail}, 'Unique Test User', 'free', 'free', NOW(), NOW())
  `

  // Try to create duplicate email
  try {
    await sql`
      INSERT INTO users_sync (id, email, name, subscription_status, subscription_plan, created_at, updated_at)
      VALUES (${`${testId}-2`}, ${testEmail}, 'Duplicate User', 'free', 'free', NOW(), NOW())
    `
    throw new Error("Unique constraint should have prevented insert")
  } catch (error: unknown) {
    const err = error as { code?: string }
    // 23505 is PostgreSQL error code for unique violation
    if (err.code !== "23505") {
      throw error
    }
    // Unique constraint working correctly
  }

  // Cleanup
  await sql`DELETE FROM users_sync WHERE id = ${testId}`
}

async function testOnConflictUpsert() {
  const testId = `test-upsert-${Date.now()}`
  const testEmail = `test-upsert-${Date.now()}@test.com`

  // Initial insert
  await sql`
    INSERT INTO users_sync (id, email, name, subscription_status, subscription_plan, created_at, updated_at)
    VALUES (${testId}, ${testEmail}, 'Upsert Test User', 'free', 'free', NOW(), NOW())
  `

  // Upsert with ON CONFLICT
  const [upserted] = await sql`
    INSERT INTO users_sync (id, email, name, subscription_status, subscription_plan, created_at, updated_at)
    VALUES (${testId}, ${testEmail}, 'Updated Name', 'pro', 'pro', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      subscription_status = EXCLUDED.subscription_status,
      subscription_plan = EXCLUDED.subscription_plan,
      updated_at = NOW()
    RETURNING *
  `

  if (upserted?.name !== "Updated Name" || upserted?.subscription_status !== "pro") {
    throw new Error("Upsert failed to update record")
  }

  // Cleanup
  await sql`DELETE FROM users_sync WHERE id = ${testId}`
}

async function testNullHandling() {
  const testId = `test-null-${Date.now()}`
  const testEmail = `test-null-${Date.now()}@test.com`

  // Create user with null optional fields
  const [user] = await sql`
    INSERT INTO users_sync (id, email, name, clerk_user_id, stripe_customer_id, subscription_status, subscription_plan, created_at, updated_at)
    VALUES (${testId}, ${testEmail}, 'Null Test User', ${null}, ${null}, 'free', 'free', NOW(), NOW())
    RETURNING *
  `

  if (user?.clerk_user_id !== null) {
    throw new Error("Null insertion failed")
  }

  // Query null values
  const [queried] = await sql`
    SELECT * FROM users_sync WHERE id = ${testId} AND clerk_user_id IS NULL
  `

  if (!queried) {
    throw new Error("Null query failed")
  }

  // Cleanup
  await sql`DELETE FROM users_sync WHERE id = ${testId}`
}

// Main execution
async function main() {
  log("🔍 Supabase Database Validation", "info")
  log("═".repeat(60))
  log(`Database URL: ${process.env.SUPABASE_DATABASE_URL ? "SUPABASE_DATABASE_URL" : "DATABASE_URL"}`)
  log("")

  // Run all tests
  await runTest("1. Connection Test", testConnection)
  await runTest("2. Schema Exists", testSchemaExists)
  await runTest("3. Basic Query", testBasicQuery)
  await runTest("4. Users CRUD", testUsersCRUD)
  await runTest("5. JSON Operations", testJSONOperations)
  await runTest("6. Array Operations", testArrayOperations)
  await runTest("7. Foreign Key Constraints", testForeignKeyConstraints)
  await runTest("8. Unique Constraints", testUniqueConstraints)
  await runTest("9. ON CONFLICT Upsert", testOnConflictUpsert)
  await runTest("10. Null Handling", testNullHandling)

  // Print summary
  log("\n" + "═".repeat(60))
  log("📊 Validation Summary", "info")
  log("═".repeat(60))

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  log(`Total Tests: ${results.length}`)
  log(`Passed: ${passed}`, passed === results.length ? "success" : "info")
  log(`Failed: ${failed}`, failed > 0 ? "error" : "info")
  log(`Total Duration: ${totalDuration}ms`)

  if (failed > 0) {
    log("\nFailed Tests:", "error")
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        log(`  - ${r.name}: ${r.error}`, "error")
      })
  }

  log("\n" + "═".repeat(60))
  if (failed === 0) {
    log("✅ All validations passed! Safe to enable USE_SUPABASE_DB=true", "success")
  } else {
    log("❌ Some validations failed. Review errors before enabling Supabase.", "error")
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`, "error")
  process.exit(1)
})


