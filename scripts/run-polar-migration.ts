import postgres from "postgres"
import fs from "fs"
import path from "path"

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set")
    process.exit(1)
  }

  const sql = postgres(databaseUrl, { ssl: "require" })

  const root = process.cwd()
  const migrationsDir = path.join(root, "prisma", "migrations")
  const migrationFile = "add_polar_fields.sql"
  const fullPath = path.join(migrationsDir, migrationFile)

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Migration file not found: ${fullPath}`)
    process.exit(1)
  }

  const sqlText = fs.readFileSync(fullPath, "utf8")
  console.log(`▶️  Running: ${migrationFile}\n`)

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

      console.log(`Executing: ${cleaned.substring(0, 80)}...`)
      await sql.unsafe(cleaned)
    }

    console.log(`\n✅ Successfully applied: ${migrationFile}`)
    console.log("🎉 Polar fields have been added to the database!")
  } catch (err: any) {
    console.error(`\n❌ Failed on ${migrationFile}:`, err?.message || err)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
