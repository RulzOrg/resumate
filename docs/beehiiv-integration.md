# Beehiiv Newsletter Integration

## Overview

The Beehiiv integration automatically subscribes users to your newsletter when they sign up and consent to receive emails. The integration is fully implemented and production-ready with graceful error handling.

## Features

✅ **Automatic Subscription** - Users are subscribed when they sign up with `newsletter_consent: true`  
✅ **Email Updates** - When users change their email, Beehiiv subscription is updated  
✅ **Subscriber ID Tracking** - Stores Beehiiv subscriber IDs for faster operations  
✅ **Graceful Degradation** - Webhook never fails if Beehiiv is down  
✅ **Retry Logic** - 3 automatic retries with exponential backoff  
✅ **Structured Logging** - Full audit trail of all operations  

## Architecture

```
User Signup (Clerk)
    ↓
Clerk Webhook (user.created)
    ↓
Create User in Database
    ↓
Check newsletter_consent → Beehiiv API
    ↓
Store subscriber_id in users_sync table
```

## Configuration

### Environment Variables

Add these to your `.env.local`:

```bash
# Required to enable integration
BEEHIIV_ENABLED=true
BEEHIIV_API_KEY=your_api_key_here
BEEHIIV_PUBLICATION_ID=pub_xxxxxxxx
```

### Database Setup

The `beehiiv_subscriber_id` column is already in the schema. Run the migration if needed:

```bash
psql "$DATABASE_URL" < scripts/add-beehiiv-subscriber-id.sql
```

## How It Works

### 1. User Sign Up

When a user signs up via Clerk, the webhook automatically:

1. Creates the user in your database
2. **Automatically subscribes ALL users to Beehiiv** with:
   - UTM Source: `useresumate`
   - UTM Medium: `platform`
   - UTM Campaign: `user_signup`
   - First name (if provided)
3. Stores the Beehiiv `subscriber_id` for future operations

**Note**: All users are subscribed by default. They can unsubscribe later from Settings → Preferences.

### 2. Email Updates

When a user changes their email in Clerk:

1. Webhook detects the email change
2. Looks up existing Beehiiv subscription
3. Unsubscribes the old email
4. Subscribes the new email
5. Updates the stored `subscriber_id`

### 3. User Deletion

When a user deletes their account:
- User is removed from your database
- Beehiiv subscription remains (users can unsubscribe via email)

### 4. User Settings

Users can manage their newsletter subscription from **Dashboard → Settings → Preferences**:

1. **View Status** - See if they're subscribed
2. **Subscribe** - Turn on newsletter with toggle
3. **Unsubscribe** - Turn off newsletter with toggle
4. **Real-time Updates** - Changes reflect immediately

## API Endpoints

### User-Facing Endpoints

#### GET `/api/beehiiv/status`

Get the current newsletter subscription status for authenticated user.

**Auth**: Required (Clerk)

**Response**:
```typescript
{
  enabled: boolean,        // Is Beehiiv integration enabled
  subscribed: boolean,     // Is user subscribed
  status: string,          // "active" | "inactive" | "not_subscribed"
  subscriberId?: string    // Beehiiv subscriber ID (if subscribed)
}
```

#### POST `/api/beehiiv/subscribe`

Subscribe/resubscribe authenticated user to newsletter.

**Auth**: Required (Clerk)

**Response**:
```typescript
{
  success: boolean,
  message: string,
  subscriberId: string
}
```

#### POST `/api/beehiiv/unsubscribe`

Unsubscribe authenticated user from newsletter.

**Auth**: Required (Clerk)

**Response**:
```typescript
{
  success: boolean,
  message: string
}
```

## Library Functions

### `subscribeUser(params)`

Subscribe a user to Beehiiv.

```typescript
import { subscribeUser } from '@/lib/beehiiv'

const result = await subscribeUser({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  utmSource: 'app_signup',
  sendWelcomeEmail: true,
})

if (result.success) {
  console.log('Subscriber ID:', result.data.id)
} else {
  console.error('Error:', result.error.message)
}
```

### `unsubscribeUser(identifier)`

Unsubscribe by email or subscriber ID.

```typescript
import { unsubscribeUser } from '@/lib/beehiiv'

// By email
await unsubscribeUser('user@example.com')

// By subscriber ID
await unsubscribeUser('sub_xxxxxxxx')
```

### `getSubscriberByEmail(email)`

Look up a subscriber.

```typescript
import { getSubscriberByEmail } from '@/lib/beehiiv'

const result = await getSubscriberByEmail('user@example.com')

if (result.success) {
  console.log('Status:', result.data.status)
  console.log('Subscriber ID:', result.data.id)
}
```

### `safeBeehiivOperation(operation, context)`

Wrapper for non-critical operations that should never throw.

```typescript
import { safeBeehiivOperation, subscribeUser } from '@/lib/beehiiv'

// In webhooks or critical paths
const result = await safeBeehiivOperation(
  () => subscribeUser({ email: 'user@example.com' }),
  'webhook_signup'
)
// Never throws - always returns a result
```

## Testing

### Test Beehiiv API Connection

```bash
npm run test-beehiiv
```

This tests:
- Configuration validation
- Subscribe operation
- Get subscriber operation
- Unsubscribe operation

### Test Webhook Integration

