import postgres from "postgres"

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set")
    process.exit(1)
  }

  const sql = postgres(databaseUrl, { ssl: "require" })

  console.log("▶️  Creating pending_polar_subscriptions table...\n")

  try {
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS pending_polar_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        polar_subscription_id VARCHAR(255) UNIQUE NOT NULL,
        polar_customer_id VARCHAR(255) NOT NULL,
        polar_checkout_id VARCHAR(255),
        customer_email VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255),
        plan_type VARCHAR(50) NOT NULL DEFAULT 'pro',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        amount INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        recurring_interval VARCHAR(20) DEFAULT 'month',
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        raw_webhook_data JSONB,
        processed BOOLEAN DEFAULT FALSE,
        processed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    console.log("✅ Created pending_polar_subscriptions table")

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_pending_polar_subs_email ON pending_polar_subscriptions(customer_email)`
    console.log("✅ Created index on customer_email")

    await sql`CREATE INDEX IF NOT EXISTS idx_pending_polar_subs_status ON pending_polar_subscriptions(status)`
    console.log("✅ Created index on status")

    await sql`CREATE INDEX IF NOT EXISTS idx_pending_polar_subs_processed ON pending_polar_subscriptions(processed)`
    console.log("✅ Created index on processed")

    // Verify the table exists
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'pending_polar_subscriptions'
      ) AS exists
    `
    console.log("\n🎉 Table exists:", result[0]?.exists ? "yes" : "no")

  } catch (err: any) {
    console.error(`\n❌ Failed:`, err?.message || err)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
