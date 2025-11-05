import { neon } from "@neondatabase/serverless"
import fs from "fs"
import path from "path"

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set. Create .env.local and set it.")
    process.exit(1)
  }

  const sql = neon(databaseUrl) as any

  console.log("🚀 Running newsletter database migration...\n")

  // First check if columns already exist
  const existingCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'neon_auth'
      AND table_name = 'users_sync'
      AND column_name IN (
        'newsletter_subscribed',
        'beehiiv_subscriber_id',
        'newsletter_subscribed_at',
        'newsletter_unsubscribed_at'
      )
  `

  if (existingCols.length === 4) {
    console.log("✅ Newsletter columns already exist. Migration not needed.")
    process.exit(0)
  }

  const migrationPath = path.join(process.cwd(), "scripts", "add-newsletter-columns.sql")
  let sqlText = fs.readFileSync(migrationPath, "utf8")

  // Update the SQL to use the correct schema
  sqlText = sqlText.replace(/users_sync/g, "neon_auth.users_sync")

  try {
    // Handle multi-line ALTER TABLE statement and other statements separately
    // Extract the ALTER TABLE command which spans multiple lines
    const alterTableMatch = sqlText.match(/ALTER TABLE[\s\S]*?(?=\n\n|CREATE INDEX|COMMENT ON|$)/i)
    const alterTableStatement = alterTableMatch ? alterTableMatch[0].trim() : ""

    // Extract CREATE INDEX statement
    const createIndexMatch = sqlText.match(/CREATE INDEX[\s\S]*?;/i)
    const createIndexStatement = createIndexMatch ? createIndexMatch[0].trim() : ""

    // Extract COMMENT statements
    const commentStatements = sqlText.match(/COMMENT ON[\s\S]*?;/gi) || []

    const statements = []

    if (alterTableStatement) {
      statements.push(alterTableStatement.replace(/;$/, "").trim())
    }

    if (createIndexStatement) {
      statements.push(createIndexStatement.replace(/;$/, "").trim())
    }

    commentStatements.forEach(comment => {
      statements.push(comment.replace(/;$/, "").trim())
    })

    for (const statement of statements) {
      // Remove comment lines from each statement
      const cleaned = statement
        .split("\n")
        .filter(line => !line.trim().startsWith("--"))
        .join("\n")
        .trim()

      if (!cleaned) continue

      console.log(`Executing: ${cleaned.substring(0, 50)}...`)

      if (typeof sql.unsafe === "function") {
        await sql.unsafe(cleaned)
      } else if (typeof sql.query === "function") {
        await sql.query(cleaned)
      } else {
        // Try direct call
        await sql(cleaned)
      }
    }

    console.log("✅ Newsletter migration applied successfully!\n")

    // Verify the columns were added
    console.log("🔎 Verifying newsletter columns...")

    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'neon_auth'
        AND table_name = 'users_sync'
        AND column_name IN (
          'newsletter_subscribed',
          'beehiiv_subscriber_id',
          'newsletter_subscribed_at',
          'newsletter_unsubscribed_at'
        )
      ORDER BY column_name
    `

    console.log("Newsletter columns found:")
    columns.forEach((col: any) => {
      console.log(`  ✓ ${col.column_name}`)
    })

    if (columns.length === 4) {
      console.log("\n🎉 All newsletter columns verified successfully!")
    } else {
      console.log(`\n⚠️ Only ${columns.length}/4 newsletter columns found`)
    }

  } catch (err: any) {
    console.error("❌ Migration failed:", err?.message || err)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e)
  process.exit(1)
})