```bash
npm run test-clerk-webhook
```

This simulates a complete webhook flow:
- User creation in database
- Beehiiv subscription
- Subscriber ID storage
- Data verification

### Test User Settings Integration

1. Start your dev server: `npm run dev`
2. Sign in to your application
3. Navigate to **Dashboard → Settings → Preferences**
4. Test the newsletter toggle:
   - Toggle ON to subscribe
   - Toggle OFF to unsubscribe
   - Verify toast notifications appear
5. Check Beehiiv dashboard to confirm changes

See `scripts/test-beehiiv-endpoints.ts` for endpoint testing guide.

### Test with Real Email

```bash
npm run test-beehiiv your-email@example.com
```

Note: Test emails with `@example.com` are marked as "invalid" by Beehiiv.

## Monitoring

### Logs

All Beehiiv operations are logged with structured data:

```typescript
// Success
[Beehiiv] [subscribe] Success {
  email: 'user@example.com',
  subscriberId: 'sub_xxxxx',
  duration: '532ms',
  utmSource: 'app_signup'
}

// Failure
[Beehiiv] [subscribe] Failed {
  email: 'user@example.com',
  error: 'Rate limit exceeded',
  statusCode: 429,
  duration: '1200ms'
}
```

### Production Audit

Failed operations in production are logged to console with `[BEEHIIV_AUDIT]` prefix for external monitoring services (Sentry, DataDog, etc.).

## Error Handling

### Graceful Degradation

The integration never fails critical operations:

- ✅ User signup succeeds even if Beehiiv is down
- ✅ Webhooks return 200 OK even on Beehiiv errors
- ✅ All operations are logged for debugging

### Retry Logic

- **Attempts**: 3 retries with exponential backoff
- **Delays**: 1s, 2s, 4s
- **Retry on**: 5xx errors, network errors, 429 rate limits
- **No retry on**: 4xx client errors (except 429)

### Configuration Validation

```bash
# Check if Beehiiv is properly configured
import { validateBeehiivConfig } from '@/lib/beehiiv'

const check = validateBeehiivConfig()
console.log('Valid:', check.valid)
console.log('Errors:', check.errors)
console.log('Warnings:', check.warnings)
```

## Clerk Metadata Setup

To enable newsletter consent during signup, add a custom field in Clerk:

1. Go to Clerk Dashboard → User & Authentication → User Metadata
2. Add `unsafe_metadata` field: `newsletter_consent` (boolean)
3. Collect this in your signup form

Example signup form:

```tsx
<SignUp
  unsafeMetadata={{
    newsletter_consent: agreedToNewsletter
  }}
/>
```

## Database Schema

The `users_sync` table includes:

```sql
ALTER TABLE users_sync 
ADD COLUMN beehiiv_subscriber_id VARCHAR(255);

CREATE INDEX idx_users_sync_beehiiv_subscriber_id 
ON users_sync(beehiiv_subscriber_id) 
WHERE beehiiv_subscriber_id IS NOT NULL;
```

## Troubleshooting

### Beehiiv is disabled

**Symptom**: Newsletter subscriptions not happening

**Solution**: 
```bash
# Set in .env.local
BEEHIIV_ENABLED=true
BEEHIIV_API_KEY=your_key
BEEHIIV_PUBLICATION_ID=pub_xxxxx
```

### 401 Unauthorized

**Symptom**: `Client error (401)`

**Solution**: Check your `BEEHIIV_API_KEY` has write permissions to subscribers

### 404 Not Found

**Symptom**: `Client error (404)`

**Solution**: Verify `BEEHIIV_PUBLICATION_ID` is correct

### Subscriber marked as "invalid"

**Symptom**: Status changes from `validating` → `invalid`

**Reason**: Email domain doesn't exist (e.g., `@example.com`)

**Solution**: Test with real email addresses

### Rate limiting

**Symptom**: `HTTP 429: Rate limit exceeded`

**Solution**: The integration automatically retries with backoff. Check Beehiiv plan limits.

## Production Checklist

Before going live:

- [ ] Set `BEEHIIV_ENABLED=true` in production env
- [ ] Add `BEEHIIV_API_KEY` to production env
- [ ] Add `BEEHIIV_PUBLICATION_ID` to production env
- [ ] Run database migration for `beehiiv_subscriber_id` column
- [ ] Set up Clerk webhook endpoint at `/api/webhooks/clerk`
- [ ] Configure `CLERK_WEBHOOK_SECRET` for signature verification
- [ ] Add newsletter consent checkbox to signup form
- [ ] Test subscribe/unsubscribe from Settings page
- [ ] Test with a real email address
- [ ] Monitor logs for `[BEEHIIV_AUDIT]` in production
- [ ] Verify newsletter preferences UI in Settings

## API Reference

### Beehiiv API

- **Base URL**: `https://api.beehiiv.com/v2`
- **Auth**: Bearer token in header
- **Docs**: https://developers.beehiiv.com/

### Rate Limits

Check your Beehiiv plan for rate limits. The integration automatically handles rate limiting with retries.

## Support

For issues:
1. Check logs for `[Beehiiv]` messages
2. Run `npm run test-beehiiv` to verify configuration
3. Check Beehiiv dashboard for subscriber status
4. Review webhook logs in your database (`clerk_webhook_events` table)

