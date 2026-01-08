import { getEnv, getConfig } from "./env"
import { createLogger } from "./debug-logger"

// ============================================================================
// Logger
// ============================================================================

const logger = createLogger("Beehiiv")

// ============================================================================
// Types
// ============================================================================

export interface BeehiivSubscriber {
  id: string
  email: string
  status: "active" | "inactive" | "pending" | "validating"
  created: number
  subscription_tier: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  referring_site?: string
  referral_code?: string
}

export interface BeehiivSubscribeParams {
  email: string
  firstName?: string
  lastName?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  reactivateExisting?: boolean
  sendWelcomeEmail?: boolean
}

export interface BeehiivApiResponse<T> {
  data: T
}

export interface BeehiivError {
  error: string
  message: string
  statusCode: number
}

export type BeehiivResult<T> =
  | { success: true; data: T }
  | { success: false; error: BeehiivError }

// Structured log event for audit/monitoring
export interface BeehiivLogEvent {
  action: "subscribe" | "unsubscribe" | "get_subscriber" | "update_status"
  email?: string
  subscriberId?: string
  success: boolean
  duration: number
  error?: BeehiivError
  metadata?: Record<string, unknown>
}

// ============================================================================
// Constants
// ============================================================================

const BEEHIIV_API_BASE = "https://api.beehiiv.com/v2"
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// Track if we've shown the config warning (to avoid spam)
let hasShownConfigWarning = false

// ============================================================================
// Structured Logging
// ============================================================================

/**
 * Log a structured Beehiiv event for monitoring/audit purposes
 */
function logBeehiivEvent(event: BeehiivLogEvent): void {
  const logData = {
    timestamp: new Date().toISOString(),
    service: "beehiiv",
    ...event,
  }

  if (event.success) {
    logger.log(`[${event.action}] Success`, {
      email: event.email,
      subscriberId: event.subscriberId,
      duration: `${event.duration}ms`,
      ...event.metadata,
    })
  } else {
    logger.error(`[${event.action}] Failed`, {
      email: event.email,
      error: event.error?.message,
      errorCode: event.error?.error,
      statusCode: event.error?.statusCode,
      duration: `${event.duration}ms`,
      ...event.metadata,
    })
  }

  // In production, you could send this to an external logging service
  if (getConfig().isProduction && !event.success) {
    // Could integrate with Sentry, LogDNA, etc.
    console.error("[BEEHIIV_AUDIT]", JSON.stringify(logData))
  }
}

/**
 * Check Beehiiv configuration and log warnings in development
 * Call this once at startup or first API call
 */
