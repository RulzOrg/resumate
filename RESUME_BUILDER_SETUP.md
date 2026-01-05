# Resume Builder Lead Magnet - Setup Guide

## Overview

This document provides setup instructions for the ATS-friendly Resume Builder lead magnet feature. This is a public page that allows users to upload resumes, get AI-powered optimization, and receive the optimized version via email - all without requiring user authentication.

## Features Implemented

✅ **Public Resume Upload** - Users can upload PDF, DOCX, or TXT files (max 10MB)
✅ **AI-Powered Optimization** - Uses OpenAI GPT-4o-mini to analyze and improve resumes
✅ **ATS Compatibility Analysis** - Identifies formatting issues and provides actionable feedback
✅ **Email Delivery** - Sends optimized resume via Resend with professional email template
✅ **Beehiiv Integration** - Automatically adds leads to your newsletter
✅ **Rate Limiting** - IP-based rate limiting to prevent abuse
✅ **Download Links** - 7-day download links for optimized resumes
✅ **Responsive UI** - Mobile-friendly interface with drag-and-drop upload

## Architecture

### User Flow
```
1. Visit /resume-builder (public page)
2. Upload resume (PDF/DOCX/TXT)
3. Resume is extracted and analyzed
4. Enter email address
5. AI optimization runs (30-60 seconds)
6. Email sent with download link
7. Added to Beehiiv newsletter
```

### File Structure
```
/app/resume-builder/
  page.tsx                          # Main page

/app/api/public/resume-optimize/
  route.ts                          # POST: Upload resume
  [id]/
    submit/route.ts                 # POST: Submit email & optimize
    download/route.ts               # GET: Download optimized file

/components/resume-builder/
  ResumeUploadZone.tsx             # File upload component
  EmailCaptureForm.tsx             # Email capture form
  OptimizationProgress.tsx         # Progress indicator
  ResultsDisplay.tsx               # Results display

/lib/
  ats-optimizer.ts                 # ATS analysis & optimization
  lead-magnet.ts                   # Database & file operations
  email.ts                         # Resend email integration
  beehiiv.ts                       # Beehiiv newsletter integration

/emails/
  OptimizedResumeEmail.tsx         # Email template

/prisma/schema.prisma
  LeadMagnetSubmission model       # Database schema
```

## Environment Variables Required

Add these to your `.env` file:

```bash
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
SUPPORT_EMAIL=support@yourdomain.com

# Beehiiv Newsletter
BEEHIIV_API_KEY=your_beehiiv_api_key
BEEHIIV_PUBLICATION_ID=your_publication_id

# Existing Variables (already configured)
# DATABASE_URL=postgresql://...
# OPENAI_API_KEY=sk-xxxxxxxxxxxxx
# R2_ENDPOINT=https://...
# R2_ACCESS_KEY_ID=xxxxxxxxxxxxx
# R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxx
# R2_BUCKET_NAME=your-bucket-name
# UPSTASH_REDIS_REST_URL=https://...
# UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxx
```

## Setup Steps

### 1. Install Dependencies

Dependencies have already been installed:
- `resend` - Email service
- `react-email` - Email templates
- `@react-email/components` - Email UI components

### 2. Run Database Migration

Run the Prisma migration to create the `lead_magnet_submissions` table:

```bash
npx prisma migrate deploy
# OR for development:
npx prisma migrate dev --name add_lead_magnet_submission
```

Then generate the Prisma client:

```bash
npx prisma generate
```

### 3. Set Up Resend

