/**
 * Check current schema of resumes table
 */

async function checkSchema() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set")
    process.exit(1)
  }

  try {
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(databaseUrl)

    console.log("🔍 Checking resumes table schema...")

    // Check all columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'resumes'
      ORDER BY ordinal_position
    `

    console.log(`\n📋 Found ${columns.length} columns in resumes table:\n`)
    columns.forEach((col: any) => {
      console.log(`   ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} nullable: ${col.is_nullable}`)
    })

    // Check specifically for our new columns
    const newColumns = columns.filter((col: any) =>
      ["warnings", "mode_used", "truncated", "page_count"].includes(col.column_name)
    )

    console.log(`\n✅ LlamaParse fields status: ${newColumns.length}/4 found`)
    if (newColumns.length > 0) {
      newColumns.forEach((col: any) => {
        console.log(`   ✓ ${col.column_name}`)
      })
    }

    // Check indexes
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'resumes'
      ORDER BY indexname
    `

    console.log(`\n📊 Indexes (${indexes.length} total):`)
    indexes.forEach((idx: any) => {
      if (idx.indexname.includes("mode_used")) {
        console.log(`   ✓ ${idx.indexname} (LlamaParse index)`)
      }
    })
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }
}

checkSchema()