export function validateBeehiivConfig(): {
  valid: boolean
  warnings: string[]
  errors: string[]
} {
  const config = getConfig()
  const warnings: string[] = []
  const errors: string[] = []

  // Check if enabled but missing credentials
  if (config.features.beehiiv) {
    try {
      const env = getEnv()
      if (!env.BEEHIIV_API_KEY) {
        errors.push("BEEHIIV_API_KEY is missing but BEEHIIV_ENABLED=true")
      }
      if (!env.BEEHIIV_PUBLICATION_ID) {
        errors.push("BEEHIIV_PUBLICATION_ID is missing but BEEHIIV_ENABLED=true")
      }
    } catch {
      errors.push("Failed to read Beehiiv environment variables")
    }
  }

  // Dev-mode warnings for disabled integration
  if (!config.features.beehiiv && config.isDevelopment && !hasShownConfigWarning) {
    warnings.push(
      "Beehiiv integration is disabled. Set BEEHIIV_ENABLED=true with valid credentials to enable."
    )
    hasShownConfigWarning = true
  }

  // Log warnings and errors
  if (warnings.length > 0 && config.isDevelopment) {
    warnings.forEach((w) => console.warn(`⚠️  [Beehiiv] ${w}`))
  }
  if (errors.length > 0) {
    errors.forEach((e) => console.error(`❌ [Beehiiv] ${e}`))
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

function getHeaders(): HeadersInit {
  const env = getEnv()
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.BEEHIIV_API_KEY}`,
  }
}

function getPublicationId(): string {
  const env = getEnv()
  return env.BEEHIIV_PUBLICATION_ID || ""
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<BeehiivResult<T>> {
  const config = getConfig()

  // Graceful degradation: Check if Beehiiv is enabled
  if (!config.features.beehiiv) {
    // Only log once in dev to avoid spam
    if (config.isDevelopment && !hasShownConfigWarning) {
      console.warn("⚠️  [Beehiiv] Integration disabled. Skipping API call. Set BEEHIIV_ENABLED=true to enable.")
      hasShownConfigWarning = true
    }
    return {
      success: false,
      error: {
        error: "DISABLED",
        message: "Beehiiv integration is disabled",
        statusCode: 0,
      },
    }
  }

  // Validate config before making requests
  const configCheck = validateBeehiivConfig()
  if (!configCheck.valid) {
    return {
      success: false,
      error: {
        error: "CONFIG_ERROR",
        message: configCheck.errors.join("; "),
        statusCode: 0,
      },
    }
  }

  let lastError: BeehiivError | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (response.ok) {
        // Handle empty responses (e.g., 204 No Content or empty DELETE responses)
        const text = await response.text()
        if (!text || text.trim() === "") {
          return { success: true, data: {} as T }
        }
        
        try {
          const json = JSON.parse(text) as BeehiivApiResponse<T>
          return { success: true, data: json.data || (json as unknown as T) }
        } catch {
          // If JSON parse fails but response was OK, treat as success
          return { success: true, data: {} as T }
        }
      }

      // Parse error response
      const errorBody = await response.json().catch(() => ({}))
      lastError = {
        error: errorBody.error || "API_ERROR",
        message: errorBody.message || `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      }

      // Don't retry on client errors (4xx) except rate limiting (429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        logger.error(`Client error (${response.status}):`, lastError.message)
        return { success: false, error: lastError }
      }

      // Retry on server errors or rate limiting
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1) // Exponential backoff
        logger.warn(`Attempt ${attempt}/${retries} failed (HTTP ${response.status}). Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    } catch (error) {
      lastError = {
        error: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Unknown network error",
        statusCode: 0,
      }

      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
        logger.warn(`Network error on attempt ${attempt}/${retries}. Retrying in ${delay}ms...`, lastError.message)
        await sleep(delay)
      }
    }
  }

  logger.error(`All ${retries} retry attempts exhausted`, lastError)
  return {
    success: false,
    error: lastError || {
      error: "UNKNOWN_ERROR",
      message: "Request failed after all retries",
      statusCode: 0,
    },
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Subscribe a user to the Beehiiv newsletter
 */
export async function subscribeUser(
  params: BeehiivSubscribeParams
): Promise<BeehiivResult<BeehiivSubscriber>> {
  const startTime = Date.now()
  const publicationId = getPublicationId()

  if (!publicationId) {
    const error: BeehiivError = {
      error: "CONFIG_ERROR",
      message: "Beehiiv publication ID not configured",
      statusCode: 0,
    }
    logBeehiivEvent({
      action: "subscribe",
      email: params.email,
      success: false,
      duration: Date.now() - startTime,
      error,
    })
    return { success: false, error }
  }

  const url = `${BEEHIIV_API_BASE}/publications/${publicationId}/subscriptions`

  const body: Record<string, unknown> = {
    email: params.email,
    reactivate_existing: params.reactivateExisting ?? true,
    send_welcome_email: params.sendWelcomeEmail ?? true,
  }

  // Add UTM parameters if provided
  if (params.utmSource) body.utm_source = params.utmSource
  if (params.utmMedium) body.utm_medium = params.utmMedium
  if (params.utmCampaign) body.utm_campaign = params.utmCampaign

  // Add custom fields for name if provided
  const customFields: { name: string; value: string }[] = []
  if (params.firstName) {
    customFields.push({ name: "first_name", value: params.firstName })
  }
  if (params.lastName) {
    customFields.push({ name: "last_name", value: params.lastName })
  }
  if (customFields.length > 0) {
    body.custom_fields = customFields
  }

  logger.log(`Subscribing user: ${params.email}`)

  const result = await fetchWithRetry<BeehiivSubscriber>(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  const duration = Date.now() - startTime

  logBeehiivEvent({
    action: "subscribe",
    email: params.email,
    subscriberId: result.success ? result.data.id : undefined,
    success: result.success,
    duration,
    error: result.success ? undefined : result.error,
    metadata: {
      utmSource: params.utmSource,
      hasName: Boolean(params.firstName || params.lastName),
    },
  })

  return result
}

/**
 * Unsubscribe a user from the Beehiiv newsletter
 * @param identifier - Either the subscriber ID or email address
 */
export async function unsubscribeUser(
  identifier: string
): Promise<BeehiivResult<{ success: boolean }>> {
  const startTime = Date.now()
  const publicationId = getPublicationId()
  const isEmail = identifier.includes("@")

  if (!publicationId) {
    const error: BeehiivError = {
      error: "CONFIG_ERROR",
      message: "Beehiiv publication ID not configured",
      statusCode: 0,
    }
    logBeehiivEvent({
      action: "unsubscribe",
      email: isEmail ? identifier : undefined,
      subscriberId: isEmail ? undefined : identifier,
      success: false,
      duration: Date.now() - startTime,
      error,
    })
    return { success: false, error }
  }

  // If identifier looks like an email, find subscriber first
  let subscriberId = identifier
  let email = isEmail ? identifier : undefined

  if (isEmail) {
    const subscriber = await getSubscriberByEmail(identifier)
    if (!subscriber.success) {
      // If subscriber not found, they're already unsubscribed - treat as success
      if (subscriber.error.error === "NOT_FOUND") {
        logger.log(`Subscriber not found - already unsubscribed: ${identifier}`)
        logBeehiivEvent({
          action: "unsubscribe",
          email: identifier,
          success: true,
          duration: Date.now() - startTime,
          metadata: { reason: "not_found_already_unsubscribed" },
        })
        return { success: true, data: { success: true } }
      }
      
      // Other errors (API errors, network issues, etc.)
      logBeehiivEvent({
        action: "unsubscribe",
        email: identifier,
        success: false,
        duration: Date.now() - startTime,
        error: subscriber.error,
        metadata: { reason: "subscriber_lookup_failed" },
      })
      return { success: false, error: subscriber.error }
    }
    subscriberId = subscriber.data.id
  }

  const url = `${BEEHIIV_API_BASE}/publications/${publicationId}/subscriptions/${subscriberId}`

  logger.log(`Unsubscribing: ${identifier}`)

  const result = await fetchWithRetry<{ id: string }>(url, {
    method: "DELETE",
    headers: getHeaders(),
  })

  const duration = Date.now() - startTime

  // Handle 404 as success - subscriber already deleted or doesn't exist
  if (!result.success && result.error.statusCode === 404) {
    logger.log(`Subscriber not found (404) - treating as success: ${identifier}`)
    logBeehiivEvent({
      action: "unsubscribe",
      email,
      subscriberId,
      success: true,
      duration,
      metadata: { reason: "not_found_treated_as_success" },
    })
    return { success: true, data: { success: true } }
  }

  logBeehiivEvent({
    action: "unsubscribe",
    email,
    subscriberId,
    success: result.success,
    duration,
    error: result.success ? undefined : result.error,
  })

  if (result.success) {
    return { success: true, data: { success: true } }
  }

  return { success: false, error: result.error }
}

/**
 * Get subscriber by email address
 */
export async function getSubscriberByEmail(
  email: string
): Promise<BeehiivResult<BeehiivSubscriber>> {
  const startTime = Date.now()
  const publicationId = getPublicationId()

  if (!publicationId) {
    const error: BeehiivError = {
      error: "CONFIG_ERROR",
      message: "Beehiiv publication ID not configured",
      statusCode: 0,
    }
    logBeehiivEvent({
      action: "get_subscriber",
      email,
      success: false,
      duration: Date.now() - startTime,
      error,
    })
    return { success: false, error }
  }

  const url = `${BEEHIIV_API_BASE}/publications/${publicationId}/subscriptions?email=${encodeURIComponent(email)}`

  const result = await fetchWithRetry<BeehiivSubscriber[]>(url, {
    method: "GET",
    headers: getHeaders(),
  })

  const duration = Date.now() - startTime

  if (!result.success) {
    logBeehiivEvent({
      action: "get_subscriber",
      email,
      success: false,
      duration,
      error: result.error,
    })
    return { success: false, error: result.error }
  }

  if (result.data.length === 0) {
    const error: BeehiivError = {
      error: "NOT_FOUND",
      message: `No subscriber found with email: ${email}`,
      statusCode: 404,
    }
    logBeehiivEvent({
      action: "get_subscriber",
      email,
      success: false,
      duration,
      error,
    })
    return { success: false, error }
  }

  logBeehiivEvent({
    action: "get_subscriber",
    email,
    subscriberId: result.data[0].id,
    success: true,
    duration,
  })

  return { success: true, data: result.data[0] }
}

/**
 * Update subscriber status (e.g., to reactivate)
 */
export async function updateSubscriberStatus(
  subscriberId: string,
  status: "active" | "inactive"
): Promise<BeehiivResult<BeehiivSubscriber>> {
  const startTime = Date.now()
  const publicationId = getPublicationId()

  if (!publicationId) {
    const error: BeehiivError = {
      error: "CONFIG_ERROR",
      message: "Beehiiv publication ID not configured",
      statusCode: 0,
    }
    logBeehiivEvent({
      action: "update_status",
      subscriberId,
      success: false,
      duration: Date.now() - startTime,
      error,
      metadata: { targetStatus: status },
    })
    return { success: false, error }
  }

  const url = `${BEEHIIV_API_BASE}/publications/${publicationId}/subscriptions/${subscriberId}`

  logger.log(`Updating subscriber status: ${subscriberId} -> ${status}`)

  const result = await fetchWithRetry<BeehiivSubscriber>(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({
      unsubscribe: status === "inactive",
    }),
  })

  const duration = Date.now() - startTime

  logBeehiivEvent({
    action: "update_status",
    subscriberId,
    success: result.success,
    duration,
    error: result.success ? undefined : result.error,
    metadata: { targetStatus: status },
  })

  return result
}

/**
 * Check if Beehiiv integration is properly configured and enabled
 */
export function isBeehiivEnabled(): boolean {
  const config = getConfig()
  return config.features.beehiiv
}

/**
 * Gracefully attempt a Beehiiv operation - never throws, always returns a result.
 * Use this wrapper when Beehiiv is non-critical (e.g., in webhooks).
 *
 * @example
 * const result = await safeBeehiivOperation(
 *   () => subscribeUser({ email: 'user@example.com' }),
 *   'subscribe_on_signup'
 * )
 * if (!result.success) {
 *   // Log but don't fail the parent operation
 * }
 */
export async function safeBeehiivOperation<T>(
  operation: () => Promise<BeehiivResult<T>>,
  context: string
): Promise<BeehiivResult<T>> {
  const startTime = Date.now()

  try {
    // Skip entirely if Beehiiv is disabled
    if (!isBeehiivEnabled()) {
      return {
        success: false,
        error: {
          error: "DISABLED",
          message: "Beehiiv integration is disabled",
          statusCode: 0,
        },
      }
    }

    const result = await operation()
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const beehiivError: BeehiivError = {
      error: "UNEXPECTED_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      statusCode: 0,
    }

    logger.error(`Unexpected error in ${context}:`, beehiivError.message)

    // Log to audit in production
    if (getConfig().isProduction) {
      console.error("[BEEHIIV_AUDIT]", JSON.stringify({
        timestamp: new Date().toISOString(),
        service: "beehiiv",
        context,
        success: false,
        duration,
        error: beehiivError,
      }))
    }

    return { success: false, error: beehiivError }
  }
}

/**
 * Initialize Beehiiv integration - call once at app startup.
 * Validates configuration and logs status.
 */
export function initBeehiiv(): void {
  const config = getConfig()

  if (config.features.beehiiv) {
    const validation = validateBeehiivConfig()
    if (validation.valid) {
      logger.log("✅ Beehiiv integration initialized successfully")
    } else {
      logger.error("❌ Beehiiv configuration invalid:", validation.errors.join(", "))
    }
  } else if (config.isDevelopment) {
    console.warn("⚠️  [Beehiiv] Integration disabled. Newsletter features will be skipped.")
  }
}

