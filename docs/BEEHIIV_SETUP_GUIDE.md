# Beehiiv Email Marketing Integration - Setup Guide

## Overview

This guide will help you set up the Beehiiv newsletter integration for ResuMate AI. Once configured, users who opt-in during signup will automatically be subscribed to your newsletter and receive a welcome email.

---

## Prerequisites

- [ ] Beehiiv account created
- [ ] Newsletter/publication created in Beehiiv
- [ ] Welcome email created and published in Beehiiv
- [ ] Database migration completed

---

## Step 1: Create Beehiiv Account (5 minutes)

1. Go to https://www.beehiiv.com
2. Click "Sign Up" or "Start Publishing"
3. Create your account (email + password or OAuth)
4. Complete the onboarding flow

**Note:** The free "Launch" plan supports up to 2,500 subscribers and includes API access.

---

## Step 2: Get API Credentials (2 minutes)

### Get API Key

1. Log into your Beehiiv dashboard
2. Navigate to **Settings → Integrations → API**
3. Click **"Create API Key"**
4. Give it a name (e.g., "ResuMate Production")
5. Copy the API key and store it securely

### Get Publication ID

1. Go to your Beehiiv dashboard
2. Look at the URL in your browser
3. The Publication ID is in the URL: `https://app.beehiiv.com/publications/{PUBLICATION_ID}/posts`
4. Copy the Publication ID

**Example URL:**
```
https://app.beehiiv.com/publications/pub_12345abc/posts
                                    ^^^^^^^^^^^^
                                    This is your Publication ID
```

---

## Step 3: Configure Environment Variables (1 minute)

### Local Development (.env.local)

Update your `.env.local` file:

```bash
# Beehiiv Newsletter Integration
BEEHIIV_ENABLED=true
BEEHIIV_API_KEY=your_beehiiv_api_key_here
BEEHIIV_PUBLICATION_ID=pub_your_publication_id_here
```

### Production (Vercel)

1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Add the following variables for **Production** environment:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `BEEHIIV_ENABLED` | `true` | Production |
| `BEEHIIV_API_KEY` | `your_api_key` | Production |
| `BEEHIIV_PUBLICATION_ID` | `pub_xxxxx` | Production |

4. Click "Save"

**Security Note:** Never commit API keys to Git. These values should only exist in environment variables.

---

## Step 4: Run Database Migration (2 minutes)

The integration requires 4 new columns in the `users_sync` table.

### Using Neon Console (Recommended)

1. Log into your Neon database console
2. Go to the SQL Editor
3. Paste the contents of `scripts/add-newsletter-columns.sql`
4. Click "Run" to execute the migration

### Using CLI

```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration
\i scripts/add-newsletter-columns.sql

# Verify columns were added
\d users_sync
```

**Verify Migration:**
You should see these new columns:
- `newsletter_subscribed` (boolean)
- `beehiiv_subscriber_id` (text)
- `newsletter_subscribed_at` (timestamp)
- `newsletter_unsubscribed_at` (timestamp)

---

## Step 5: Create Welcome Email in Beehiiv (10 minutes)

1. Go to your Beehiiv dashboard
2. Navigate to **Posts → Create Post**
3. Create your welcome email with the following content (customize as needed):

**Subject Line:**
```
Welcome to ResuMate AI - Your Resume Optimizer
```

**Email Body (Example):**
```
Hi {{subscriber.name}},

Welcome to ResuMate AI! We're excited to help you land your dream job faster.

Here's what you can do with ResuMate AI:

✅ Upload your master resume
✅ Analyze job postings with AI
✅ Get tailored resume optimizations
✅ Export ATS-friendly resumes

Quick Start Guide:
1. Upload your resume at [Your Dashboard](https://your-app.com/dashboard)
2. Paste a job description you're interested in
3. Let our AI optimize your resume for that specific role
4. Download and apply!

Questions? Just reply to this email - we're here to help.

Happy job hunting!

The ResuMate AI Team

---

P.S. Over the next few weeks, we'll send you resume tips, job search advice, and success stories from users who landed their dream jobs.
```

4. **Important:** Set this email as your **"Welcome Email"** in Beehiiv
   - Go to **Settings → Publication → Welcome Email**
   - Select the email you just created
5. Click "Publish"

---

## Step 6: Test the Integration (5 minutes)

### Test Checklist

**Test 1: User opts IN to newsletter**

1. Open your app in incognito mode
2. Go to the signup page
3. Fill out the signup form
4. **Check the newsletter checkbox**
5. Complete signup
6. Verify:
   - [ ] User is created in database
   - [ ] `newsletter_subscribed = true` in database
   - [ ] User appears in Beehiiv subscriber list
   - [ ] Welcome email received (check inbox/spam)
   - [ ] Custom fields appear in Beehiiv (user_id, signup_date, subscription_plan)

**Test 2: User opts OUT of newsletter**

