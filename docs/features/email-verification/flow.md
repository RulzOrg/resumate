# Email Verification Flow - Complete Implementation Guide

## Overview

The email verification flow is designed to safely change a user's email address with proper verification and rollback capabilities. The system never replaces the primary email until the new email is verified, ensuring users can always access their account.

## Database Schema

```sql
-- Added fields to users_sync table
pending_email VARCHAR(255)              -- Stores new email during verification
email_verification_status VARCHAR(50)   -- Status: verified, pending_verification, expired, failed
email_verification_token VARCHAR(255)   -- Clerk email ID for tracking
email_verification_expiry TIMESTAMP     -- Expiry timestamp (24 hours)
```

## Complete Flow Diagram

```
User submits new email
       ↓
[API: POST /api/user/email]
       ↓
1. Validate email format
2. Check for conflicts
3. Store in pending_email (DB)
4. Set status = 'pending_verification'
5. Set expiry = now + 24h
       ↓
Call Clerk API to create email
       ↓
   SUCCESS                    FAILURE
       ↓                         ↓
Store Clerk email ID    Rollback DB changes
Send verification email Clear pending_email
User notified           Return error to user
       ↓
User clicks email link
       ↓
[Clerk Webhook: email.updated]
       ↓
Verify pending_email matches
       ↓
Atomic DB update:
  - email = pending_email
  - pending_email = NULL
  - status = 'verified'
       ↓
Update Clerk primary email
       ↓
COMPLETE
```

## Implementation Details

### 1. Initiating Email Change

**API Endpoint:** `POST /api/user/email`

**Request Body:**
```json
{
  "email": "new.email@company.com"
}
```

**Flow:**
1. Validate email format using regex
2. Check if email is same as current email
3. Check if there's already a pending email verification
4. Check if new email is already in use by another user
5. Calculate expiry timestamp (24 hours from now)
6. **Critical:** Store pending_email in database FIRST
7. Call Clerk API to create email address
8. Store Clerk email ID as verification_token
9. If Clerk fails, rollback database changes

**Success Response:**
```json
{
  "success": true,
  "message": "Verification email sent",
  "pendingEmail": "new.email@company.com",
  "status": "pending_verification",
  "expiresAt": "2025-01-07T12:00:00.000Z",
  "note": "You can continue using your account with the old email until verification is complete."
}
```

**Error Responses:**
- `400`: Invalid email format
- `409`: Email already in use or pending change exists
- `500`: Clerk API failure (with rollback)

### 2. Clerk Webhook Handler

**Webhook Events:** `email.created`, `email.updated`

**File:** `app/api/webhooks/clerk/route.ts`

**email.created Event:**
- Stores Clerk email ID as verification_token
- Does not update primary email yet

**email.updated Event (Verified):**
1. Fetch user by clerk_user_id
2. Verify pending_email matches verified email
3. Verify email_verification_token matches
4. **Atomic update** with WHERE clause:
   ```sql
   UPDATE users_sync
   SET email = pending_email,
       pending_email = NULL,
       email_verification_status = 'verified',
       email_verification_token = NULL,
       email_verification_expiry = NULL
   WHERE id = user_id
     AND pending_email = verified_email
     AND email_verification_status = 'pending_verification'
   ```
5. Update Clerk to set as primary email
6. Log success

**Failure Handling:**
- If atomic update returns 0 rows: concurrent modification detected
- If Clerk primary email update fails: log warning but don't rollback (email is verified)
- All errors are logged with context for debugging

### 3. Timeout/Cleanup Job

**Inngest Function:** `email-verification-cleanup`

**Schedule:** Every 6 hours (cron: `0 */6 * * *`)

**File:** `lib/inngest/functions/email-verification-cleanup.ts`

**Process:**
1. Find all records where:
   - status = 'pending_verification'
   - expiry < current timestamp
2. For each expired verification:
   a. Delete unverified email from Clerk
   b. Update database:
      - pending_email = NULL
      - status = 'expired'
      - clear verification fields
3. Log all actions for audit trail

**Manual Trigger:**
```typescript
// Via API or admin interface
inngest.send({
  name: "email.verification.cleanup.manual"
})
```

### 4. User Cancellation

**API Endpoint:** `DELETE /api/user/email`

**Flow:**
1. Fetch user's pending email and verification token
2. Delete email address from Clerk (if exists)
3. Clear pending_email and verification fields
4. Set status back to 'verified'

**Response:**
```json
{
  "success": true,
  "message": "Email change cancelled"
}
```

### 5. Checking Status

