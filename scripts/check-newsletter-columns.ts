import { neon } from "@neondatabase/serverless"

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set.")
    process.exit(1)
  }

  const sql = neon(databaseUrl) as any

  console.log("Checking newsletter columns...\n")

  try {
    // Check if the table exists in neon_auth schema
    const tableCheck = await sql`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'neon_auth' AND table_name = 'users_sync'
    `
    console.log("Table check:", tableCheck)

    // Get all columns from users_sync table
    const allColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'neon_auth' AND table_name = 'users_sync'
      ORDER BY ordinal_position
    `

    console.log("\nAll columns in neon_auth.users_sync:")
    allColumns.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })

    // Try to select directly from the table
    const sampleRow = await sql`
      SELECT * FROM neon_auth.users_sync LIMIT 1
    `

    if (sampleRow.length > 0) {
      console.log("\nColumns from actual data:")
      Object.keys(sampleRow[0]).forEach(key => {
        console.log(`  - ${key}`)
      })
    }

    // Check if newsletter columns exist
    const hasNewsletterCols = allColumns.some((col: any) =>
      col.column_name === 'newsletter_subscribed'
    )

    if (!hasNewsletterCols) {
      console.log("\n⚠️ Newsletter columns not found. Let's add them manually...")

      // Try to add columns directly
      await sql`
        ALTER TABLE neon_auth.users_sync
        ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT false
      `
      console.log("✓ Added newsletter_subscribed")

      await sql`
        ALTER TABLE neon_auth.users_sync
        ADD COLUMN IF NOT EXISTS beehiiv_subscriber_id TEXT
      `
      console.log("✓ Added beehiiv_subscriber_id")

      await sql`
        ALTER TABLE neon_auth.users_sync
        ADD COLUMN IF NOT EXISTS newsletter_subscribed_at TIMESTAMP
      `
      console.log("✓ Added newsletter_subscribed_at")

      await sql`
        ALTER TABLE neon_auth.users_sync
        ADD COLUMN IF NOT EXISTS newsletter_unsubscribed_at TIMESTAMP
      `
      console.log("✓ Added newsletter_unsubscribed_at")

      // Verify again
      const verifyColumns = await sql`
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

      console.log(`\n✅ Successfully added ${verifyColumns.length} newsletter columns`)
    } else {
      console.log("\n✅ Newsletter columns already exist!")
    }

  } catch (err: any) {
    console.error("Error:", err?.message || err)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e)
  process.exit(1)
})