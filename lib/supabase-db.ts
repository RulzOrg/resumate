/**
 * Supabase SQL Adapter
 * Provides a template-literal SQL interface for Supabase PostgreSQL
 */

import postgres from "postgres"

type SqlClient = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>

// Singleton connection instance
let supabaseSql: ReturnType<typeof postgres> | null = null

/**
 * Get or create the Supabase postgres connection
 * Priority: SUPABASE_DATABASE_URL > DATABASE_URL
 * When USE_SUPABASE_DB is true, DATABASE_URL should point to Supabase
 */
function getSupabasePostgres(): ReturnType<typeof postgres> {
  if (supabaseSql) {
    return supabaseSql
  }

  // Prefer explicit Supabase URL, fall back to DATABASE_URL
  const connectionString =
    process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      "Database URL is not configured. Set SUPABASE_DATABASE_URL or DATABASE_URL."
    )
  }

  // Detect if using Supabase pooler (contains pooler or supabase in URL)
  const isPooler =
    connectionString.includes("pooler.supabase") ||
    connectionString.includes(":6543")

  supabaseSql = postgres(connectionString, {
    // SSL required for production and Supabase
    ssl:
      process.env.NODE_ENV === "production" ||
      connectionString.includes("supabase")
        ? "require"
        : false,
    max: 10, // Connection pool size
    idle_timeout: 20,
    connect_timeout: 10,
    // Disable prepared statements when using Supabase pooler (pgbouncer)
    prepare: !isPooler,
  })

  return supabaseSql
}

/**
 * Creates a SQL client using postgres.js that matches the Neon interface
 * This provides template literal syntax: sql`SELECT * FROM users WHERE id = ${id}`
 */
export function createSupabaseSQL(): SqlClient {
  return async function sql<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> {
    const client = getSupabasePostgres()

    try {
      // postgres.js natively supports template literals
      // Use type assertion to handle dynamic parameter types
      const result = await (client as any)(strings, ...values)
      return result as unknown as T[]
    } catch (error: unknown) {
      // Transform postgres.js error to match expected format
      if (error instanceof Error) {
        const pgError = error as Error & {
          code?: string
          constraint_name?: string
          constraint?: string
          detail?: string
        }

        // Ensure error properties are accessible
        const dbError = new Error(pgError.message) as Error & {
          code?: string
          constraint?: string
          constraint_name?: string
        }
        dbError.code = pgError.code
        dbError.constraint = pgError.constraint_name || pgError.constraint
        dbError.constraint_name = pgError.constraint_name

        throw dbError
      }
      throw error
    }
  }
}

/**
 * Execute raw SQL query with parameters
 */
export async function execRawSQL<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = getSupabasePostgres()

  // Use unsafe for raw query execution with manual parameter binding
  const result = await client.unsafe(query, params as any[])
  return result as unknown as T[]
}

/**
 * Health check for Supabase database connection
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean
  latency?: number
  error?: string
}> {
  const start = Date.now()

  try {
    const client = getSupabasePostgres()
    await client`SELECT 1 as health_check`

    return { connected: true, latency: Date.now() - start }
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

/**
 * Close the database connection pool
 * Call this during graceful shutdown
 */
export async function closeSupabaseConnection(): Promise<void> {
  if (supabaseSql) {
    await supabaseSql.end()
    supabaseSql = null
  }
}

/**
 * Reset connection (for testing purposes)
 */
export function resetSupabaseConnection(): void {
  if (supabaseSql) {
    supabaseSql.end().catch(() => {})
    supabaseSql = null
  }
}

/**
 * Transaction SQL client type - supports template literal queries
 */
export type TransactionSql = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>

/**
 * Execute multiple queries within a transaction
 * All queries succeed together or rollback on any failure
 */
export async function withTransaction<T>(
  callback: (sql: TransactionSql) => Promise<T>
): Promise<T> {
  const client = getSupabasePostgres()
  return client.begin((tx) => callback(tx as unknown as TransactionSql))
}
