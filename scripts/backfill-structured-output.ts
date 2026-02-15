import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { migrationAuditFromMarkdown } from "@/lib/optimized-resume-document"
import { sql, updateOptimizedResumeV2 } from "@/lib/db"

interface CandidateRow {
  id: string
  user_id: string
  optimized_content: string | null
  structured_output: unknown
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")

  const rows = await sql<CandidateRow>`
    SELECT id, user_id, optimized_content, structured_output
    FROM optimized_resumes
    WHERE structured_output IS NULL
    ORDER BY created_at ASC
  `

  let success = 0
  let failed = 0
  const failures: Array<{ id: string; reason: string }> = []
  const warnings: Array<{ id: string; warnings: string[] }> = []

  for (const row of rows) {
    try {
      if (!row.optimized_content || row.optimized_content.trim().length === 0) {
        failed += 1
        failures.push({ id: row.id, reason: "optimized_content is empty" })
        continue
      }

      const audit = migrationAuditFromMarkdown(row.optimized_content)
      if (audit.dropped_fields_warning.length > 0) {
        warnings.push({ id: row.id, warnings: audit.dropped_fields_warning })
      }

      if (!dryRun) {
        await updateOptimizedResumeV2(row.id, row.user_id, {
          structured_output: audit.structured,
          optimized_content: row.optimized_content,
        })
      }

      success += 1
    } catch (error) {
      failed += 1
      failures.push({
        id: row.id,
        reason: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    dry_run: dryRun,
    total_candidates: rows.length,
    success,
    failed,
    warnings,
    failures,
  }

  const auditDir = path.join(process.cwd(), "artifacts")
  await mkdir(auditDir, { recursive: true })
  const reportPath = path.join(auditDir, `structured-migration-audit-${Date.now()}.json`)
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")

  console.log("Structured output migration completed")
  console.log(JSON.stringify(report, null, 2))
  console.log(`Audit report: ${reportPath}`)
}

main().catch((error) => {
  console.error("Structured migration failed:", error)
  process.exit(1)
})
