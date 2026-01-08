---
name: Beehiiv Email Integration
overview: Integrate Beehiiv for automated email marketing by subscribing users on signup via the existing Clerk webhook, respecting newsletter consent, and providing subscriber management capabilities.
todos:
  - id: phase1a-beehiiv-client
    content: "[Phase 1A] Create lib/beehiiv.ts with API client and type definitions"
    status: completed
  - id: phase1b-env-config
    content: "[Phase 1B] Add BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID env vars"
    status: completed
  - id: phase2a-webhook-integration
    content: "[Phase 2A] Extend Clerk webhook to call Beehiiv on user.created"
    status: completed
    dependencies:
      - phase1a-beehiiv-client
      - phase1b-env-config
  - id: phase2b-email-updates
    content: "[Phase 2B] Handle email updates in user.updated webhook event"
    status: completed
    dependencies:
      - phase2a-webhook-integration
  - id: phase3a-db-tracking
    content: "[Phase 3A] Add beehiiv_subscriber_id column to users_sync (optional)"
    status: completed
    dependencies:
      - phase2a-webhook-integration
  - id: phase3b-unsubscribe-endpoint
    content: "[Phase 3B] Create API endpoint for user-initiated unsubscribe"
    status: completed
    dependencies:
      - phase2a-webhook-integration
  - id: phase3c-retry-logic
    content: "[Phase 3C] Add retry mechanism with exponential backoff"
    status: completed
    dependencies:
      - phase2a-webhook-integration
  - id: phase4a-logging
    content: "[Phase 4A] Add structured logging for Beehiiv operations"
    status: completed
    dependencies:
      - phase3c-retry-logic
  - id: phase4b-error-handling
    content: "[Phase 4B] Implement graceful degradation and error alerts"
    status: completed
    dependencies:
      - phase4a-logging
---

# Beehiiv Email Integration Plan

## Architecture

```mermaid
sequenceDiagram
    participant User
    participant Clerk
    participant ClerkWebhook as Clerk Webhook
    participant BeehiivClient as Beehiiv Client
    participant Beehiiv as Beehiiv API
    participant DB as Supabase DB

    User->>Clerk: Sign up (with newsletter_consent)
    Clerk->>ClerkWebhook: user.created event
    ClerkWebhook->>DB: createUserFromClerk()
    ClerkWebhook->>BeehiivClient: subscribeUser(email, name, consent)
    BeehiivClient->>Beehiiv: POST /publications/{id}/subscriptions
    Beehiiv-->>BeehiivClient: subscriber_id
    BeehiivClient-->>ClerkWebhook: success/failure
    ClerkWebhook->>DB: Update beehiiv_subscriber_id (optional)
```



## Key Files to Modify/Create

| File | Action ||------|--------|| [`lib/beehiiv.ts`](lib/beehiiv.ts) | Create - API client || [`app/api/webhooks/clerk/route.ts`](app/api/webhooks/clerk/route.ts) | Modify - Add Beehiiv call || `.env.local` | Add - `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID` |---

## Phase 1: Infrastructure Setup (Parallelizable)

### 1A. Create Beehiiv API Client

Create `lib/beehiiv.ts` with:

- Type definitions for Beehiiv subscriber API
- `subscribeUser(email, firstName, lastName, utmSource?)` function
- `unsubscribeUser(email | subscriberId)` function
- Error handling with typed responses

### 1B. Environment Configuration

- Add `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID` to `.env.local`
- Add to `lib/env.ts` validation if it exists
- Document required Beehiiv API permissions (needs write access to subscribers)

---

## Phase 2: Core Webhook Integration (Sequential, depends on Phase 1)

### 2A. Extend Clerk Webhook

Modify [`app/api/webhooks/clerk/route.ts`](app/api/webhooks/clerk/route.ts):

```typescript
if (type === "user.created") {
  // ... existing user creation code ...
  
  // Add Beehiiv subscription
  const newsletterConsent = data.unsafe_metadata?.newsletter_consent
  if (newsletterConsent) {
    await subscribeToBeehiiv({
      email,
      firstName: data.first_name,
      lastName: data.last_name,
      utmSource: 'app_signup'
    })
  }
}
```



### 2B. Handle Email Updates

When `user.updated` fires with a new email, update Beehiiv subscriber.---

## Phase 3: Enhanced Features (Parallelizable, depends on Phase 2)

### 3A. Database Tracking (Optional)

Add `beehiiv_subscriber_id` column to `users_sync` table for:

- Faster unsubscribe operations
- Tracking subscription status locally

### 3B. Unsubscribe API Endpoint

Create `app/api/beehiiv/unsubscribe/route.ts`:

- Authenticated endpoint for users to unsubscribe
- Called from user settings page

### 3C. Retry Logic

Add retry mechanism in `lib/beehiiv.ts` for transient failures:

- 3 retries with exponential backoff
- Log failures to `clerk_webhook_events` table

---

## Phase 4: Testing and Monitoring (Sequential, depends on Phase 3)

### 4A. Logging

- Add structured logging for Beehiiv API calls
- Log subscriber creation success/failure to existing audit table

### 4B. Error Alerts

- Add console warnings for missing API keys in dev
- Graceful degradation if Beehiiv is unavailable

---

## Environment Variables Required

```bash
BEEHIIV_API_KEY=your_api_key_here
BEEHIIV_PUBLICATION_ID=pub_xxxxxxxx
```