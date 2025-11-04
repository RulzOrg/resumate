# Beehiiv Integration - Testing Checklist

## Pre-Testing Setup

Before running tests, ensure you have:

- [ ] Beehiiv account created
- [ ] API key obtained
- [ ] Publication ID obtained
- [ ] Environment variables set in `.env.local`:
  ```bash
  BEEHIIV_ENABLED=true
  BEEHIIV_API_KEY=your_key_here
  BEEHIIV_PUBLICATION_ID=pub_xxxxx
  ```
- [ ] Database migration completed (`scripts/add-newsletter-columns.sql`)
- [ ] Welcome email created and published in Beehiiv
- [ ] Dev server running (`npm run dev`)

---

## Test 1: User Opts IN to Newsletter ✅

**Steps:**
1. Open app in incognito mode: http://localhost:3000/auth/signup
2. Click "Create Account" tab
3. Fill out signup form:
   - Name: Test User 1
   - Email: test-optin@example.com
   - Password: SecurePass123!
4. **CHECK the newsletter checkbox**
5. Click "Create Account"
6. Enter verification code from email
7. Complete signup

**Expected Results:**
- [ ] Signup completes successfully
- [ ] User is redirected to onboarding/dashboard
- [ ] Database check:
  ```sql
  SELECT email, newsletter_subscribed, beehiiv_subscriber_id, newsletter_subscribed_at
  FROM users_sync
  WHERE email = 'test-optin@example.com';
  ```
  - `newsletter_subscribed = true`
  - `beehiiv_subscriber_id` is populated
  - `newsletter_subscribed_at` has timestamp

- [ ] Beehiiv dashboard check:
  - User appears in Subscribers list
  - Custom fields populated:
    - `user_id` = Clerk user ID
    - `signup_date` = ISO timestamp
    - `subscription_plan` = "free"

- [ ] Email check:
  - Welcome email received (check inbox + spam)
  - Email is branded and formatted correctly
  - Unsubscribe link present in footer

- [ ] Server logs show:
  ```
  [BEEHIIV] User subscribed successfully
  [CLERK_WEBHOOK] User subscribed to newsletter
  ```

---

## Test 2: User Opts OUT of Newsletter ✅

**Steps:**
1. Open app in new incognito window
2. Go to signup page
3. Fill out signup form:
   - Name: Test User 2
   - Email: test-optout@example.com
   - Password: SecurePass123!
4. **LEAVE newsletter checkbox UNCHECKED**
5. Complete signup
6. Enter verification code
7. Complete signup

**Expected Results:**
- [ ] Signup completes successfully
- [ ] User is redirected to onboarding/dashboard
- [ ] Database check:
  ```sql
  SELECT email, newsletter_subscribed, beehiiv_subscriber_id
  FROM users_sync
  WHERE email = 'test-optout@example.com';
  ```
  - `newsletter_subscribed = false` (or NULL)
  - `beehiiv_subscriber_id = NULL`

- [ ] Beehiiv dashboard check:
  - User does NOT appear in Subscribers list

- [ ] Email check:
  - NO welcome email received

- [ ] Server logs show:
  ```
  [CLERK_WEBHOOK] User opted out of newsletter
  ```

---

## Test 3: Non-Blocking Integration (API Failure) ✅

**Purpose:** Verify that signup succeeds even if Beehiiv API is down.

**Steps:**
1. Stop dev server
2. Edit `.env.local` - set invalid API key:
   ```bash
   BEEHIIV_API_KEY=invalid_key_for_testing
   ```
3. Restart dev server
4. Open app in incognito mode
5. Fill out signup form with newsletter checked
6. Complete signup

**Expected Results:**
- [ ] Signup **STILL SUCCEEDS** (critical!)
- [ ] User is created in database
- [ ] User can access dashboard
- [ ] Server logs show error but doesn't crash:
  ```
  [BEEHIIV] Subscription failed: HTTP 401: Unauthorized
  [CLERK_WEBHOOK] Beehiiv subscription failed (non-blocking)
  ```
- [ ] User does not receive welcome email (expected - API failed)

**Cleanup:**
1. Restore correct `BEEHIIV_API_KEY` in `.env.local`
2. Restart dev server

---

## Test 4: Database Persistence ✅

**Purpose:** Verify subscriber data is correctly stored in database.

