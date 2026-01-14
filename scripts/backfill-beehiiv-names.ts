import "dotenv/config"
import postgres from "postgres"
import { subscribeUser } from "../lib/beehiiv"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is missing (set it in .env.local)")
}

const DRY_RUN = process.env.DRY_RUN === "true"
const LIMIT = Number(process.env.LIMIT || "0") // 0 = no limit
const CONCURRENCY = Number(process.env.CONCURRENCY || "5")

function splitName(
  full: string | null | undefined
): { firstName?: string; lastName?: string } {
  const s = (full || "").trim().replace(/\s+/g, " ")
  if (!s) return {}
  const parts = s.split(" ")
  const [first, ...rest] = parts
  const last = rest.join(" ").trim()
  return { firstName: first || undefined, lastName: last || undefined }
}

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: "require" })

  const rows = await sql<{ email: string; name: string | null }>`
    SELECT email, name
    FROM users_sync
    WHERE deleted_at IS NULL
      AND email IS NOT NULL
      AND email <> ''
  `

  const users = rows
    .map((r) => ({ email: r.email.trim(), name: r.name }))
    .filter((r) => r.email.includes("@"))

  const slice = LIMIT > 0 ? users.slice(0, LIMIT) : users

  let idx = 0
  let ok = 0
  let skippedNoName = 0
  let fail = 0
  const errors: Array<{ email: string; message: string }> = []

  async function worker() {
    while (true) {
      const i = idx++
      if (i >= slice.length) return

      const { email, name } = slice[i]
      const { firstName, lastName } = splitName(name)

      if (!firstName && !lastName) {
        skippedNoName++
        continue
      }

      if (DRY_RUN) {
        console.log("[DRY_RUN]", { email, firstName, lastName })
        ok++
        continue
      }

      const result = await subscribeUser({
        email,
        firstName,
        lastName,
        reactivateExisting: true,
        sendWelcomeEmail: false,
        utmSource: "useresumate",
        utmMedium: "backfill",
        utmCampaign: "beehiiv_name_backfill",
      })

      if (result.success) {
        ok++
      } else {
        fail++
        errors.push({ email, message: result.error?.message || "unknown error" })
        console.error("[FAIL]", email, result.error)
      }
    }
  }

  console.log(
    `Backfilling Beehiiv names for ${slice.length} users (concurrency=${CONCURRENCY}, dry_run=${DRY_RUN})`
  )
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log({ ok, skippedNoName, fail })
  if (errors.length) {
    console.log("Errors:")
    for (const e of errors.slice(0, 50)) console.log(`- ${e.email}: ${e.message}`)
    if (errors.length > 50) console.log(`...and ${errors.length - 50} more`)
  }

  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

