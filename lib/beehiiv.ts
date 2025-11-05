/**
 * Beehiiv Newsletter Integration
 *
 * This module handles all interactions with the Beehiiv API for newsletter
 * subscription management. All functions are non-blocking and return success
 * status to avoid disrupting user flows if Beehiiv is unavailable.
 *
 * @see https://developers.beehiiv.com/
 */

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID
const BEEHIIV_API_URL = 'https://api.beehiiv.com/v2'
const BEEHIIV_ENABLED = process.env.BEEHIIV_ENABLED !== 'false' // Default to enabled if not explicitly disabled

interface BeehiivSubscriber {
  email: string
  reactivate_existing?: boolean
  send_welcome_email?: boolean
  utm_source?: string
  utm_campaign?: string
  utm_medium?: string
  referring_site?: string
  custom_fields?: Array<{
    name: string
    value: string
  }>
}

interface BeehiivResponseData {
  data: {
    id: string
    email: string
    status: string
    created: number
  }
}

interface BeehiivResponse {
  success: boolean
  subscriberId?: string
  error?: string
  data?: {
    id: string
    email: string
    status: string
  }
}

/**
 * Redact email for logging (GDPR/privacy compliance)
 * Example: john.doe@example.com → jo***@example.com
 */
function redactEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const redacted = local.length > 2
    ? `${local.slice(0, 2)}***`
    : `${local[0]}***`
  return `${redacted}@${domain}`
}

/**
 * Subscribe a user to the Beehiiv newsletter
 *
 * @param email - User's email address
 * @param options - Subscription options (name, source, custom fields)
 * @returns Promise with success status and subscriber ID
 *
 * @example
 * ```ts
 * const result = await subscribeToBeehiiv('user@example.com', {
 *   name: 'John Doe',
 *   source: 'clerk_signup',
 *   sendWelcome: true,
 *   customFields: {
 *     signup_date: new Date().toISOString(),
 *     subscription_plan: 'free'
 *   }
 * })
 *
 * if (result.success) {
 *   console.log('User subscribed:', result.subscriberId)
 * }
 * ```
 */
