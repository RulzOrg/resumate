import postgres from "postgres"
import fs from "fs"
import path from "path"

// Try to load .env.local if it exists
try {
  const envPath = path.join(process.cwd(), ".env.local")
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8")
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
} catch (e) {
  // Ignore errors loading .env.local
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set.")
    process.exit(1)
  }

  const sql = postgres(databaseUrl, { ssl: "require" })

  console.log("🚀 Running parsed_structure column migration...\n")

  try {
    // Check current database and schema
    const dbInfo = await sql`SELECT current_database() AS db, current_schema() AS schema`
    console.log(`Connected to database: ${dbInfo[0]?.db}, schema: ${dbInfo[0]?.schema}\n`)
    
    // First, verify the resumes table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'resumes'
      ) AS exists
    `
    
    if (!tableExists[0]?.exists) {
      console.error("❌ Table 'resumes' does not exist in the database!")
      await sql.end()
      process.exit(1)
    }
    
    console.log("✓ Table 'resumes' exists\n")
    
    // Try to directly query the table to see if columns exist
    try {
      const testQuery = await sql`SELECT parsed_structure, parsed_at FROM resumes LIMIT 0`
      console.log("✓ Columns already exist (query succeeded)\n")
      await sql.end()
      return
    } catch (e: any) {
      if (e.message.includes('column') && e.message.includes('does not exist')) {
        console.log("Columns don't exist yet, proceeding with migration...\n")
      } else {
        console.log("Testing column existence...\n")
      }
    }
    // Check if columns already exist
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'resumes'
        AND column_name IN ('parsed_structure', 'parsed_at')
      ORDER BY column_name
    `

    if (columns.length === 2) {
      console.log("✅ Columns already exist:")
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type})`)
      })

      // Check index
      const indexes = await sql`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public' 
          AND tablename = 'resumes'
          AND indexname = 'idx_resumes_parsed_at'
      `

      if (indexes.length > 0) {
        console.log("\n✅ Index already exists: idx_resumes_parsed_at")
        console.log("\n🎉 Migration already applied!")
        await sql.end()
        return
      }
    }

    // Read the SQL file
    const migrationPath = path.join(process.cwd(), "scripts", "add_parsed_structure_column.sql")
    const sqlText = fs.readFileSync(migrationPath, "utf8")

    // Execute statements one by one with proper error handling
    const statements = [
      "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_structure JSONB",
      "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP WITH TIME ZONE",
      "CREATE INDEX IF NOT EXISTS idx_resumes_parsed_at ON resumes(parsed_at)"
    ]

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 70)}...`)
      try {
        const result = await sql.unsafe(stmt + ';')
        console.log(`  ✓ Statement ${i + 1} completed`)
        
        // For ALTER TABLE statements, verify immediately
        if (stmt.startsWith('ALTER TABLE')) {
          await new Promise(resolve => setTimeout(resolve, 300))
          const colName = stmt.includes('parsed_structure') ? 'parsed_structure' : 'parsed_at'
          try {
            await sql.unsafe(`SELECT ${colName} FROM resumes LIMIT 0;`)
            console.log(`  ✓ Verified column ${colName} exists`)
          } catch (verifyErr: any) {
            console.log(`  ⚠ Could not verify ${colName}: ${verifyErr.message}`)
          }
        }
        
        // Wait a bit between statements
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (err: any) {
        // IF NOT EXISTS might cause a warning, but shouldn't error
        if (err?.message && !err.message.includes('already exists')) {
          console.error(`  ✗ Statement ${i + 1} failed:`, err.message)
          throw err
        } else {
          console.log(`  ⚠ Statement ${i + 1} - column/index may already exist`)
        }
      }
    }
    console.log("")

    console.log("✅ Migration applied successfully!\n")

    // Final verification - query columns directly
    console.log("\nFinal verification:")
    try {
      await sql.unsafe("SELECT parsed_structure, parsed_at FROM resumes LIMIT 0;")
      console.log("  ✓ parsed_structure column - EXISTS and queryable")
      console.log("  ✓ parsed_at column - EXISTS and queryable")
    } catch (err: any) {
      console.error("  ✗ Verification failed:", err.message)
      throw err
    }
    
    // Check index
    try {
      const indexCheck = await sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND tablename = 'resumes' 
          AND indexname = 'idx_resumes_parsed_at'
      `
      if (indexCheck.length > 0) {
        console.log("  ✓ Index idx_resumes_parsed_at - EXISTS")
      } else {
        console.log("  ⚠ Index verification inconclusive (index may exist with different name)")
      }
    } catch (err: any) {
      console.log("  ⚠ Could not verify index (non-critical)")
    }

    console.log("\n🎉 Migration complete!")
    await sql.end()

  } catch (err: any) {
    console.error("❌ Migration failed:", err?.message || err)
    await sql.end()
    process.exit(1)
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e)
  process.exit(1)
})