1. Sign up at https://resend.com (100 free emails/day)
2. Verify your domain or use their test domain
3. Create an API key
4. Add to `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

### 4. Set Up Beehiiv (Optional but Recommended)

1. Log in to your Beehiiv account
2. Go to Settings → API
3. Create a new API key
4. Find your Publication ID in the dashboard
5. Add to `.env`:
   ```
   BEEHIIV_API_KEY=your_api_key
   BEEHIIV_PUBLICATION_ID=your_pub_id
   ```

If Beehiiv is not configured, the system will log a warning but continue working.

### 5. Test the Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:3000/resume-builder

3. Test the complete flow:
   - Upload a test resume
   - Enter your email
   - Wait for optimization
   - Check email for optimized resume
   - Download the file

### 6. Deploy

When deploying to production:

1. Add all environment variables to your hosting platform
2. Run database migration on production database
3. Verify domain for Resend emails
4. Test with a real resume submission
5. Monitor logs for any errors

## Database Schema

### LeadMagnetSubmission Table

```sql
CREATE TABLE lead_magnet_submissions (
  id UUID PRIMARY KEY,
  email VARCHAR NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  original_file_url VARCHAR NOT NULL,
  original_file_hash VARCHAR(64),
  optimized_file_url VARCHAR,
  optimized_file_hash VARCHAR(64),
  status VARCHAR(32) DEFAULT 'pending',
  processing_error TEXT,
  improvements_summary JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  download_expires_at TIMESTAMP,
  email_sent_at TIMESTAMP,
  downloaded_at TIMESTAMP,
  converted_to_user BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lead_magnet_email ON lead_magnet_submissions(email);
CREATE INDEX idx_lead_magnet_status ON lead_magnet_submissions(status);
CREATE INDEX idx_lead_magnet_created_at ON lead_magnet_submissions(created_at);
CREATE INDEX idx_lead_magnet_ip ON lead_magnet_submissions(ip_address);
```

## Rate Limits

### Upload Rate Limit
- **Limit:** 5 uploads per hour per IP address
- **Scope:** IP-based
- **Redis Key:** `ratelimit:public:upload:{ip}`

### Email Submission Rate Limit
- **Limit:** 10 submissions per day per IP address
- **Scope:** IP-based
- **Redis Key:** `ratelimit:public:email:{ip}`

## API Endpoints

### POST /api/public/resume-optimize
Upload a resume file.

**Request:**
- Content-Type: multipart/form-data
- Body: `file` (PDF, DOCX, or TXT, max 10MB)

**Response:**
```json
{
  "status": "success",
  "data": {
    "uploadId": "uuid",
    "fileName": "resume.pdf",
    "fileSize": 123456
  }
}
```

### POST /api/public/resume-optimize/[id]/submit
Submit email and trigger optimization.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "submissionId": "uuid",
    "downloadUrl": "https://...",
    "improvements": [
      {
        "title": "Improved ATS Compatibility",
        "description": "Fixed formatting issues..."
      }
    ],
    "score": 85,
    "emailSent": true
  }
}
```

### GET /api/public/resume-optimize/[id]/download
Get download URL for optimized resume.

**Response:**
```json
{
  "status": "success",
  "data": {
    "downloadUrl": "https://...",
    "fileName": "resume-optimized.txt",
    "expiresAt": "2024-01-15T00:00:00Z"
  }
}
```

## Email Template

The email template includes:
- Download button for optimized resume
- List of improvements made
- ATS score (if applicable)
- Call-to-action to create a free account
- Professional branding

Template file: `/emails/OptimizedResumeEmail.tsx`

## Monitoring & Analytics

### Key Metrics to Track

1. **Conversion Rate:** % of visitors who submit email
2. **Completion Rate:** % of uploads that result in optimized resume
3. **Email Open Rate:** % who open the optimization email
4. **Download Rate:** % who download the optimized resume
5. **Signup Conversion:** % who create accounts after using lead magnet

### Database Queries

Get statistics:
```typescript
import { getLeadMagnetStats } from '@/lib/lead-magnet';

const stats = await getLeadMagnetStats();
// Returns: total_submissions, completed_submissions, conversion_rate, unique_emails
```

Get recent submissions:
```typescript
import { getRecentLeadMagnetSubmissions } from '@/lib/lead-magnet';

const submissions = await getRecentLeadMagnetSubmissions(50);
```

## Troubleshooting

### Issue: Emails not being sent

**Solution:**
1. Check RESEND_API_KEY is set correctly
2. Verify domain is verified in Resend dashboard
3. Check logs for email errors: `[Email] Failed to send email`
4. Ensure RESEND_FROM_EMAIL uses verified domain

### Issue: File upload fails

**Solution:**
1. Check R2/S3 credentials are correct
2. Verify bucket exists and is accessible
3. Check file size (max 10MB)
4. Check file type (PDF, DOCX, TXT only)

### Issue: Optimization takes too long

**Solution:**
1. Check OpenAI API key is valid
2. Verify rate limits with OpenAI
3. Check network connectivity to OpenAI
4. Review LLM timeout settings (default: 30s)

### Issue: Rate limit errors

**Solution:**
1. Check Upstash Redis is configured
2. Verify Redis credentials
3. Adjust rate limits in `/lib/ratelimit.ts`
4. Check IP address extraction in API routes

## Customization

### Changing Rate Limits

Edit `/lib/ratelimit.ts` or create new rate limiters in the API routes:

```typescript
const uploadRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 uploads per hour
  analytics: true,
  prefix: 'ratelimit:public:upload',
});
```

### Customizing Email Template

Edit `/emails/OptimizedResumeEmail.tsx` to change:
- Branding colors
- Logo
- Email copy
- CTA buttons
- Layout

### Changing Optimization Logic

Edit `/lib/ats-optimizer.ts` to:
- Adjust analysis prompts
- Add/remove ATS checks
- Change scoring logic
- Modify improvement suggestions

## Security Considerations

1. **Rate Limiting:** Prevents abuse with IP-based limits
2. **File Validation:** Only allows PDF, DOCX, TXT; max 10MB
3. **Email Validation:** Validates email format before processing
4. **Signed URLs:** Download links expire after 7 days
5. **No Auth Required:** Reduces friction but limits abuse with rate limits
6. **Temporary Storage:** Files can be cleaned up after 7 days

## Cleanup Script

Create a cron job to clean up expired submissions:

```typescript
// scripts/cleanup-expired-submissions.ts
import { sql } from '@/lib/db';

async function cleanupExpiredSubmissions() {
  const result = await sql`
    DELETE FROM lead_magnet_submissions
    WHERE download_expires_at < NOW()
    AND downloaded_at IS NOT NULL
    RETURNING id
  `;

  console.log(`Cleaned up ${result.length} expired submissions`);
}

cleanupExpiredSubmissions();
```

## Next Steps

1. **Analytics Integration:** Add Vercel Analytics or PostHog tracking
2. **A/B Testing:** Test different headlines and copy
3. **Conversion Tracking:** Track lead → signup conversion
4. **Email Drip Campaign:** Send follow-up emails via Beehiiv
5. **Social Proof:** Add testimonials and success stories
6. **SEO Optimization:** Add meta tags and structured data

## Support

If you encounter issues:
1. Check the logs for error messages
2. Verify all environment variables are set
3. Test with a simple resume first
4. Check rate limit status in Redis
5. Review API responses in browser DevTools

## Success Metrics

Expected performance after launch:
- **Conversion Rate:** 15-25% (visitors → email submissions)
- **Completion Rate:** 95%+ (uploads → optimized resumes)
- **Download Rate:** 80%+ (emails sent → downloads)
- **Time to Optimize:** 30-60 seconds average

---

**Implementation completed on:** November 4, 2024
**Built by:** Claude (AI Assistant)
**Technology Stack:** Next.js 14, React, TypeScript, Prisma, OpenAI, Resend, Beehiiv
