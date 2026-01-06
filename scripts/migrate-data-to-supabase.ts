/**
 * DEPRECATED: Data Migration Script (Neon → Supabase)
 *
 * This script was used to migrate data from Neon PostgreSQL to Supabase.
 * The migration has been completed.
 * 
 * Kept for reference/historical purposes only.
 *
 * Original Requirements:
 * - DATABASE_URL: Neon connection string (source)
 * - SUPABASE_DATABASE_URL: Supabase connection string (target)
 *
 * Options:
 * --dry-run: Validate connections and show what would be migrated
 * --table=<name>: Migrate only a specific table
 * --verify: Run post-migration verification
 */

import postgres from "postgres"

// Configuration - order matters for foreign key constraints
const TABLES_TO_MIGRATE = [
  "users_sync",        // Must be first (parent table)
  "resumes",
  "resume_versions",
  "job_analysis",
  "job_applications",
  "job_targets",
  "optimized_resumes",
  "user_profiles",
  "usage_tracking",
  "clerk_webhook_events",
  "lead_magnet_submissions",
] as const

type TableName = (typeof TABLES_TO_MIGRATE)[number]

interface MigrationResult {
  table: string
  sourceCount: number
  targetCount: number
  migratedCount: number
  errors: string[]
  duration: number
}

interface MigrationSummary {
  startTime: Date
  endTime?: Date
  tables: MigrationResult[]
  totalSourceRecords: number
  totalMigratedRecords: number
  success: boolean
  errors: string[]
}

// Parse CLI arguments
const args = process.argv.slice(2)
const isDryRun = args.includes("--dry-run")
const verifyOnly = args.includes("--verify")
const specificTable = args.find((a) => a.startsWith("--table="))?.split("=")[1]

