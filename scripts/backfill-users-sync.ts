import { neon } from "@neondatabase/serverless"

type SqlClient = <T = Record<string, any>>(strings: TemplateStringsArray, ...values: any[]) => Promise<T[]>

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Aborting.")
    process.exit(1)
  }

  const sql: SqlClient = neon(databaseUrl) as unknown as SqlClient

  const clerkSecret = process.env.CLERK_SECRET_KEY || ""
  const includeAllClerkUsers = process.argv.includes("--from-clerk")

  const candidateClerkIds = new Set<string>()

  console.log("Collecting candidate Clerk user IDs…")

  // From user_profiles
  try {
    const rows = await sql<{ clerk_user_id: string }>`
      SELECT DISTINCT clerk_user_id FROM user_profiles WHERE clerk_user_id IS NOT NULL
    `
    rows.forEach(r => r.clerk_user_id && candidateClerkIds.add(r.clerk_user_id))
    console.log(`✓ Collected ${rows.length} from user_profiles`)
  } catch (e) {
    console.warn("user_profiles not present or query failed; continuing")
  }

  // From webhook events
  try {
    const rows = await sql<{ user_id: string }>`
      SELECT DISTINCT user_id FROM clerk_webhook_events WHERE user_id IS NOT NULL
    `
    rows.forEach(r => r.user_id && candidateClerkIds.add(r.user_id))
    console.log(`✓ Collected ${rows.length} from clerk_webhook_events`)
  } catch (e) {
    console.warn("clerk_webhook_events not present or query failed; continuing")
  }

  // Optionally enumerate all Clerk users if requested and possible
  if (includeAllClerkUsers) {
    if (!clerkSecret) {
      console.warn("--from-clerk specified but CLERK_SECRET_KEY not set; skipping Clerk enumeration")
    } else {
      console.log("Enumerating Clerk users (this may take a while)…")
      let offset = 0
      const limit = 100
      /* Minimal pagination over Clerk users API */
      while (true) {
        const url = `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${clerkSecret}` },
          cache: "no-store",
        })
        if (!resp.ok) {
          console.warn("Clerk users list failed", { status: resp.status })
          break
        }
        const data: any[] = await resp.json()
        if (!Array.isArray(data) || data.length === 0) break
        for (const u of data) {
          if (u?.id) candidateClerkIds.add(String(u.id))
        }
        offset += data.length
        if (data.length < limit) break
      }
    }
  }

  if (candidateClerkIds.size === 0) {
    console.log("No candidate Clerk IDs found. Nothing to backfill.")
    return
  }

  console.log(`Total candidate Clerk IDs: ${candidateClerkIds.size}`)

  let created = 0
  let skipped = 0
  let failed = 0

  for (const clerkUserId of candidateClerkIds) {
    // Skip if already present
    const existing = await sql<{ count: string }>`
      SELECT COUNT(*)::text as count FROM users_sync WHERE clerk_user_id = ${clerkUserId} AND deleted_at IS NULL
    `
    if (Number(existing[0]?.count || 0) > 0) {
      skipped++
      continue
    }

    // Fetch minimal user data from Clerk
    let email = ""
    let name = "User"
    if (clerkSecret) {
      try {
        const resp = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
          headers: { Authorization: `Bearer ${clerkSecret}`, "Content-Type": "application/json" },
          cache: "no-store",
        })
        if (resp.ok) {
          const user = await resp.json()
          email = extractPrimaryEmail(user)
          name =
            user.full_name ||
            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
            user.username ||
            "User"
        } else {
          console.warn("Failed to fetch Clerk user; proceeding with placeholders", { clerkUserId, status: resp.status })
        }
      } catch (err) {
        console.warn("Clerk fetch error; proceeding with placeholders", { clerkUserId, err })
      }
    } else {
      console.warn("CLERK_SECRET_KEY not set; using placeholders for email/name")
    }

    if (!email) email = `${clerkUserId}@placeholder.local`

    try {
      await sql`
        INSERT INTO users_sync (clerk_user_id, email, name, subscription_status, subscription_plan, created_at, updated_at)
        VALUES (${clerkUserId}, ${email}, ${name}, 'free', 'free', NOW(), NOW())
        ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, deleted_at = NULL, updated_at = NOW()
      `
      created++
      console.log("Created/updated users_sync for", clerkUserId)
    } catch (err: any) {
      failed++
      console.error("Failed to insert users_sync", { clerkUserId, error: err?.message, code: err?.code })
    }
  }

  console.log("Backfill complete:", { created, skipped, failed })
}

function extractPrimaryEmail(clerkUser: any): string {
  if (!clerkUser) return ""
  if (Array.isArray(clerkUser.emailAddresses)) {
    const match = clerkUser.emailAddresses.find((a: any) => a.id === clerkUser.primaryEmailAddressId)
    if (match?.emailAddress) return match.emailAddress
    if (clerkUser.emailAddresses[0]?.emailAddress) return clerkUser.emailAddresses[0].emailAddress
  }
  if (Array.isArray(clerkUser.email_addresses)) {
    const primaryId = clerkUser.primary_email_address_id
    const match = clerkUser.email_addresses.find((a: any) => a.id === primaryId)
    if (match?.email_address) return match.email_address
    if (clerkUser.email_addresses[0]?.email_address) return clerkUser.email_addresses[0].email_address
  }
  return clerkUser.email_address || clerkUser.email || ""
}

main().catch((err) => {
  console.error("Backfill script crashed:", err)
  process.exit(1)
})


