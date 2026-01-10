import { z } from "zod"

/**
 * Environment Variable Schema
 * Validates all required and optional environment variables
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Authentication (Clerk) - REQUIRED
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "Clerk publishable key is required"),
  CLERK_SECRET_KEY: z.string().min(1, "Clerk secret key is required"),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // Database (Supabase) - REQUIRED
  DATABASE_URL: z.string().min(1, "Database URL is required"),
  SUPABASE_URL: z.string().url().min(1, "Supabase URL is required"),
  SUPABASE_DATABASE_URL: z.string().optional(), // Direct PostgreSQL connection string
  SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // AI Services - REQUIRED
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  ANTHROPIC_API_KEY: z.string().optional(), // For Claude models (resume optimization)

  // Vector Database (Qdrant) - REQUIRED
  QDRANT_URL: z.string().url().min(1, "Qdrant URL is required"),
  QDRANT_API_KEY: z.string().min(1, "Qdrant API key is required"),
  QDRANT_COLLECTION: z.string().default("resumes"),

  // LlamaCloud (for document parsing) - REQUIRED
  LLAMACLOUD_API_KEY: z.string().min(1, "LlamaCloud API key is required"),

  // Payment Processing - Polar required
  // Polar
  POLAR_API_KEY: z.string().optional(),
  POLAR_WEBHOOK_SECRET: z.string().optional(),
  POLAR_SERVER: z.enum(["production", "sandbox"]).optional(),
  POLAR_PRICE_PRO_MONTHLY: z.string().optional(),
  POLAR_PRICE_PRO_YEARLY: z.string().optional(),
  POLAR_CHECKOUT_URL_PRO_MONTHLY: z.string().url().optional(),
  POLAR_CHECKOUT_URL_PRO_YEARLY: z.string().url().optional(),
  POLAR_PORTAL_URL: z.string().url().optional(),
  POLAR_PORTAL_BASE_URL: z.string().url().optional(),

  // Rate Limiting (Upstash Redis) - Optional but recommended
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Email Marketing (Beehiiv) - Optional
  BEEHIIV_API_KEY: z.string().optional(),
  BEEHIIV_PUBLICATION_ID: z.string().optional(),
  BEEHIIV_ENABLED: z
    .string()
    .optional()
    .transform((val) => val === "true"),

  // Background Jobs (Inngest) - Optional
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Whitelisted emails for unlimited access
  WHITELISTED_EMAILS: z
    .string()
    .optional()
    .default("")
    .transform((val) => val.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),

  // Admin emails for super admin access
  ADMIN_EMAILS: z
    .string()
    .optional()
    .default("")
    .transform((val) => val.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),

  // ClamAV for virus scanning - Optional
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.string().optional(),

  // Email (Resend) - Optional but needed for support/notifications
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  SUPPORT_EMAIL: z.string().email().optional().default("support@airesume.com"),

  // Feature flags
  ENABLE_VIRUS_SCAN: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
  ENABLE_RATE_LIMITING: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val === "true"),
})

// Add custom validation rules
const refinedEnvSchema = envSchema.refine(
  (env) => {
    // Must have Polar configured
    return !!env.POLAR_API_KEY
  },
  {
    message: "POLAR_API_KEY is required for payment processing",
  }
).refine(
  (env) => {
    // If rate limiting is enabled, Redis must be configured
    if (env.ENABLE_RATE_LIMITING && (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)) {
      return false
    }
    return true
  },
  {
    message: "Rate limiting is enabled but Upstash Redis is not configured",
  }
).refine(
  (env) => {
    // If Beehiiv is enabled, API key and publication ID must be set
    if (env.BEEHIIV_ENABLED && (!env.BEEHIIV_API_KEY || !env.BEEHIIV_PUBLICATION_ID)) {
      return false
    }
    return true
  },
  {
    message: "Beehiiv is enabled but API key or publication ID is missing",
  }
)

// Export the parsed and validated environment
export type Env = z.infer<typeof refinedEnvSchema>

let env: Env | undefined

/**
 * Get validated environment variables
 * Caches the result after first validation
 */
export function getEnv(): Env {
  if (env) {
    return env
  }

  try {
    env = refinedEnvSchema.parse(process.env)
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => {
        const path = e.path.join(".")
        return `  ❌ ${path}: ${e.message}`
      }).join("\n")

      console.error("🔴 Environment variable validation failed:\n")
      console.error(errors)
      console.error("\n💡 Please check your .env.local file and ensure all required variables are set.")

      // Only throw in production, warn in development
      if (process.env.NODE_ENV === "production") {
        throw new Error("Environment validation failed. Check server logs for details.")
      } else {
        console.warn("\n⚠️  Running in development mode with invalid environment. Some features may not work.")
      }
    }
    throw error
  }
}

/**
 * Validate environment on module load in production
 * This ensures the app fails fast if misconfigured
 */
if (process.env.NODE_ENV === "production") {
  getEnv()
}

/**
 * Check if a specific environment variable is set
 */
export function hasEnvVar(key: keyof Env): boolean {
  const environment = getEnv()
  return environment[key] !== undefined && environment[key] !== null && environment[key] !== ""
}

/**
 * Get environment-specific configuration
 */
export function getConfig() {
  const environment = getEnv()

  return {
    isProduction: environment.NODE_ENV === "production",
    isDevelopment: environment.NODE_ENV === "development",
    isTest: environment.NODE_ENV === "test",

    // Feature flags
    features: {
      virusScan: environment.ENABLE_VIRUS_SCAN,
      rateLimiting: environment.ENABLE_RATE_LIMITING,
      beehiiv: environment.BEEHIIV_ENABLED,
      inngest: Boolean(environment.INNGEST_EVENT_KEY),
    },

    // Payment providers
    payments: {
      hasPolar: Boolean(environment.POLAR_API_KEY),
      provider: "polar",
    },

    // URLs
    urls: {
      app: environment.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      qdrant: environment.QDRANT_URL,
      supabase: environment.SUPABASE_URL,
    },
  }
}

/**
 * Log environment configuration (without sensitive values)
 */
export function logEnvironmentStatus() {
  const config = getConfig()
  const environment = getEnv()

  console.log("🔧 Environment Configuration:")
  console.log("  📍 Environment:", environment.NODE_ENV)
  console.log("  💳 Payment Provider:", config.payments.preferredProvider)
  console.log("  🛡️  Features Enabled:")
  console.log("    - Virus Scanning:", config.features.virusScan ? "✅" : "❌")
  console.log("    - Rate Limiting:", config.features.rateLimiting ? "✅" : "❌")
  console.log("    - Newsletter (Beehiiv):", config.features.beehiiv ? "✅" : "❌")
  console.log("    - Background Jobs (Inngest):", config.features.inngest ? "✅" : "❌")
  console.log("  🔗 Integrations:")
  console.log("    - Database (Supabase):", environment.SUPABASE_URL ? "✅ Connected" : "❌ Missing")
  console.log("    - Storage (Supabase):", environment.SUPABASE_URL ? "✅ Connected" : "❌ Missing")
  console.log("    - OpenAI:", environment.OPENAI_API_KEY ? "✅ Configured" : "❌ Missing")
  console.log("    - Qdrant:", environment.QDRANT_URL ? "✅ Connected" : "❌ Missing")
}
