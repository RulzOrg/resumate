/**
 * Migration script to add LlamaParse fields to resumes table
 * Run with: npm run migrate:llamaparse
 */

import { readFileSync } from "fs"
import { join } from "path"

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set")
    process.exit(1)
  }

  console.log("🔄 Starting LlamaParse fields migration...")
  console.log(`📊 Database: ${databaseUrl.split("@")[1]?.split("?")[0] || "hidden"}`)

  try {
    // Import postgres client
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(databaseUrl)

    // Read migration SQL
    const migrationPath = join(process.cwd(), "prisma", "migrations", "add_llamaparse_fields.sql")
    const migrationSQL = readFileSync(migrationPath, "utf-8")

    console.log("📝 Migration SQL loaded")
    console.log("─".repeat(50))
    console.log(migrationSQL)
    console.log("─".repeat(50))

    // Execute migration
    console.log("\n⏳ Executing migration...")

    // Execute the ALTER TABLE statement
    await sql`
      ALTER TABLE "public"."resumes" 
      ADD COLUMN IF NOT EXISTS "warnings" TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "mode_used" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "truncated" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "page_count" INTEGER
    `
    console.log("✅ Added columns to resumes table")

    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS "resumes_mode_used_idx" ON "public"."resumes"("mode_used")
    `
    console.log("✅ Created index on mode_used")

    // Add comments separately (if supported)
    const comments = migrationSQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.startsWith("COMMENT"))

    for (const comment of comments) {
      try {
        await sql(comment)
        console.log("💬 Added comment")
      } catch (e) {
        // Comments might not be supported, that's ok
        console.log("⚠️  Comment not added (may not be supported)")
      }
    }

    console.log("\n✅ Migration completed successfully!")
    console.log("\n📋 New fields added to resumes table:")
    console.log("   • warnings (TEXT[])")
    console.log("   • mode_used (VARCHAR(50))")
    console.log("   • truncated (BOOLEAN)")
    console.log("   • page_count (INTEGER)")

    // Verify the columns exist
    console.log("\n🔍 Verifying columns...")
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'resumes'
        AND column_name IN ('warnings', 'mode_used', 'truncated', 'page_count')
      ORDER BY column_name
    `

    if (result.length === 4) {
      console.log("✅ All columns verified:")
      result.forEach((col: any) => {
        console.log(`   • ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    } else {
      console.log(`⚠️  Found ${result.length} columns (expected 4)`)
    }

    process.exit(0)
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message)
    console.error("\nFull error:", error)
    process.exit(1)
  }
}

runMigration()
