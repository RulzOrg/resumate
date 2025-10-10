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

  const root = process.cwd()
  const migrationsDir = path.join(root, "prisma", "migrations")

  const files = [
    "add_resume_versions_table.sql",
    "add_v2_structured_output.sql",
  ]

  console.log("🚀 Applying SQL migrations...\n")

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file)
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Missing migration file: ${fullPath}`)
      process.exit(1)
    }

    const sqlText = fs.readFileSync(fullPath, "utf8")
    console.log(`▶️  Running: ${file}`)

    try {
      const statements = sqlText
        .split(/;\s*\n/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"))

      for (const statement of statements) {
        const cleaned = statement
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .trim()
        if (!cleaned) continue
        if (typeof sql.unsafe === "function") {
          await sql.unsafe(cleaned)
        } else if (typeof sql.query === "function") {
          await sql.query(cleaned)
        } else {
          throw new Error("Neon client does not support unsafe/query execution APIs")
        }
      }

      console.log(`✅ Applied: ${file}\n`)
    } catch (err: any) {
      console.error(`❌ Failed on ${file}:`, err?.message || err)
      process.exit(1)
    }
  }

  console.log("🔎 Verifying schema...")

  const inspector = neon(databaseUrl) as any

  const dbInfo = await inspector`SELECT current_database() AS db, current_schema() AS schema`
  const searchPathRows = await inspector`SHOW search_path`
  const searchPath = (searchPathRows?.[0]?.search_path as string) || ""

  const regclass = await inspector`SELECT to_regclass('public.resume_versions') AS reg`
  const reg = regclass?.[0]?.reg

  const resumeVersionsRows = await inspector`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'resume_versions'
    ) AS exists
  `
  const resumeVersionsExists = Boolean(resumeVersionsRows?.[0]?.exists)

  const optimizedCols = await inspector`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'optimized_resumes'
      AND column_name IN ('structured_output','qa_metrics','export_formats')
    ORDER BY column_name
  `

  console.log(`\n• current_database: ${dbInfo?.[0]?.db}`)
  console.log(`• current_schema: ${dbInfo?.[0]?.schema}`)
  console.log(`• search_path: ${searchPath}`)
  console.log("• to_regclass('public.resume_versions'):", reg || "null")
  console.log("• resume_versions table:", resumeVersionsExists ? "present" : "missing")
  console.log(
    "• optimized_resumes JSONB columns:",
    optimizedCols.map((r: any) => r.column_name).join(", ") || "missing"
  )

  if (!resumeVersionsExists || optimizedCols.length < 3) {
    console.error("❌ Verification failed. Check logs above.")
    process.exit(1)
  }

  console.log("\n🎉 All migrations applied and verified.")
}

main().catch((e) => {
  console.error("Unexpected error:", e)
  process.exit(1)
})
