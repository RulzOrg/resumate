import fs from "fs"
import path from "path"
import process from "process"
import { neon } from "@neondatabase/serverless"

function splitSqlStatements(sqlText: string): string[] {
  const statements: string[] = []
  let current = ""
  let inSingle = false
  let inDouble = false
  let dollarTag: string | null = null

  for (let i = 0; i < sqlText.length; i++) {
    const ch = sqlText[i]
    const next2 = sqlText.slice(i)

    // Handle start/end of dollar-quoted blocks: $tag$ ... $tag$
    if (!inSingle && !inDouble) {
      if (dollarTag === null) {
        const m = next2.match(/^\$[a-zA-Z0-9_]*\$/)
        if (m) {
          dollarTag = m[0]
          current += dollarTag
          i += dollarTag.length - 1
          continue
        }
      } else {
        if (next2.startsWith(dollarTag)) {
          current += dollarTag
          i += dollarTag.length - 1
          dollarTag = null
          continue
        }
      }
    }

    if (dollarTag === null) {
      if (!inDouble && ch === "'" && sqlText[i - 1] !== "\\") {
        inSingle = !inSingle
        current += ch
        continue
      }
      if (!inSingle && ch === '"' && sqlText[i - 1] !== "\\") {
        inDouble = !inDouble
        current += ch
        continue
      }
    }

    if (ch === ";" && !inSingle && !inDouble && dollarTag === null) {
      const trimmed = current.trim()
      if (trimmed.length > 0) statements.push(trimmed)
      current = ""
    } else {
      current += ch
    }
  }

  const tail = current.trim()
  if (tail.length > 0) statements.push(tail)
  return statements
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Provide it via environment or .env.local")
    process.exit(1)
  }

  const fileArg = process.argv[2]
  if (!fileArg) {
    console.error("Usage: tsx scripts/run-sql.ts <path-to-sql-file>")
    process.exit(1)
  }

  const sqlFilePath = path.resolve(process.cwd(), fileArg)
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`SQL file not found: ${sqlFilePath}`)
    process.exit(1)
  }

  const sqlText = fs.readFileSync(sqlFilePath, "utf8")

  const sql = neon(databaseUrl)
  try {
    console.log(`Running SQL file: ${sqlFilePath}`)
    const statements = splitSqlStatements(sqlText)
    for (const [idx, stmt] of statements.entries()) {
      const trimmed = stmt.replace(/--.*$/gm, "").trim()
      if (!trimmed) continue
      await sql.unsafe(trimmed)
      console.log(`  ✔ Statement ${idx + 1}/${statements.length}`)
    }
    console.log("✔ Migration executed successfully")
  } catch (err: any) {
    console.error("✖ Migration failed:")
    console.error(err?.message || err)
    process.exit(1)
  }
}

main()


