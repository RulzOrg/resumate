# Beehiiv Integration Troubleshooting

## Common Issues and Solutions

### 1. Unsubscribe Returns 404 Error

**Symptom:**
```
[Beehiiv] Client error (404): HTTP 404: Not Found
POST /api/beehiiv/unsubscribe 500
```

**Cause:**
Beehiiv returns 404 when:
- Subscriber has "invalid" status (e.g., test emails like `@example.com`)
- Subscriber was already deleted
- Subscriber doesn't exist in the publication

**Solution:**
✅ **Fixed in v1.1** - The system now treats 404 as success:
- If subscriber not found during lookup → Success (already unsubscribed)
- If DELETE returns 404 → Success (subscriber doesn't exist)
- User sees: "Successfully unsubscribed from newsletter"

**Why this is correct:**
The goal is to ensure the user is NOT subscribed. Whether they were never subscribed or already unsubscribed, the end result is the same.

---

### 2. "Unexpected end of JSON input" Error

**Symptom:**
```
[Beehiiv] Network error on attempt 1/3. Retrying in 1000ms... Unexpected end of JSON input
```

**Cause:**
Beehiiv sometimes returns empty response bodies for DELETE operations, but the code was trying to parse them as JSON.

**Solution:**
✅ **Fixed in v1.1** - Empty responses are now handled gracefully:
```typescript
// Check if response is empty
const text = await response.text()
if (!text || text.trim() === "") {
  return { success: true, data: {} }
}
```

---

### 3. Subscriber Status "invalid"

**Symptom:**
```
Status: invalid
```

**Cause:**
Beehiiv marks subscribers as "invalid" when:
- Email domain doesn't exist (e.g., `@example.com`)
- Email failed validation
- Email bounced

**Solution:**
- Use real email addresses for testing
- Test emails will be marked invalid but won't receive emails
- Invalid subscribers can't be deleted via API (returns 404)
- System now handles this gracefully

---

### 4. Rate Limiting (429)

**Symptom:**
```
HTTP 429: Rate limit exceeded
```

**Cause:**
Too many requests to Beehiiv API.

**Solution:**
- System automatically retries with exponential backoff
- Check your Beehiiv plan's rate limits
- For testing, add delays between operations

---

### 5. Subscriber Not Found After Creation

**Symptom:**
User just subscribed but status check shows "not_subscribed".

**Cause:**
Propagation delay in Beehiiv's system (usually < 1 second).

**Solution:**
- UI updates optimistically (toggle switches immediately)
- Background check will sync within seconds
- Refresh the page to see updated status

---

### 6. Unsubscribe Succeeds But User Still Subscribed

**Symptom:**
Unsubscribe returns success, but Beehiiv dashboard still shows subscriber.

**Possible Causes:**
1. **Browser cache** - Refresh the Beehiiv dashboard
2. **Propagation delay** - Wait 5-10 seconds and check again
3. **Wrong publication ID** - Check `BEEHIIV_PUBLICATION_ID` env var
4. **Multiple subscribers** - User might have subscribed with different email

**Debug Steps:**
```bash
# Check logs for subscriber ID
grep "Beehiiv.*unsubscribe" logs.txt

# Verify publication ID
echo $BEEHIIV_PUBLICATION_ID

# Check database
SELECT email, beehiiv_subscriber_id FROM users_sync 
WHERE email = 'user@example.com';
```

---

### 7. Subscribe/Unsubscribe Toggle Not Working

**Symptom:**
Toggle switch doesn't change state or shows error toast.

**Possible Causes:**
1. Not authenticated (401 error)
2. Beehiiv integration disabled
3. Network error
4. API credentials invalid

**Debug Steps:**
1. Open browser DevTools → Network tab
2. Click the toggle
3. Check the API response:

```javascript
// Success response
{ success: true, message: "..." }

// Error responses
{ success: false, error: "Unauthorized" }        // 401
{ success: false, error: "Integration disabled" } // 400
{ success: false, error: "..." }                  // 500
```

**Solutions:**
- **401**: Sign out and sign back in
- **Integration disabled**: Set `BEEHIIV_ENABLED=true`
- **500**: Check server logs for details

---

### 8. Database beehiiv_subscriber_id Not Updated

**Symptom:**
Subscriber ID not stored in `users_sync` table after subscription.

**Possible Causes:**
1. Database migration not run
2. User lookup failed
3. Update query failed

**Solutions:**
```sql
-- 1. Verify column exists
\d users_sync

-- 2. Check if column exists but is NULL
SELECT email, beehiiv_subscriber_id 
FROM users_sync 
WHERE email = 'user@example.com';

-- 3. Run migration if needed
psql $DATABASE_URL < scripts/add-beehiiv-subscriber-id.sql

-- 4. Manually update if needed
UPDATE users_sync 
SET beehiiv_subscriber_id = 'sub_xxxxx'
WHERE email = 'user@example.com';
```

---

### 9. Welcome Email Not Sent

**Symptom:**
User subscribed but didn't receive welcome email.

**Possible Causes:**
1. `sendWelcomeEmail: false` in code
2. Welcome email not configured in Beehiiv
3. Email went to spam
4. Subscriber marked as "invalid"

**Check:**
```typescript
// In webhook (user signup)
sendWelcomeEmail: true  // ✅ Sends welcome email

// In settings (re-subscribe)
sendWelcomeEmail: false // ❌ Doesn't send (by design)
```

**Solutions:**
- Check Beehiiv dashboard → Settings → Welcome Email
- Check user's spam folder
- For test emails (@example.com), no emails will be sent

---

### 10. Webhook Not Firing

**Symptom:**
Users sign up but aren't subscribed to Beehiiv.

**Possible Causes:**
1. Webhook not configured in Clerk
2. `CLERK_WEBHOOK_SECRET` not set
3. Webhook signature verification failing
4. Newsletter consent not passed in metadata

**Debug Steps:**
```typescript
// 1. Check Clerk webhook configuration
// Go to: Clerk Dashboard → Webhooks
// Endpoint: https://your-app.com/api/webhooks/clerk
// Events: user.created, user.updated, user.deleted

// 2. Check webhook logs
SELECT * FROM clerk_webhook_events 
WHERE event_type = 'user.created' 
ORDER BY created_at DESC LIMIT 10;

// 3. Check for newsletter consent in signup
console.log(data.unsafe_metadata?.newsletter_consent)
```

**Solutions:**
- Add webhook endpoint in Clerk dashboard
- Set `CLERK_WEBHOOK_SECRET` env var
- Ensure signup form passes newsletter consent:
```tsx
<SignUp
  unsafeMetadata={{
    newsletter_consent: true
  }}
/>
```

---

## Error Reference

| Error Code | Status | Meaning | Solution |
|------------|--------|---------|----------|
| `CONFIG_ERROR` | 0 | Missing API credentials | Set env vars |
| `DISABLED` | 0 | Beehiiv not enabled | Set `BEEHIIV_ENABLED=true` |
| `NOT_FOUND` | 404 | Subscriber doesn't exist | Treated as success for unsubscribe |
| `API_ERROR` | 400-599 | Beehiiv API error | Check Beehiiv dashboard |
| `NETWORK_ERROR` | 0 | Network failure | Check internet connection |
| `UNEXPECTED_ERROR` | 0 | Uncaught exception | Check server logs |

---

## Debugging Tips

### Enable Verbose Logging

All Beehiiv operations are logged with `[Beehiiv]` prefix:

```bash
# View all Beehiiv logs
grep "\[Beehiiv\]" logs.txt

# View only errors
grep "\[Beehiiv\].*Failed" logs.txt

# View specific operation
grep "\[Beehiiv\].*unsubscribe" logs.txt
```

### Check Configuration

```bash
npm run test-beehiiv
```

### Test Endpoints Manually

```bash
# Check status
curl -X GET http://localhost:3000/api/beehiiv/status \
  -H "Cookie: __session=YOUR_SESSION" \
  -b cookies.txt

# Subscribe
curl -X POST http://localhost:3000/api/beehiiv/subscribe \
  -H "Cookie: __session=YOUR_SESSION" \
  -b cookies.txt

# Unsubscribe
curl -X POST http://localhost:3000/api/beehiiv/unsubscribe \
  -H "Cookie: __session=YOUR_SESSION" \
  -b cookies.txt
```

### Database Queries

```sql
-- Check all subscribers
SELECT 
  email, 
  beehiiv_subscriber_id, 
  created_at 
FROM users_sync 
WHERE beehiiv_subscriber_id IS NOT NULL;

-- Find user by email
SELECT * FROM users_sync 
WHERE email = 'user@example.com';

-- Check webhook events
SELECT 
  event_type, 
  created_at, 
  raw_data::json->>'data'->>'email' as email
FROM clerk_webhook_events 
WHERE event_type = 'user.created'
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Getting Help

If you're still experiencing issues:

1. **Check the logs** - Look for `[Beehiiv]` entries
2. **Test API connection** - Run `npm run test-beehiiv`
3. **Verify configuration** - Check all env vars are set
4. **Test webhook** - Run `npm run test-clerk-webhook`
5. **Check Beehiiv dashboard** - Verify subscriber status there
6. **Review documentation** - See `docs/beehiiv-integration.md`

### Contact Support

- **Beehiiv API Issues**: support@beehiiv.com
- **Application Issues**: Check server logs and error messages

