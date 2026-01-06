import postgres from "postgres"
import fs from "fs"
import path from "path"

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set.")
    process.exit(1)
  }

  const sql = postgres(databaseUrl, { ssl: "require" })

  console.log("🚀 Creating usage_tracking table...\n")

  try {
    // Check if table already exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'usage_tracking'
      ) AS exists
    `

    if (tableExists[0].exists) {
      console.log("✅ usage_tracking table already exists.")

      // Verify columns
      const columns = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'usage_tracking'
        ORDER BY ordinal_position
      `

      console.log("\nExisting columns:")
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type})`)
      })

      await sql.end()
      return
    }

    // Read the SQL file
    const migrationPath = path.join(process.cwd(), "scripts", "create-usage-tracking-table.sql")
    const sqlText = fs.readFileSync(migrationPath, "utf8")

    // Execute the entire migration as one transaction
    await sql.unsafe(sqlText)

    console.log("✅ usage_tracking table created successfully!\n")

    // Verify the table was created
    const verification = await sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'usage_tracking'
      ORDER BY ordinal_position
    `

    console.log("Created columns:")
    verification.forEach((col: any) => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`)
    })

    // Verify indexes
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'usage_tracking'
    `

    console.log("\nCreated indexes:")
    indexes.forEach((idx: any) => {
      console.log(`  ✓ ${idx.indexname}`)
    })

    console.log("\n🎉 Usage tracking table setup complete!")
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