export async function subscribeToBeehiiv(
  email: string,
  options: {
    name?: string
    source?: string
    campaign?: string
    medium?: string
    sendWelcome?: boolean
    customFields?: Record<string, string>
  } = {}
): Promise<BeehiivResponse> {
  // Check if Beehiiv is enabled
  if (!BEEHIIV_ENABLED) {
    console.log('[BEEHIIV] Integration disabled via BEEHIIV_ENABLED flag')
    return { success: false, error: 'Beehiiv integration disabled' }
  }

  // Check if API credentials are configured
  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    console.warn('[BEEHIIV] Missing API credentials', {
      has_api_key: Boolean(BEEHIIV_API_KEY),
      has_publication_id: Boolean(BEEHIIV_PUBLICATION_ID),
    })
    return { success: false, error: 'Beehiiv not configured' }
  }

  try {
    // Build custom fields array
    const customFields: Array<{ name: string; value: string }> = []

    if (options.name) {
      customFields.push({ name: 'name', value: options.name })
    }

    if (options.customFields) {
      Object.entries(options.customFields).forEach(([key, value]) => {
        customFields.push({ name: key, value })
      })
    }

    // Build request payload
    const payload: BeehiivSubscriber = {
      email,
      reactivate_existing: false,
      send_welcome_email: options.sendWelcome ?? true,
      utm_source: options.source || 'app_signup',
      utm_campaign: options.campaign || 'new_user_welcome',
      utm_medium: options.medium || 'email',
    }

    // Only add custom fields if there are any
    if (customFields.length > 0) {
      payload.custom_fields = customFields
    }

    // Make API request
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify(payload),
      }
    )

    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[BEEHIIV] Subscription failed:', {
        status: response.status,
        status_text: response.statusText,
        error: errorData,
        email: redactEmail(email),
      })
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    // Parse successful response
    const responseData: BeehiivResponseData = await response.json()

    console.log('[BEEHIIV] User subscribed successfully:', {
      email: redactEmail(email),
      subscriber_id: responseData.data.id,
      status: responseData.data.status,
      timestamp: new Date().toISOString(),
    })

    return {
      success: true,
      subscriberId: responseData.data.id,
      data: {
        id: responseData.data.id,
        email: responseData.data.email,
        status: responseData.data.status,
      }
    }
  } catch (error: any) {
    console.error('[BEEHIIV] Unexpected error during subscription:', {
      email: redactEmail(email),
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })
    return {
      success: false,
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Add a subscriber to Beehiiv publication (legacy compatibility wrapper)
 * This function maintains backward compatibility with existing code
 * @param email - Subscriber email address
 * @param metadata - Additional metadata for subscriber
 * @returns Promise with success status
 */
export async function addBeehiivSubscriber(
  email: string,
  metadata?: {
    utmSource?: string;
    utmCampaign?: string;
    utmMedium?: string;
    customFields?: Record<string, string>;
  }
): Promise<BeehiivResponse> {
  return subscribeToBeehiiv(email, {
    source: metadata?.utmSource || 'resume-builder',
    campaign: metadata?.utmCampaign || 'lead-magnet',
    medium: metadata?.utmMedium || 'web',
    customFields: metadata?.customFields,
    sendWelcome: true,
  })
}

/**
 * Unsubscribe a user from the Beehiiv newsletter
 *
 * @param email - User's email address
 * @returns Promise with success status
 *
 * @example
 * ```ts
 * const result = await unsubscribeFromBeehiiv('user@example.com')
 * if (result.success) {
 *   console.log('User unsubscribed')
 * }
 * ```
 */
export async function unsubscribeFromBeehiiv(
  email: string
): Promise<BeehiivResponse> {
  if (!BEEHIIV_ENABLED) {
    return { success: false, error: 'Beehiiv integration disabled' }
  }

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    console.warn('[BEEHIIV] API key or publication ID not configured')
    return { success: false, error: 'Beehiiv not configured' }
  }

  try {
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({ email }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[BEEHIIV] Unsubscribe failed:', {
        status: response.status,
        error: errorData,
        email: redactEmail(email),
      })
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      }
    }

    console.log('[BEEHIIV] User unsubscribed successfully:', {
      email: redactEmail(email),
      timestamp: new Date().toISOString(),
    })

    return { success: true }
  } catch (error: any) {
    console.error('[BEEHIIV] Unsubscribe error:', {
      email: redactEmail(email),
      error: error.message,
      timestamp: new Date().toISOString(),
    })
    return { success: false, error: error.message }
  }
}

/**
 * Remove Beehiiv subscriber (legacy compatibility wrapper)
 * This function maintains backward compatibility with existing code
 * @param email - Subscriber email address
 * @returns Promise with success status
 */
export async function removeBeehiivSubscriber(
  email: string
): Promise<BeehiivResponse> {
  return unsubscribeFromBeehiiv(email)
}

/**
 * Update subscriber custom fields in Beehiiv
 * Use this to track user milestones, subscription status changes, etc.
 *
 * @param email - User's email address
 * @param customFields - Key-value pairs to update
 * @returns Promise with success status
 *
 * @example
 * ```ts
 * const result = await updateBeehiivSubscriber('user@example.com', {
 *   onboarding_completed: 'true',
 *   onboarding_date: new Date().toISOString(),
 *   total_optimizations: '5'
 * })
 * ```
 */
export async function updateBeehiivSubscriber(
  email: string,
  customFields: Record<string, string>
): Promise<BeehiivResponse> {
  if (!BEEHIIV_ENABLED) {
    return { success: false, error: 'Beehiiv integration disabled' }
  }

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    return { success: false, error: 'Beehiiv not configured' }
  }

  try {
    const fields = Object.entries(customFields).map(([name, value]) => ({
      name,
      value,
    }))

    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({ custom_fields: fields }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[BEEHIIV] Update subscriber failed:', {
        status: response.status,
        error: errorData,
        email: redactEmail(email),
        fields: Object.keys(customFields),
      })
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      }
    }

    console.log('[BEEHIIV] Subscriber updated successfully:', {
      email: redactEmail(email),
      fields: Object.keys(customFields),
      timestamp: new Date().toISOString(),
    })

    return { success: true }
  } catch (error: any) {
    console.error('[BEEHIIV] Update subscriber error:', {
      email: redactEmail(email),
      error: error.message,
      timestamp: new Date().toISOString(),
    })
    return { success: false, error: error.message }
  }
}