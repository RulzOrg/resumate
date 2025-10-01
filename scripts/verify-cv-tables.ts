import { neon } from "@neondatabase/serverless"
import fetch from "node-fetch"

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.")
    process.exit(1)
  }

  // Polyfill global fetch for Neon in Node environment
  ;(globalThis as any).fetch = (globalThis as any).fetch || (fetch as any)

  const sql = neon(databaseUrl)
  const rows = await sql<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'cv_%'
    ORDER BY tablename
  `
  if (!rows.length) {
    console.error("No cv_* tables found.")
    process.exit(2)
  }
  console.log(rows.map(r => r.tablename).join("\n"))
}

main()