**Steps:**
1. Sign up with newsletter checked (use Test 1 above)
2. Query database:
   ```sql
   SELECT
     email,
     newsletter_subscribed,
     beehiiv_subscriber_id,
     newsletter_subscribed_at,
     newsletter_unsubscribed_at
   FROM users_sync
   WHERE newsletter_subscribed = true
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Expected Results:**
- [ ] `newsletter_subscribed = true`
- [ ] `beehiiv_subscriber_id` matches Beehiiv dashboard ID
- [ ] `newsletter_subscribed_at` has timestamp (not NULL)
- [ ] `newsletter_unsubscribed_at = NULL`

---

## Test 5: Checkbox State Persistence ✅

**Purpose:** Verify checkbox state resets correctly.

**Steps:**
1. Go to signup page
2. Check newsletter checkbox
3. Click "Sign In" tab (switch tabs)
4. Click "Create Account" tab (switch back)

**Expected Results:**
- [ ] Checkbox is **UNCHECKED** (reset to default state)
- [ ] Form fields are cleared

---

## Test 6: Clerk Webhook Receives Metadata ✅

**Purpose:** Verify newsletter consent is passed to Clerk.

**Steps:**
1. Sign up with newsletter checked
2. Check Clerk dashboard:
   - Go to https://dashboard.clerk.com
   - Find the user
   - View user metadata

**Expected Results:**
- [ ] `unsafeMetadata` contains:
  ```json
  {
    "newsletter_consent": true
  }
  ```

---

## Test 7: Custom Fields in Beehiiv ✅

**Purpose:** Verify all custom fields are synced to Beehiiv.

**Steps:**
1. Sign up with newsletter checked
2. Go to Beehiiv dashboard
3. Find subscriber
4. View subscriber details

**Expected Results:**
- [ ] Custom field `user_id` = Clerk user ID (e.g., `user_2abc123`)
- [ ] Custom field `signup_date` = ISO timestamp
- [ ] Custom field `subscription_plan` = "free"

---

## Test 8: Welcome Email Content ✅

**Purpose:** Verify welcome email is well-formatted and branded.

**Steps:**
1. Sign up with newsletter checked
2. Check email inbox
3. Open welcome email

**Expected Results:**
- [ ] Subject line: "Welcome to ResuMate AI - Your Resume Optimizer" (or your custom subject)
- [ ] Email includes ResuMate AI branding (logo, colors)
- [ ] Email is mobile-responsive
- [ ] All links work (dashboard, support, etc.)
- [ ] Unsubscribe link present in footer
- [ ] Email content is clear and helpful

---

## Test 9: Beehiiv Integration Toggle ✅

**Purpose:** Verify integration can be disabled.

**Steps:**
1. Set `BEEHIIV_ENABLED=false` in `.env.local`
2. Restart dev server
3. Sign up with newsletter checked

**Expected Results:**
- [ ] Signup succeeds
- [ ] User NOT subscribed to Beehiiv
- [ ] Server logs show:
  ```
  [BEEHIIV] Integration disabled via BEEHIIV_ENABLED flag
  ```

**Cleanup:**
- Set `BEEHIIV_ENABLED=true`
- Restart dev server

---

## Test 10: Production Readiness ✅

**Purpose:** Verify all components are ready for production deployment.

**Checklist:**
- [ ] Environment variables set in Vercel:
  - `BEEHIIV_ENABLED=true`
  - `BEEHIIV_API_KEY` (production key)
  - `BEEHIIV_PUBLICATION_ID`

- [ ] Database migration run in production database

- [ ] Welcome email published in Beehiiv (production account)

- [ ] Clerk webhook endpoint configured:
  - URL: `https://your-domain.com/api/webhooks/clerk`
  - Events: `user.created`, `user.updated`, `user.deleted`

- [ ] Build succeeds:
  ```bash
  npm run build
  ```

- [ ] No TypeScript errors:
  ```bash
  npm run type-check
  ```

- [ ] No ESLint errors:
  ```bash
  npm run lint
  ```

---

## Common Issues & Solutions

### Issue: "BEEHIIV_API_KEY is undefined"

**Solution:**
- Check `.env.local` file exists and has `BEEHIIV_API_KEY=your_key`
- Restart dev server after changing env vars
- Verify no typos in variable name

---

### Issue: "User subscribed but no email received"

**Possible causes:**
1. Email in spam folder → Check spam/junk
2. Welcome email not published → Check Beehiiv dashboard
3. `send_welcome_email: false` → Verify code has `sendWelcome: true`

---

### Issue: "Database column doesn't exist"

**Solution:**
- Run migration: `psql $DATABASE_URL < scripts/add-newsletter-columns.sql`
- Verify migration: `\d users_sync` in psql

---

### Issue: "Checkbox doesn't appear on signup form"

**Solution:**
- Clear browser cache
- Check `components/auth/custom-auth-page.tsx` has checkbox code
- Verify dev server is running latest code (`npm run dev`)

---

## Test Results Summary

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | User Opts IN | ⏳ Pending | |
| 2 | User Opts OUT | ⏳ Pending | |
| 3 | API Failure (Non-Blocking) | ⏳ Pending | |
| 4 | Database Persistence | ⏳ Pending | |
| 5 | Checkbox State Reset | ⏳ Pending | |
| 6 | Clerk Metadata | ⏳ Pending | |
| 7 | Custom Fields | ⏳ Pending | |
| 8 | Welcome Email | ⏳ Pending | |
| 9 | Integration Toggle | ⏳ Pending | |
| 10 | Production Readiness | ⏳ Pending | |

**Instructions:** After completing each test, mark as ✅ Pass or ❌ Fail and add notes if needed.

---

## Next Steps After Testing

Once all tests pass:

1. **Deploy to Production:**
   - Set environment variables in Vercel
   - Run database migration in production
   - Deploy via Git push or Vercel CLI

2. **Monitor First Week:**
   - Check Beehiiv subscriber count daily
   - Monitor server logs for errors
   - Track welcome email open rates

3. **Phase 2 Planning:**
   - Email preference settings page
   - Onboarding completion email
   - Upgrade nurture sequence

---

**Document Version:** 1.0
**Created:** 2025-10-30
**Status:** Ready for Testing
