# Beehiiv Email Marketing Integration - Implementation Plan

## Executive Summary

This document outlines the strategy and implementation plan for integrating Beehiiv newsletter platform with ResuMate AI to enable automated welcome emails, user engagement sequences, and retention campaigns.

**Priority Level:** 🟡 Medium (Post-launch)
**Estimated Effort:** 2-3 hours for basic integration
**Business Value:** User retention, engagement, and lifecycle marketing

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Integration Strategy](#integration-strategy)
3. [Technical Implementation](#technical-implementation)
4. [Email Sequences](#email-sequences)
5. [Custom Fields & Segmentation](#custom-fields--segmentation)
6. [Compliance & Best Practices](#compliance--best-practices)
7. [Success Metrics](#success-metrics)
8. [Implementation Checklist](#implementation-checklist)

---

## Current State Assessment

### ✅ What We Have

- **Clerk webhook handler** capturing `user.created` events ([`app/api/webhooks/clerk/route.ts`](../app/api/webhooks/clerk/route.ts))
- **User email stored** in database (`users_sync.email`)
- **Onboarding flow tracking** (`onboarding_completed_at` timestamp)
- **Email change functionality** (for account management)

### ❌ What's Missing

- No Beehiiv integration
- No welcome email automation
- No newsletter subscription management
- No email sequences for user engagement
- No lifecycle marketing campaigns

---

## Integration Strategy

### Multi-Trigger Approach

We recommend **3 primary integration points** for maximum engagement:

#### 1. Sign-up Welcome Email (Immediate)
**Trigger:** `user.created` Clerk webhook
**Purpose:** Welcome new users, set expectations, provide quick start guide
**Timing:** Immediate (within 1 minute of signup)

#### 2. Onboarding Completion Email (After first resume upload)
**Trigger:** `onboarding_completed_at` timestamp set
**Purpose:** Congratulate user, suggest next steps, highlight features
**Timing:** Immediate upon onboarding completion

#### 3. Milestone Emails (Engagement-based)
**Triggers:**
- First optimization completed
- 5 optimizations reached
- Upgrade to paid plan
- 30 days of inactivity

**Purpose:** Celebrate achievements, encourage continued usage, reduce churn
**Timing:** Event-driven

---

## Technical Implementation

### Phase 1: Basic Integration (2-3 hours)

#### Step 1: Create Beehiiv Utility Library

**File:** `lib/beehiiv.ts`

```typescript
/**
 * Beehiiv Newsletter Integration
 * Handles subscriber management and welcome emails
 */

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID
const BEEHIIV_API_URL = 'https://api.beehiiv.com/v2'

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

interface BeehiivResponse {
  data: {
    id: string
    email: string
    status: string
    created: number
  }
}

/**
 * Subscribe a user to the Beehiiv newsletter
 *
 * @param email - User's email address
 * @param options - Subscription options (name, source, custom fields)
 * @returns Success status and subscriber ID
 */
export async function subscribeToBeehiiv(
  email: string,
  options: {
    name?: string
    source?: string
    sendWelcome?: boolean
    customFields?: Record<string, string>
  } = {}
): Promise<{ success: boolean; subscriberId?: string; error?: string }> {
  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    console.error('[BEEHIIV] Missing API credentials')
    return { success: false, error: 'Beehiiv not configured' }
  }

  try {
    const customFields: Array<{ name: string; value: string }> = []

    if (options.name) {
      customFields.push({ name: 'name', value: options.name })
    }

    if (options.customFields) {
      Object.entries(options.customFields).forEach(([key, value]) => {
        customFields.push({ name: key, value })
      })
    }

    const payload: BeehiivSubscriber = {
      email,
      reactivate_existing: false,
      send_welcome_email: options.sendWelcome ?? true,
      utm_source: options.source || 'app_signup',
      utm_campaign: 'new_user_welcome',
      utm_medium: 'email',
      custom_fields: customFields.length > 0 ? customFields : undefined,
    }

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[BEEHIIV] Subscription failed:', {
        status: response.status,
        error: errorData,
      })
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      }
    }

    const data: BeehiivResponse = await response.json()

    console.log('[BEEHIIV] User subscribed:', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Redact email for privacy
      subscriber_id: data.data.id,
      status: data.data.status,
    })

    return {
      success: true,
      subscriberId: data.data.id,
    }
  } catch (error: any) {
    console.error('[BEEHIIV] Unexpected error:', error)
    return {
      success: false,
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Unsubscribe a user from Beehiiv newsletter
 *
 * @param email - User's email address
 * @returns Success status
 */
export async function unsubscribeFromBeehiiv(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
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
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      }
    }

    console.log('[BEEHIIV] User unsubscribed:', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
    })

    return { success: true }
  } catch (error: any) {
    console.error('[BEEHIIV] Unsubscribe error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update subscriber custom fields in Beehiiv
 * Use this to track user milestones, subscription status, etc.
 *
 * @param email - User's email address
 * @param customFields - Key-value pairs to update
 * @returns Success status
 */
export async function updateBeehiivSubscriber(
  email: string,
  customFields: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    return { success: false, error: 'Beehiiv not configured' }
  }

  try {
    const fields = Object.entries(customFields).map(([name, value]) => ({
      name,
      value,
    }))

    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${email}`,
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
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      }
    }

    console.log('[BEEHIIV] Subscriber updated:', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      fields: Object.keys(customFields),
    })

    return { success: true }
  } catch (error: any) {
    console.error('[BEEHIIV] Update error:', error)
    return { success: false, error: error.message }
  }
}
```

---

#### Step 2: Update Clerk Webhook Handler

**File:** `app/api/webhooks/clerk/route.ts`

Add Beehiiv subscription on user creation:

```typescript
import { subscribeToBeehiiv } from "@/lib/beehiiv"

// ... existing imports and setup ...

export async function POST(req: NextRequest) {
  // ... existing webhook verification code ...

  if (type === "user.created") {
    const clerkId = data.id as string
    const email = data.email_addresses?.[0]?.email_address ||
                   data.primary_email_address?.email_address || ""
    const name = data.full_name ||
                  [data.first_name, data.last_name].filter(Boolean).join(" ") ||
                  "User"

    // Create user in database
    await createUserFromClerk(clerkId, email, name)

    // 🆕 Subscribe to Beehiiv newsletter
    if (email && process.env.BEEHIIV_ENABLED === 'true') {
      try {
        const result = await subscribeToBeehiiv(email, {
          name,
          source: 'clerk_signup',
          sendWelcome: true,
          customFields: {
            signup_date: new Date().toISOString(),
            user_id: clerkId,
            subscription_plan: 'free', // Default plan
          }
        })

        if (!result.success) {
          console.warn('[CLERK_WEBHOOK] Beehiiv subscription failed:', result.error)
          // Don't fail the webhook - user creation is more important
        } else {
          console.log('[CLERK_WEBHOOK] User subscribed to newsletter:', result.subscriberId)
        }
      } catch (error) {
        // Don't fail webhook if Beehiiv fails
        console.error('[CLERK_WEBHOOK] Beehiiv error (non-blocking):', error)
      }
    }
  }

  // ... rest of webhook handler (user.updated, user.deleted, etc.) ...
}
```

**Key Points:**
- ✅ Non-blocking: User creation succeeds even if Beehiiv fails
- ✅ Conditional: Only runs if `BEEHIIV_ENABLED=true`
- ✅ Logged: All actions logged for debugging
- ✅ Custom fields: Tracks signup date and user ID for segmentation

---

#### Step 3: Add Onboarding Completion Trigger

**File:** `lib/db.ts`

Update the `completeOnboarding` function:

```typescript
import { updateBeehiivSubscriber } from "@/lib/beehiiv"

export async function completeOnboarding(userId: string): Promise<User> {
  const result = await sql`
    UPDATE users_sync
    SET onboarding_completed_at = NOW(),
        updated_at = NOW()
    WHERE clerk_user_id = ${userId} AND deleted_at IS NULL
    RETURNING id, clerk_user_id, email, name, subscription_status,
              subscription_plan, subscription_period_end, stripe_customer_id,
              stripe_subscription_id, onboarding_completed_at, created_at, updated_at
  `

  const user = result[0] as User

  // 🆕 Update Beehiiv with onboarding status
  if (user.email && process.env.BEEHIIV_ENABLED === 'true') {
    try {
      await updateBeehiivSubscriber(user.email, {
        onboarding_completed: 'true',
        onboarding_date: new Date().toISOString(),
        has_uploaded_resume: 'true',
      })

      console.log('[ONBOARDING] Beehiiv subscriber updated with completion status')
    } catch (error) {
      console.error('[ONBOARDING] Beehiiv update failed (non-blocking):', error)
    }
  }

  return user
}
```

---

#### Step 4: Track Optimization Milestones

**File:** `app/api/resumes/optimize/route.ts` (or wherever optimization happens)

```typescript
import { updateBeehiivSubscriber } from "@/lib/beehiiv"

// After successful optimization
const user = await getOrCreateUser(userId)
const optimizationCount = await getOptimizationCount(user.id)

// Update Beehiiv on milestones
if (process.env.BEEHIIV_ENABLED === 'true' && user.email) {
  const milestones = [1, 5, 10, 25, 50]

  if (milestones.includes(optimizationCount)) {
    try {
      await updateBeehiivSubscriber(user.email, {
        total_optimizations: optimizationCount.toString(),
        last_optimization_date: new Date().toISOString(),
        milestone_reached: `${optimizationCount}_optimizations`,
      })
    } catch (error) {
      console.error('[OPTIMIZATION] Beehiiv update failed:', error)
    }
  }
}
```

---

#### Step 5: Environment Variables

**File:** `.env.local` and Vercel environment variables

```bash
# Beehiiv Newsletter Integration
BEEHIIV_ENABLED=true
BEEHIIV_API_KEY=your_beehiiv_api_key_here
BEEHIIV_PUBLICATION_ID=your_publication_id_here
```

**How to get these values:**
1. Go to your Beehiiv dashboard
2. Navigate to **Settings → Integrations → API**
3. Click **Create API Key**
4. Copy the API key
5. Publication ID is in your dashboard URL: `beehiiv.com/dashboard/{publication_id}`

---

### Phase 2: User Preference Management (Optional, 1-2 hours)

#### Step 1: Database Schema Update

```sql
-- Add newsletter preference columns
ALTER TABLE users_sync
ADD COLUMN newsletter_subscribed BOOLEAN DEFAULT true,
ADD COLUMN beehiiv_subscriber_id TEXT,
ADD COLUMN newsletter_subscribed_at TIMESTAMP,
ADD COLUMN newsletter_unsubscribed_at TIMESTAMP;

-- Index for queries
CREATE INDEX idx_users_newsletter ON users_sync(newsletter_subscribed)
WHERE deleted_at IS NULL;
```

---

#### Step 2: Settings Page Component

**File:** `components/settings/email-preferences.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface EmailPreferencesProps {
  user: {
    email: string
    newsletter_subscribed: boolean
  }
}

export function EmailPreferences({ user }: EmailPreferencesProps) {
  const [subscribed, setSubscribed] = useState(user.newsletter_subscribed)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleToggle = async (checked: boolean) => {
    setLoading(true)

    try {
      const response = await fetch('/api/user/newsletter', {
        method: checked ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to update subscription')
      }

      setSubscribed(checked)
      toast({
        title: checked ? 'Subscribed' : 'Unsubscribed',
        description: checked
          ? 'You will receive resume tips and updates'
          : 'You have been unsubscribed from our newsletter',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update newsletter preferences',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
      <div className="flex-1 space-y-1">
        <Label htmlFor="newsletter">Newsletter Subscription</Label>
        <p className="text-sm text-muted-foreground">
          Receive resume tips, job search advice, and product updates
        </p>
      </div>
      <Switch
        id="newsletter"
        checked={subscribed}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  )
}
```

---

#### Step 3: Newsletter Subscription API Endpoint

**File:** `app/api/user/newsletter/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sql, getOrCreateUser } from '@/lib/db'
import { subscribeToBeehiiv, unsubscribeFromBeehiiv } from '@/lib/beehiiv'

/**
 * POST /api/user/newsletter
 * Subscribe to newsletter
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    if (!user || !user.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Subscribe to Beehiiv
    const result = await subscribeToBeehiiv(user.email, {
      name: user.name,
      source: 'settings_page',
      sendWelcome: false, // Don't send welcome again
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to subscribe' },
        { status: 500 }
      )
    }

    // Update database
    await sql`
      UPDATE users_sync
      SET newsletter_subscribed = true,
          beehiiv_subscriber_id = ${result.subscriberId},
          newsletter_subscribed_at = NOW(),
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    return NextResponse.json({ success: true, message: 'Subscribed to newsletter' })
  } catch (error: any) {
    console.error('[NEWSLETTER_SUBSCRIBE] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user/newsletter
 * Unsubscribe from newsletter
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    if (!user || !user.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Unsubscribe from Beehiiv
    const result = await unsubscribeFromBeehiiv(user.email)

    if (!result.success) {
      console.warn('[NEWSLETTER_UNSUBSCRIBE] Beehiiv failed but continuing:', result.error)
      // Continue anyway - update our DB even if Beehiiv fails
    }

    // Update database
    await sql`
      UPDATE users_sync
      SET newsletter_subscribed = false,
          newsletter_unsubscribed_at = NOW(),
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    return NextResponse.json({ success: true, message: 'Unsubscribed from newsletter' })
  } catch (error: any) {
    console.error('[NEWSLETTER_UNSUBSCRIBE] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Email Sequences

Create these automated email sequences in your Beehiiv dashboard:

### 1. Welcome Sequence (Triggered on signup)

**Email 1: Welcome (Day 0 - Immediate)**
- **Subject:** Welcome to ResuMate AI - Your Resume Optimizer
- **Content:**
  - Personal welcome
  - What to expect
  - Quick start: "Upload your first resume in 2 minutes"
  - Link to dashboard
  - Support email

**Email 2: Getting Started (Day 2)**
- **Subject:** How to upload your first resume
- **Content:**
  - Step-by-step guide with screenshots
  - Video tutorial (if available)
  - Common mistakes to avoid
  - CTA: "Upload Resume Now"

**Email 3: Best Practices (Day 5)**
- **Subject:** 5 Resume Optimization Tips from Industry Experts
- **Content:**
  - CAR format explanation
  - Keyword optimization tips
  - ATS-friendly formatting
  - Real example transformations
  - CTA: "Optimize Your Resume"

**Email 4: Upgrade Invitation (Day 7)**
- **Subject:** Ready to unlock unlimited optimizations?
- **Content:**
  - Comparison: Free vs Pro
  - Success stories from Pro users
  - Limited-time discount code (optional)
  - CTA: "Upgrade to Pro"

---

### 2. Engagement Sequence (Triggered after onboarding)

**Email 1: Congratulations (Day 0 - Immediate)**
- **Subject:** You completed your profile! Here's what's next
- **Content:**
  - Celebrate milestone
  - Suggest analyzing a job posting
  - Highlight evidence-based matching feature
  - CTA: "Find Your Perfect Job Match"

**Email 2: Tips & Tricks (Day 3)**
- **Subject:** 3 tips for getting more interview calls
- **Content:**
  - Customize for each job
  - Use industry keywords
  - Quantify achievements
  - CTA: "Optimize for Your Next Job"

**Email 3: Case Study (Day 7)**
- **Subject:** How Sarah landed 3 interviews in 1 week
- **Content:**
  - Real user success story
  - Before/after resume examples
  - Key strategies used
  - CTA: "Read Full Story"

---

### 3. Upgrade Nurture (For free users - Weekly)

**Email 1: Feature Spotlight**
- **Subject:** Did you know Pro users get unlimited optimizations?
- **Content:**
  - Highlight Pro-only features
  - Show ROI (time saved, better results)
  - Testimonials

**Email 2: Success Stories**
- **Subject:** Meet John: From 0 to 5 interviews with ResuMate Pro
- **Content:**
  - Detailed case study
  - Metrics and results
  - "Pro features that made the difference"

**Email 3: Limited Offer**
- **Subject:** 20% off Pro - Expires in 48 hours
- **Content:**
  - Urgency-driven
  - Clear value proposition
  - Discount code
  - FAQ

---

### 4. Re-engagement Sequence (For inactive users)

**Email 1: Day 14 of Inactivity**
- **Subject:** We haven't seen you in a while
- **Content:**
  - Friendly check-in
  - "Need help getting started?"
  - Link to support/tutorials
  - CTA: "Continue Your Job Search"

**Email 2: Day 30 of Inactivity**
- **Subject:** New features you might have missed
- **Content:**
  - List recent feature updates
  - Improved AI accuracy
  - New templates/exports
  - CTA: "Check Out What's New"

**Email 3: Day 60 of Inactivity**
- **Subject:** We miss you - here's 20% off Pro
- **Content:**
  - Last-chance tone
  - Special comeback offer
  - "Your account is still active"
  - CTA: "Claim Your Discount"

---

## Custom Fields & Segmentation

### Recommended Custom Fields

Send these fields to Beehiiv for powerful segmentation:

```typescript
{
  // User Identity
  user_id: string,              // Internal database ID
  clerk_user_id: string,        // Clerk authentication ID
  name: string,                 // User's full name

  // Timestamps
  signup_date: string,          // ISO 8601 format
  onboarding_completed: string, // 'true' or 'false'
  onboarding_date: string,      // ISO 8601 format
  last_login_date: string,      // ISO 8601 format

  // Subscription & Billing
  subscription_plan: string,    // 'free', 'pro', 'enterprise'
  subscription_status: string,  // 'active', 'canceled', 'trialing'
  subscription_start_date: string,
  subscription_end_date: string,

  // Usage Metrics
  total_optimizations: string,  // Numeric string
  total_job_analyses: string,   // Numeric string
  last_optimization_date: string,
  has_uploaded_resume: string,  // 'true' or 'false'
  has_paid: string,            // 'true' or 'false'

  // Milestones
  milestone_reached: string,    // '1_optimization', '5_optimizations', etc.

  // Acquisition
  referral_source: string,      // 'organic', 'paid', 'referral', 'social'
  utm_source: string,
  utm_campaign: string,

  // User Profile (if collected)
  industry: string,
  job_level: string,           // 'entry', 'mid', 'senior', 'executive'
  target_role: string,
}
```

### Segmentation Examples

Use these custom fields to create targeted email campaigns:

1. **Free users who completed onboarding but haven't optimized**
   - Filter: `onboarding_completed = true AND total_optimizations = 0`
   - Message: "You're 1 click away from a better resume"

2. **Free users approaching limit (2/3 optimizations used)**
   - Filter: `subscription_plan = free AND total_optimizations >= 2`
   - Message: "You've used 2/3 free optimizations. Upgrade for unlimited?"

3. **Pro users with high engagement (10+ optimizations)**
   - Filter: `subscription_plan = pro AND total_optimizations >= 10`
   - Message: "You're crushing it! Share your success story?"

4. **Inactive Pro subscribers (no login in 30 days)**
   - Filter: `subscription_plan = pro AND last_login_date < 30_days_ago`
   - Message: "Your Pro subscription is active but unused. Need help?"

5. **Users who abandoned after 1 optimization**
   - Filter: `total_optimizations = 1 AND last_optimization_date < 14_days_ago`
   - Message: "How did your job application go? Need another resume?"

---

## Compliance & Best Practices

### GDPR & CAN-SPAM Compliance

#### 1. Explicit Consent (Recommended)

Add checkbox to signup form:

```tsx
// components/auth/signup-form.tsx
<div className="flex items-center space-x-2">
  <Checkbox
    id="newsletter"
    name="newsletter"
    defaultChecked={true}
  />
  <label htmlFor="newsletter" className="text-sm">
    I want to receive resume tips, job search advice, and product updates
  </label>
</div>
```

#### 2. Store Consent Timestamp

```typescript
// Track when user consented
await sql`
  UPDATE users_sync
  SET newsletter_subscribed = true,
      newsletter_subscribed_at = NOW()
  WHERE id = ${user.id}
`
```

#### 3. Easy Unsubscribe

- ✅ Beehiiv automatically adds unsubscribe links to all emails
- ✅ Provide manual unsubscribe in settings
- ✅ Process unsubscribe requests within 10 business days

#### 4. Privacy Policy

Update your privacy policy to include:
- "We use Beehiiv to send marketing emails"
- "You can unsubscribe anytime"
- "We don't sell your email to third parties"
- Link to Beehiiv's privacy policy

---

### Error Handling Best Practices

#### 1. Non-Blocking Integration

**DO:** Let user signup succeed even if Beehiiv fails

```typescript
try {
  await subscribeToBeehiiv(email)
} catch (error) {
  console.error('Beehiiv failed but continuing:', error)
  // User signup still succeeds
}
```

**DON'T:** Fail user creation if Beehiiv is down

```typescript
// ❌ BAD
await subscribeToBeehiiv(email) // Throws error, blocks signup
```

#### 2. Retry Logic (Advanced)

For production, consider a retry queue:

```typescript
// lib/email-queue.ts
export async function queueNewsletterSubscription(email: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const result = await subscribeToBeehiiv(email)
    if (result.success) return result

    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
  }

  // Log failure for manual review
  console.error('[EMAIL_QUEUE] Failed after retries:', email)
}
```

#### 3. Graceful Degradation

```typescript
// Check if Beehiiv is configured before attempting
if (!process.env.BEEHIIV_API_KEY) {
  console.warn('[BEEHIIV] Not configured, skipping subscription')
  return { success: false, error: 'Not configured' }
}
```

---

### Rate Limiting

Beehiiv API limits (as of 2025):

- **Launch (Free):** Up to 2,500 subscribers, API access included
- **Grow:** Up to 10,000 subscribers
- **Scale:** 100,000+ subscribers
- **Rate limits:** Not publicly documented, but generally generous for typical use

**Best practice:** Implement client-side rate limiting if sending batch updates:

```typescript
// lib/beehiiv.ts
import { RateLimiter } from 'limiter'

// 100 requests per minute
const limiter = new RateLimiter({ tokensPerInterval: 100, interval: 'minute' })

export async function subscribeToBeehiiv(email: string) {
  await limiter.removeTokens(1) // Wait if rate limit exceeded
  // ... rest of function
}
```

---

## Success Metrics

### Key Performance Indicators (KPIs)

Track these metrics in Beehiiv dashboard:

#### 1. Subscription Metrics
- **Subscription Rate:** % of signups who opt-in to newsletter
  - **Target:** >80% (with pre-checked checkbox)
  - **Target:** >40% (with unchecked checkbox)
- **Unsubscribe Rate:** % of subscribers who unsubscribe
  - **Target:** <2% per month
  - **Benchmark:** 0.5-1% is excellent

#### 2. Engagement Metrics
- **Open Rate:** % of emails opened
  - **Target:** >20% (cold audience)
  - **Target:** >30% (warm audience)
  - **Target:** >40% (engaged users)
- **Click-Through Rate (CTR):** % of recipients who click links
  - **Target:** >2.5% overall
  - **Target:** >5% for call-to-action emails
- **Click-to-Open Rate (CTOR):** % of openers who click
  - **Target:** >10%

#### 3. Business Metrics
- **Email → Paid Conversion Rate:** % of free users who upgrade via email
  - **Target:** >2% (welcome sequence)
  - **Target:** >5% (upgrade nurture sequence)
- **Revenue per Email:** Total revenue / emails sent
  - Track for each sequence type
  - Optimize high-performing sequences

#### 4. Deliverability Metrics
- **Delivery Rate:** % of emails successfully delivered
  - **Target:** >95%
- **Bounce Rate:** % of emails that bounce
  - **Target:** <5%
- **Spam Complaint Rate:** % of recipients marking as spam
  - **Target:** <0.1%

---

### A/B Testing Ideas

Test these variables to optimize performance:

1. **Subject Lines**
   - Question vs statement
   - Emoji vs no emoji
   - Personalization (name) vs generic
   - Length (short vs long)

2. **Send Times**
   - Morning (8-10am) vs afternoon (2-4pm) vs evening (7-9pm)
   - Weekday vs weekend
   - User's timezone vs fixed timezone

3. **Content Format**
   - Plain text vs HTML
   - Short (200 words) vs long (500+ words)
   - Image-heavy vs text-heavy
   - CTA button vs text link

4. **Call-to-Action (CTA)**
   - Button color and text
   - Single CTA vs multiple CTAs
   - Position (top, middle, bottom)

---

## Implementation Checklist

### Pre-Implementation

- [ ] Create Beehiiv account (free Launch plan supports 2,500 subscribers)
- [ ] Verify account and set up publication
- [ ] Get API key from Settings → Integrations → API
- [ ] Get Publication ID from dashboard URL
- [ ] Plan email sequences (at minimum: welcome email)
- [ ] Write copy for welcome email
- [ ] Design email template in Beehiiv

### Phase 1: Basic Integration (2-3 hours)

- [ ] Create `lib/beehiiv.ts` utility file
- [ ] Add environment variables to `.env.local`
  - [ ] `BEEHIIV_ENABLED=true`
  - [ ] `BEEHIIV_API_KEY=your_key`
  - [ ] `BEEHIIV_PUBLICATION_ID=your_id`
- [ ] Update Clerk webhook handler (`app/api/webhooks/clerk/route.ts`)
- [ ] Update onboarding completion function (`lib/db.ts`)
- [ ] Test with new signup (use temporary email service)
- [ ] Verify email received in Beehiiv dashboard
- [ ] Check subscriber custom fields populated correctly

### Phase 2: Email Sequences (1-2 hours)

- [ ] Create welcome sequence in Beehiiv dashboard
  - [ ] Email 1: Welcome (Day 0)
  - [ ] Email 2: Getting Started (Day 2)
  - [ ] Email 3: Best Practices (Day 5)
  - [ ] Email 4: Upgrade Invitation (Day 7)
- [ ] Create onboarding completion email
- [ ] Set up automations/triggers in Beehiiv
- [ ] Test sequences with test subscribers

### Phase 3: User Preferences (Optional, 1-2 hours)

- [ ] Add database columns for newsletter preferences
  ```sql
  ALTER TABLE users_sync
  ADD COLUMN newsletter_subscribed BOOLEAN DEFAULT true,
  ADD COLUMN beehiiv_subscriber_id TEXT,
  ADD COLUMN newsletter_subscribed_at TIMESTAMP,
  ADD COLUMN newsletter_unsubscribed_at TIMESTAMP;
  ```
- [ ] Create newsletter subscription API endpoint (`app/api/user/newsletter/route.ts`)
- [ ] Create email preferences UI component (`components/settings/email-preferences.tsx`)
- [ ] Add email preferences to settings page
- [ ] Test subscribe/unsubscribe flow

### Phase 4: Advanced Features (Optional, 2-3 hours)

- [ ] Add milestone tracking (first optimization, 5 optimizations, etc.)
- [ ] Create re-engagement sequences for inactive users
- [ ] Set up custom field syncing for subscription changes
- [ ] Implement retry logic for failed subscriptions
- [ ] Add newsletter signup checkbox to registration form (if not using auto-opt-in)

### Production Deployment

- [ ] Add environment variables to Vercel (or hosting platform)
  - [ ] `BEEHIIV_ENABLED=true`
  - [ ] `BEEHIIV_API_KEY` (production key)
  - [ ] `BEEHIIV_PUBLICATION_ID`
- [ ] Run database migrations in production
- [ ] Test with real signup in production
- [ ] Monitor logs for errors
- [ ] Check Beehiiv dashboard for subscriber activity

### Post-Launch Monitoring (Week 1)

- [ ] Track subscription rate (target: >80%)
- [ ] Monitor welcome email open rate (target: >30%)
- [ ] Check for unsubscribes (target: <2%)
- [ ] Review error logs for failed subscriptions
- [ ] Verify custom fields syncing correctly
- [ ] Test unsubscribe flow from email

### Optimization (Weeks 2-4)

- [ ] A/B test subject lines
- [ ] Analyze email performance by sequence
- [ ] Identify high-performing content
- [ ] Segment users for targeted campaigns
- [ ] Create additional sequences based on user behavior
- [ ] Set up re-engagement campaigns for inactive users

---

## Timeline & Priority

### Recommended Approach

**Priority Level:** 🟡 **Medium** (Post-launch)

**Why not critical:**
- Doesn't block core product functionality
- Email marketing is important for retention, not acquisition
- Can be added after launch without disrupting users
- No technical dependencies on other features

**Suggested Timeline:**

| Phase | Timing | Effort | Why |
|-------|--------|--------|-----|
| **Pre-launch** | Skip | 0 hours | Focus on critical blockers (usage tracking, React hooks, evidence UI) |
| **Week 1 after launch** | Skip | 0 hours | Monitor core product, fix bugs, ensure stability |
| **Week 2 after launch** | Implement Phase 1 | 2-3 hours | Basic integration with welcome email |
| **Week 3 after launch** | Implement Phase 2 | 1-2 hours | Email sequences and automation |
| **Week 4+ after launch** | Implement Phase 3-4 | 3-5 hours | User preferences and advanced features |

---

## Quick Win Strategy

If you want to start building your email list **immediately** with minimal effort:

### Minimal Viable Integration (1 hour)

1. **Create Beehiiv account** (10 min)
2. **Get API credentials** (5 min)
3. **Add 10 lines to Clerk webhook** (15 min)
4. **Write 1 welcome email in Beehiiv** (20 min)
5. **Test with signup** (10 min)

**Result:** Every new user automatically receives a welcome email and joins your list.

**Benefits:**
- Start building email list from day 1
- Zero ongoing maintenance
- Foundation for future campaigns
- User engagement boost

---

## Support & Resources

### Beehiiv Documentation
- **API Docs:** https://developers.beehiiv.com/
- **Dashboard:** https://www.beehiiv.com/dashboard
- **Support:** support@beehiiv.com

### Internal Files
- **Utility:** [`lib/beehiiv.ts`](../lib/beehiiv.ts)
- **Webhook Handler:** [`app/api/webhooks/clerk/route.ts`](../app/api/webhooks/clerk/route.ts)
- **Database Functions:** [`lib/db.ts`](../lib/db.ts)
- **Settings Component:** [`components/settings/email-preferences.tsx`](../components/settings/email-preferences.tsx)

### Troubleshooting

**Issue:** Subscribers not appearing in Beehiiv
- Check API key is correct
- Verify Publication ID matches your account
- Check logs for error messages
- Ensure `BEEHIIV_ENABLED=true`

**Issue:** Welcome email not sending
- Check "send_welcome_email" parameter is `true`
- Verify email automation is active in Beehiiv dashboard
- Check email isn't in spam folder

**Issue:** Custom fields not syncing
- Verify field names match exactly (case-sensitive)
- Check Beehiiv dashboard for field definitions
- Ensure fields are created before syncing data

---

## Next Steps

1. **Decision:** Do you want to implement Beehiiv integration now or post-launch?
2. **If now:** Start with Phase 1 (basic integration) - 2-3 hours
3. **If post-launch:** Add to post-launch roadmap after critical blockers resolved

**Questions to consider:**
- Do you have email copy ready for welcome sequence?
- What custom fields are most important for segmentation?
- Do you want auto-opt-in (pre-checked) or explicit opt-in?
- Should newsletter preference be in onboarding or settings?

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Status:** Ready for implementation
**Estimated Total Effort:** 6-8 hours (all phases)
