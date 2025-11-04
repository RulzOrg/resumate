/**
 * Beehiiv Newsletter Integration
 * Handles adding subscribers to Beehiiv publication
 */

interface BeehiivSubscriberData {
  email: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  referring_site?: string;
  custom_fields?: Record<string, string>;
}

interface BeehiivResponse {
  success: boolean;
  data?: {
    id: string;
    email: string;
    status: string;
  };
  error?: string;
}

/**
 * Add a subscriber to Beehiiv publication
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
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    console.warn('[Beehiiv] API key or publication ID not configured');
    return {
      success: false,
      error: 'Beehiiv not configured',
    };
  }

  try {
    const subscriberData: BeehiivSubscriberData = {
      email,
      utm_source: metadata?.utmSource || 'resume-builder',
      utm_campaign: metadata?.utmCampaign || 'lead-magnet',
      utm_medium: metadata?.utmMedium || 'web',
      custom_fields: metadata?.customFields,
    };

    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(subscriberData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Beehiiv] Failed to add subscriber:', errorData);

      // Don't fail the entire flow if newsletter signup fails
      return {
        success: false,
        error: errorData.message || 'Failed to add subscriber',
      };
    }

    const data = await response.json();
    console.log('[Beehiiv] Successfully added subscriber:', email);

    return {
      success: true,
      data: {
        id: data.data?.id || '',
        email: data.data?.email || email,
        status: data.data?.status || 'subscribed',
      },
    };
  } catch (error) {
    console.error('[Beehiiv] Error adding subscriber:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unsubscribe an email from Beehiiv publication
 * @param email - Subscriber email address
 * @returns Promise with success status
 */
export async function removeBeehiivSubscriber(
  email: string
): Promise<BeehiivResponse> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    console.warn('[Beehiiv] API key or publication ID not configured');
    return {
      success: false,
      error: 'Beehiiv not configured',
    };
  }

  try {
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ email }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Beehiiv] Failed to remove subscriber:', errorData);
      return {
        success: false,
        error: errorData.message || 'Failed to remove subscriber',
      };
    }

    console.log('[Beehiiv] Successfully removed subscriber:', email);
    return { success: true };
  } catch (error) {
    console.error('[Beehiiv] Error removing subscriber:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
