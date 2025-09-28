import { sql, ensureUserSyncRecord } from "@/lib/db"

type TableName =
  | "resumes"
  | "job_analysis"
  | "optimized_resumes"
  | "job_applications"
  | "job_targets"

const TABLES: TableName[] = ["resumes", "job_analysis", "optimized_resumes", "job_applications", "job_targets"]

async function getDistinctUserIds(table: TableName): Promise<string[]> {
  const rows = await sql({ text: `SELECT DISTINCT user_id FROM ${table}`, values: [] })
  return rows.map((row: any) => row.user_id).filter(Boolean)
}

async function main() {
  const userIds = new Set<string>()

  for (const table of TABLES) {
    const ids = await getDistinctUserIds(table)
    ids.forEach((id) => userIds.add(id))
  }

  for (const id of userIds) {
    await ensureUserSyncRecord({ id })
  }

  console.log(`Backfill complete. Ensured ${userIds.size} user records exist.`)
}

main().catch((error) => {
  console.error("Backfill failed", error)
  process.exit(1)
})
