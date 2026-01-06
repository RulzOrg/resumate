import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Singleton instances
let serverClient: SupabaseClient | null = null
let browserClient: SupabaseClient | null = null

/**
 * Get Supabase client for server-side operations
 * Uses service role key for full database access
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (serverClient) {
    return serverClient
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase server credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
    )
  }

  serverClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return serverClient
}

/**
 * Get Supabase client for browser/client-side operations
 * Uses anon key with RLS policies
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient should only be called on the client side")
  }

  if (browserClient) {
    return browserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase client credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    )
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  })

  return browserClient
}

/**
 * Get Supabase storage client for file operations
 * Returns the storage interface from the server client
 */
export function getSupabaseStorage() {
  return getSupabaseServerClient().storage
}

/**
 * Execute raw SQL query using Supabase
 * Wrapper for database operations during migration
 */
export async function supabaseQuery<T = unknown>(
  query: string,
  params?: unknown[]
): Promise<T[]> {
  const client = getSupabaseServerClient()
  
  // Use rpc to execute raw SQL
  const { data, error } = await client.rpc("exec_sql", {
    query,
    params: params || [],
  })

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`)
  }

  return data as T[]
}

/**
 * Reset singleton clients (useful for testing)
 */
export function resetSupabaseClients(): void {
  serverClient = null
  browserClient = null
}