// Clean URL - remove surrounding quotes, backslashes
function cleanDbUrl(url: string): string {
  let cleaned = url
  
  // Remove all quotes and whitespace/backslashes repeatedly until clean
  let prev = ''
  while (prev !== cleaned) {
    prev = cleaned
    cleaned = cleaned.trim()
    cleaned = cleaned.replace(/^['"\s\\]+/, '')  // Remove from start
    cleaned = cleaned.replace(/['"\s\\]+$/, '')  // Remove from end
  }
  
  return cleaned
}

// Database connections using postgres package for both
function getNeonClient() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL (Neon) is not configured")
  }
  return postgres(cleanDbUrl(databaseUrl), {
    ssl: "require",
    max: 5,
    prepare: false, // Required for Neon pooler
  })
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL
  if (!supabaseUrl) {
    throw new Error(
      "SUPABASE_DATABASE_URL is not configured. Set it to the Supabase PostgreSQL connection string."
    )
  }
  return postgres(cleanDbUrl(supabaseUrl), {
    ssl: "require",
    max: 5,
    prepare: false, // Required for Supabase pooler
  })
}

// Utility functions
function log(message: string, type: "info" | "success" | "error" | "warn" = "info") {
  const prefix = {
    info: "ℹ️ ",
    success: "✅",
    error: "❌",
    warn: "⚠️ ",
  }[type]
  console.log(`${prefix} ${message}`)
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60000).toFixed(2)}m`
}

// Get table column info
async function getTableColumns(
  client: ReturnType<typeof postgres>,
  table: string
): Promise<string[]> {
  const result = await client`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = ${table}
      AND table_schema = 'public'
    ORDER BY ordinal_position
  `
  return result.map((r) => r.column_name as string)
}

// Check if table exists
async function tableExists(
  client: ReturnType<typeof postgres>,
  table: string
): Promise<boolean> {
  const result = await client`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${table}
    ) as exists
  `
  return result[0]?.exists === true
}

// Migration function for a single table
async function migrateTable(
  sourceClient: ReturnType<typeof postgres>,
  targetClient: ReturnType<typeof postgres>,
  table: TableName
): Promise<MigrationResult> {
  const startTime = Date.now()
  const result: MigrationResult = {
    table,
    sourceCount: 0,
    targetCount: 0,
    migratedCount: 0,
    errors: [],
    duration: 0,
  }

  try {
    log(`Migrating table: ${table}`)

    // Check if source table exists
    const sourceExists = await tableExists(sourceClient, table)
    if (!sourceExists) {
      log(`  Source table does not exist, skipping`, "warn")
      result.duration = Date.now() - startTime
      return result
    }

    // Check if target table exists
    const targetExists = await tableExists(targetClient, table)
    if (!targetExists) {
      log(`  Target table does not exist, skipping`, "warn")
      result.duration = Date.now() - startTime
      return result
    }

    // Get source count
    const sourceCountResult = await sourceClient.unsafe(
      `SELECT COUNT(*) as count FROM "${table}"`
    )
    result.sourceCount = Number(sourceCountResult[0]?.count || 0)
    log(`  Source records: ${result.sourceCount}`)

    if (result.sourceCount === 0) {
      log(`  No records to migrate`, "warn")
      result.duration = Date.now() - startTime
      return result
    }

    if (isDryRun) {
      log(`  [DRY RUN] Would migrate ${result.sourceCount} records`, "info")
      result.duration = Date.now() - startTime
      return result
    }

    // Get column info for the target table
    const targetColumns = await getTableColumns(targetClient, table)

    // Get all records from source
    const records = await sourceClient.unsafe(`SELECT * FROM "${table}"`)

    // Batch insert into target using postgres.js native insert
    const BATCH_SIZE = 50
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)

      for (const record of batch) {
        try {
          // Filter record to only include columns that exist in target
          const filteredRecord: Record<string, unknown> = {}
          for (const col of targetColumns) {
            if (col in record) {
              let val = record[col]
              // Handle JSON objects (but not arrays - postgres.js handles those)
              if (val !== null && typeof val === "object" && !(val instanceof Date) && !Array.isArray(val)) {
                val = JSON.stringify(val)
              }
              filteredRecord[col] = val
            }
          }

          if (Object.keys(filteredRecord).length === 0) continue

          // Use postgres.js native insert with ON CONFLICT
          await targetClient`
            INSERT INTO ${targetClient(table)} ${targetClient(filteredRecord)}
            ON CONFLICT (id) DO UPDATE SET ${targetClient(
              Object.fromEntries(
                Object.entries(filteredRecord)
                  .filter(([key]) => key !== "id")
              )
            )}
          `
          result.migratedCount++
        } catch (recordError: unknown) {
          const errorMsg = recordError instanceof Error ? recordError.message : String(recordError)
          // Log individual record errors but continue with others
          if (!result.errors.some(e => e.includes(errorMsg.substring(0, 50)))) {
            result.errors.push(`Record error: ${errorMsg}`)
            log(`  Error: ${errorMsg.substring(0, 100)}`, "error")
          }
        }
      }

      if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= records.length) {
        log(`  Progress: ${Math.min(i + BATCH_SIZE, records.length)}/${records.length}`)
      }
    }

    // Verify target count
    const targetCountResult = await targetClient.unsafe(
      `SELECT COUNT(*) as count FROM "${table}"`
    )
    result.targetCount = Number(targetCountResult[0]?.count || 0)

    log(`  Migrated: ${result.migratedCount} records`, "success")
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    result.errors.push(errorMsg)
    log(`  Migration failed: ${errorMsg}`, "error")
  }

  result.duration = Date.now() - startTime
  return result
}

// Verification function
async function verifyMigration(
  sourceClient: ReturnType<typeof postgres>,
  targetClient: ReturnType<typeof postgres>,
  tables: readonly string[]
): Promise<void> {
  log("\n📊 Verification Report:", "info")
  log("─".repeat(60))

  for (const table of tables) {
    try {
      const [sourceResult, targetResult] = await Promise.all([
        sourceClient.unsafe(`SELECT COUNT(*) as count FROM "${table}"`),
        targetClient.unsafe(`SELECT COUNT(*) as count FROM "${table}"`),
      ])

      const sourceCount = Number(sourceResult[0]?.count || 0)
      const targetCount = Number(targetResult[0]?.count || 0)
      const match = sourceCount === targetCount

      log(
        `${table}: Source=${sourceCount}, Target=${targetCount} ${match ? "✓" : "✗"}`,
        match ? "success" : "error"
      )
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      log(`${table}: Error - ${errorMsg}`, "error")
    }
  }
}

// Main execution
async function main() {
  log("🚀 Neon → Supabase Data Migration", "info")
  log("─".repeat(60))

  if (isDryRun) {
    log("Running in DRY RUN mode - no data will be modified", "warn")
  }

  const summary: MigrationSummary = {
    startTime: new Date(),
    tables: [],
    totalSourceRecords: 0,
    totalMigratedRecords: 0,
    success: true,
    errors: [],
  }

  let sourceClient: ReturnType<typeof postgres> | undefined
  let targetClient: ReturnType<typeof postgres> | undefined

  try {
    // Initialize connections
    log("\n1. Connecting to databases...", "info")
    sourceClient = getNeonClient()
    targetClient = getSupabaseClient()

    // Test connections
    await sourceClient`SELECT 1 as test`
    log("  Neon connection: OK", "success")

    await targetClient`SELECT 1 as test`
    log("  Supabase connection: OK", "success")

    // Determine tables to migrate
    const tablesToMigrate = specificTable
      ? ([specificTable] as TableName[])
      : TABLES_TO_MIGRATE

    if (verifyOnly) {
      await verifyMigration(sourceClient, targetClient, tablesToMigrate)
      await sourceClient.end()
      await targetClient.end()
      return
    }

    // Migrate tables
    log("\n2. Migrating tables...", "info")
    log("─".repeat(60))

    for (const table of tablesToMigrate) {
      const result = await migrateTable(sourceClient, targetClient, table)
      summary.tables.push(result)
      summary.totalSourceRecords += result.sourceCount
      summary.totalMigratedRecords += result.migratedCount

      if (result.errors.length > 0) {
        summary.errors.push(...result.errors.map((e) => `${table}: ${e}`))
      }
    }

    // Verify migration
    log("\n3. Verifying migration...", "info")
    await verifyMigration(sourceClient, targetClient, tablesToMigrate)

    summary.success = summary.errors.length === 0
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    summary.success = false
    summary.errors.push(errorMsg)
    log(`\nFatal error: ${errorMsg}`, "error")
  } finally {
    // Close connections
    if (sourceClient) await sourceClient.end()
    if (targetClient) await targetClient.end()
  }

  summary.endTime = new Date()

  // Print summary
  log("\n" + "═".repeat(60))
  log("📋 Migration Summary", "info")
  log("═".repeat(60))
  log(`Started: ${summary.startTime.toISOString()}`)
  log(`Ended: ${summary.endTime?.toISOString()}`)
  log(`Duration: ${formatDuration(summary.endTime!.getTime() - summary.startTime.getTime())}`)
  log(`Total source records: ${summary.totalSourceRecords}`)
  log(`Total migrated records: ${summary.totalMigratedRecords}`)
  log(`Status: ${summary.success ? "SUCCESS ✅" : "FAILED ❌"}`)

  if (summary.errors.length > 0) {
    log("\nErrors:", "error")
    summary.errors.forEach((e) => log(`  - ${e}`, "error"))
  }

  // Table details
  log("\nTable Details:")
  for (const table of summary.tables) {
    const status =
      table.errors.length === 0
        ? "✅"
        : table.migratedCount > 0
          ? "⚠️"
          : "❌"
    log(`  ${status} ${table.table}: ${table.migratedCount}/${table.sourceCount} (${formatDuration(table.duration)})`)
  }

  process.exit(summary.success ? 0 : 1)
}

main().catch((error) => {
  console.error("Unhandled error:", error)
  process.exit(1)
})