1. Open your app in new incognito window
2. Go to signup page
3. Fill out signup form
4. **Leave newsletter checkbox UNCHECKED**
5. Complete signup
6. Verify:
   - [ ] User is created in database
   - [ ] `newsletter_subscribed = false` in database
   - [ ] User does NOT appear in Beehiiv
   - [ ] No welcome email received

**Test 3: Beehiiv API failure handling**

1. Temporarily set `BEEHIIV_API_KEY` to invalid value
2. Attempt signup with newsletter checked
3. Verify:
   - [ ] Signup still succeeds (non-blocking)
   - [ ] User created in database
   - [ ] Error logged in server console
   - [ ] User can access dashboard

4. Restore correct `BEEHIIV_API_KEY`

---

## Step 7: Monitor and Verify (Ongoing)

### Check Beehiiv Dashboard

1. Go to **Audience → Subscribers**
2. Verify new subscribers are appearing
3. Check that custom fields are populated:
   - user_id
   - signup_date
   - subscription_plan

### Check Application Logs

Look for log entries like:

✅ **Success:**
```
[BEEHIIV] User subscribed successfully: {
  email: "jo***@example.com",
  subscriber_id: "sub_abc123",
  status: "active",
  timestamp: "2025-10-30T12:34:56.789Z"
}
```

⚠️ **Failure (non-blocking):**
```
[CLERK_WEBHOOK] Beehiiv subscription failed (non-blocking): HTTP 401: Unauthorized
```

---

## Troubleshooting

### Issue: Welcome email not received

**Possible causes:**
- Email in spam folder
- Welcome email not set in Beehiiv settings
- Beehiiv API key is invalid
- User didn't check newsletter checkbox

**Solutions:**
1. Check spam/junk folder
2. Verify welcome email is published and set as default
3. Check `BEEHIIV_API_KEY` is correct
4. Verify `newsletterConsent = true` in Clerk metadata

---

### Issue: Users not appearing in Beehiiv

**Possible causes:**
- `BEEHIIV_ENABLED=false`
- Invalid API credentials
- Clerk webhook not firing
- User opted out

**Solutions:**
1. Check `.env.local` has `BEEHIIV_ENABLED=true`
2. Verify API key and Publication ID
3. Check Clerk webhook endpoint is configured: https://dashboard.clerk.com/apps/[your-app]/webhooks
4. Check server logs for errors

---

### Issue: Subscriber appears but no custom fields

**Possible causes:**
- Custom fields not created in Beehiiv
- API payload missing fields
- Beehiiv API version mismatch

**Solutions:**
1. Check Beehiiv dashboard → Settings → Custom Fields
2. Verify fields exist: `user_id`, `signup_date`, `subscription_plan`
3. Check server logs for API response
4. Verify API endpoint is `https://api.beehiiv.com/v2`

---

## Custom Fields Reference

These custom fields are automatically sent to Beehiiv on signup:

| Field Name | Type | Example | Purpose |
|------------|------|---------|---------|
| `user_id` | String | `user_abc123` | Link to internal database |
| `signup_date` | ISO Date | `2025-10-30T12:00:00Z` | Cohort analysis |
| `subscription_plan` | String | `free`, `pro`, `enterprise` | Segmentation |

**Future fields (Phase 2):**
- `onboarding_completed` (boolean)
- `total_optimizations` (number)
- `last_optimization_date` (ISO date)

---

## Next Steps (Phase 2)

Once Phase 1 is working:

1. **Email Preference Settings**
   - Add settings page for users to manage subscription
   - Allow users to unsubscribe/resubscribe

2. **Email Sequences**
   - Create onboarding completion email
   - Create upgrade nurture sequence
   - Create re-engagement sequence

3. **Milestone Tracking**
   - Track first optimization completed
   - Track 5, 10, 25 optimizations
   - Trigger congratulatory emails

---

## Support

### Resources
- **Beehiiv Docs:** https://developers.beehiiv.com/
- **Beehiiv Support:** support@beehiiv.com
- **Implementation Guide:** `docs/BEEHIIV_INTEGRATION_PLAN.md`
- **PRD:** `ai-dev-tasks/prds/0005-prd-beehiiv-email-marketing-integration.md`

### Common Commands

**Check if Beehiiv is enabled:**
```bash
echo $BEEHIIV_ENABLED
```

**Test Beehiiv API connection:**
```bash
curl -X GET "https://api.beehiiv.com/v2/publications/$BEEHIIV_PUBLICATION_ID" \
  -H "Authorization: Bearer $BEEHIIV_API_KEY"
```

**Query newsletter subscribers in database:**
```sql
SELECT
  email,
  newsletter_subscribed,
  beehiiv_subscriber_id,
  newsletter_subscribed_at
FROM users_sync
WHERE newsletter_subscribed = true
  AND deleted_at IS NULL;
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-30
**Status:** Ready for Use