**API Endpoint:** `GET /api/user/email`

**Response:**
```json
{
  "currentEmail": "current@email.com",
  "pendingEmail": "new@email.com",
  "status": "pending_verification",
  "expiresAt": "2025-01-07T12:00:00.000Z"
}
```

## UI Components

### Email Status Display

**File:** `components/settings/account-tab.tsx`

**Features:**
1. Current email with verified badge
2. Pending email notification (yellow banner):
   - Shows pending email address
   - Shows expiry time
   - Allows cancellation
   - Explains user can continue with old email
3. Expired notification (orange banner):
   - Informs user previous change expired
   - Allows new change request
4. Change email form:
   - Input for new email
   - Disabled during pending verification
   - Validation and error display
   - Help text about process

**States:**
- `verified`: Normal state, can change email
- `pending_verification`: Waiting for user to click verification link
- `expired`: Previous verification expired, can retry
- `failed`: Verification failed (rare)

## Security Considerations

### 1. Atomic Updates

All email transitions use WHERE clauses to prevent race conditions:
```sql
WHERE id = user_id
  AND pending_email = expected_email
  AND email_verification_status = 'pending_verification'
```

If the WHERE clause doesn't match, the update returns 0 rows, preventing incorrect state changes.

### 2. Duplicate Email Prevention

Multiple layers of protection:
1. Unique constraint on `email` column in database
2. API checks for conflicts before Clerk call
3. Clerk validates email uniqueness
4. Atomic update prevents concurrent modifications

### 3. Session Management

**Important:** Users can continue signing in with their OLD email until verification is complete. This prevents account lockout if:
- User loses access to new email
- Verification email goes to spam
- User changes mind

Clerk maintains both email addresses during verification:
- Old email: Primary, can sign in
- New email: Unverified, cannot sign in (until verified)

After verification:
- New email: Primary, can sign in
- Old email: Deleted automatically by Clerk or manually via cleanup

### 4. Expiry and Timeout

24-hour expiry window balances security and usability:
- Long enough for users to check email
- Short enough to prevent stale verifications
- Automatic cleanup prevents database pollution
- Users can request new verification if expired

## Error Scenarios and Rollback

### Scenario 1: Clerk API Fails After DB Update

**Detection:** Clerk API throws error during email creation

**Rollback:**
```typescript
await sql`
  UPDATE users_sync
  SET pending_email = NULL,
      email_verification_status = 'verified',
      email_verification_token = NULL,
      email_verification_expiry = NULL
  WHERE id = ${user.id}
`
```

**User Experience:** Error message displayed, no data corruption

### Scenario 2: User Never Clicks Verification Link

**Detection:** Inngest cron job finds expired verification

**Resolution:**
1. Delete unverified email from Clerk
2. Set status to 'expired'
3. Clear pending fields
4. User can retry with new request

**User Experience:** Orange banner informs of expiration, can retry

### Scenario 3: Concurrent Email Changes

**Detection:** Atomic update returns 0 rows

**Resolution:**
- First request wins (stored in DB first)
- Second request gets 409 Conflict error
- Webhook checks pending_email matches before updating

**User Experience:** Clear error message about pending change

### Scenario 4: Webhook Arrives Before DB is Updated

**Detection:** Webhook checks for pending_email

**Resolution:**
- If no pending_email found, webhook exits gracefully
- Logs warning but doesn't fail
- Retries handled by Svix automatically

**User Experience:** No impact, verification completes on retry

### Scenario 5: Network Failure During Verification

**Detection:** Database transaction fails

**Resolution:**
- Transaction rollback (automatic)
- Clerk email may exist but not tracked
- Cleanup job will remove orphaned emails

**User Experience:** Error message, can retry

## Testing Checklist

### Unit Tests

- [ ] Email validation (format, length, special characters)
- [ ] Duplicate email detection
- [ ] Expiry calculation (24 hours)
- [ ] Atomic update WHERE clause logic
- [ ] Helper functions (setPendingEmail, commitPendingEmail, etc.)

### Integration Tests

- [ ] Complete flow: request → verify → commit
- [ ] Rollback on Clerk API failure
- [ ] Concurrent modification handling
- [ ] Expiry and cleanup job
- [ ] Cancellation flow
- [ ] Webhook signature verification

### End-to-End Tests

- [ ] User changes email successfully
- [ ] User cancels email change
- [ ] Verification email expires
- [ ] User tries to change to duplicate email
- [ ] User tries to change while change pending
- [ ] Sign in with old email during verification
- [ ] Sign in with new email after verification

### Edge Cases

- [ ] Clerk webhook arrives out of order
- [ ] User deleted during verification
- [ ] Email already verified in Clerk before webhook
- [ ] Multiple verification requests in rapid succession
- [ ] Network timeout during DB update
- [ ] Invalid email format bypasses client validation

## API Documentation

### POST /api/user/email

Start email change verification process.

**Request:**
```json
{
  "email": "new.email@company.com"
}
```

**Responses:**

`200 OK`:
```json
{
  "success": true,
  "message": "Verification email sent",
  "pendingEmail": "new.email@company.com",
  "status": "pending_verification",
  "expiresAt": "2025-01-07T12:00:00.000Z",
  "note": "..."
}
```

`400 Bad Request`:
```json
{
  "error": "Invalid email address"
}
```

`409 Conflict`:
```json
{
  "error": "Email change already in progress",
  "pendingEmail": "pending@email.com"
}
```

`500 Internal Server Error`:
```json
{
  "error": "Failed to send verification email",
  "details": "Clerk API error message"
}
```

### GET /api/user/email

Get current email verification status.

**Response:**
```json
{
  "currentEmail": "current@email.com",
  "pendingEmail": "pending@email.com",
  "status": "pending_verification",
  "expiresAt": "2025-01-07T12:00:00.000Z"
}
```

### DELETE /api/user/email

Cancel pending email change.

**Response:**
```json
{
  "success": true,
  "message": "Email change cancelled"
}
```

`404 Not Found`:
```json
{
  "error": "No pending email change"
}
```

## Database Helper Functions

**File:** `lib/email-verification-utils.ts`

- `getEmailVerificationStatus(clerkUserId)` - Get current status
- `hasPendingEmailVerification(clerkUserId)` - Check for pending
- `isEmailInUse(email, excludeUserId?)` - Check duplicates
- `setPendingEmail(userId, email, token, hours)` - Initialize pending
- `clearPendingEmail(userId, status)` - Clear pending state
- `commitPendingEmail(userId, expectedEmail)` - Atomic commit
- `getExpiredPendingEmails()` - Find expired for cleanup
- `markVerificationExpired(userId)` - Mark as expired
- `markVerificationFailed(userId)` - Mark as failed
- `getUserByVerificationToken(token)` - Lookup by token

## Monitoring and Logging

All operations log structured data:

```typescript
console.log('[EMAIL_VERIFICATION] Starting atomic email update:', {
  user_id: user.id,
  old_email: user.email,
  new_email: verifiedEmail,
  timestamp: new Date().toISOString()
})
```

**Key Log Points:**
1. Email change initiated
2. Clerk API called
3. Rollback triggered
4. Webhook received
5. Atomic update executed
6. Cleanup job runs
7. Expiry detected
8. Cancellation requested

## Files Modified/Created

### New Files
- `app/api/user/email/route.ts` - Email change API endpoint
- `lib/inngest/functions/email-verification-cleanup.ts` - Cleanup job
- `lib/email-verification-utils.ts` - Helper functions
- `prisma/migrations/20250106_add_email_verification_fields/migration.sql` - DB migration
- `EMAIL_VERIFICATION_FLOW.md` - This documentation

### Modified Files
- `prisma/schema.prisma` - Added email verification fields
- `app/api/webhooks/clerk/route.ts` - Added email webhook handlers
- `app/api/inngest/route.ts` - Registered cleanup functions
- `components/settings/account-tab.tsx` - Added email verification UI
- `SETTINGS_PAGE_IMPLEMENTATION.md` - Updated with TODO reference (line ~419)

## Deployment Checklist

- [ ] Run database migration
- [ ] Configure Clerk webhook URL: `https://your-app.com/api/webhooks/clerk`
- [ ] Add Clerk webhook events: `email.created`, `email.updated`
- [ ] Set `CLERK_WEBHOOK_SECRET` environment variable
- [ ] Deploy Inngest functions (register in Inngest Cloud)
- [ ] Set `INNGEST_EVENT_KEY` for production
- [ ] Test email verification flow end-to-end
- [ ] Monitor logs for any errors
- [ ] Set up alerts for failed verifications

## Future Enhancements

- [ ] Email notification to old address after change
- [ ] In-app notification for verification status
- [ ] Metrics/monitoring for verification success rates
- [ ] Rate limiting for email change requests
- [ ] Admin interface to view/manage pending verifications
- [ ] Support for multiple email addresses per user
- [ ] Email verification reminder after 12 hours
- [ ] Webhook retry handling improvements
- [ ] Sentry/monitoring service integration

