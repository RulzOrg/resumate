# AI Resume Health Checker - Complete Specification

## Overview
Build a public-facing AI Resume Health Checker page where users can upload their resume and receive ATS compatibility analysis via email **without requiring authentication**. This is a lead generation and value-add feature.

## Current Status
- **Phase 1: Frontend UI** ✅ (Implemented)
- **Phase 2: Backend & Database** 🔄 (Pending)
- **Phase 3: AI Analysis** 🔄 (Pending)
- **Phase 4: Email Integration** 🔄 (Pending)

## Architecture Decisions

### Database Schema
Create a new `resume_health_checks` table to store:

```sql
CREATE TABLE resume_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash VARCHAR(64),
  analysis_result JSONB,
  status VARCHAR(32) DEFAULT 'pending',
  processing_error TEXT,
  email_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resume_health_checks_email ON resume_health_checks(email);
CREATE INDEX idx_resume_health_checks_file_hash ON resume_health_checks(file_hash);
CREATE INDEX idx_resume_health_checks_status ON resume_health_checks(status);
CREATE INDEX idx_resume_health_checks_created_at ON resume_health_checks(created_at);
```

**Key Decision**: No `user_id` foreign key since users aren't authenticated. Email is the primary identifier.

#### Analysis Result JSON Structure
```typescript
interface AnalysisResult {
  score: number; // 0-100 ATS compatibility score
  issues: {
    category: 'parsing' | 'formatting' | 'structure' | 'content';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
  }[];
  recommendations: string[];
  parsingFlags: {
    hasTables: boolean;
    hasColumns: boolean;
    hasHeadersFooters: boolean;
    hasImages: boolean;
    hasUnusualFonts: boolean;
    hasTextBoxes: boolean;
  };
  sections: {
    hasContact: boolean;
    hasExperience: boolean;
    hasEducation: boolean;
    hasSkills: boolean;
  };
  keywordCoverage: {
    technicalSkills: string[];
    softSkills: string[];
    industryTerms: string[];
  };
  processedAt: string;
}
```

### Route Structure
1. **Frontend Page**: `/health-check/page.tsx` ✅ (Implemented)
2. **API Endpoint**: `/api/health-check/route.ts` - Handle file upload + email collection
3. **Analysis Endpoint**: `/api/health-check/analyze/route.ts` - AI-powered ATS analysis (or use Inngest)
4. **Email Service**: Integrate with Resend or existing email infrastructure

### File Upload Flow
1. User uploads CV (PDF/DOC/DOCX, max 10MB) + provides email
2. Backend validates file type/size
3. Calculate file hash (SHA-256) to prevent duplicate processing
4. Check if identical file already analyzed (cache results)
5. Upload to R2/S3 storage (reuse existing `lib/storage.ts`)
6. Extract text content (reuse existing extraction logic from `/api/resumes/upload`)
7. Queue analysis job (use Inngest for async processing)
8. Run ATS health check analysis
9. Store results in database
10. Send email with results
11. Return success response

### ATS Health Check Analysis (AI)

#### Prompt Structure
```typescript
const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyzer specializing in resume compatibility. 
Analyze the provided resume text and evaluate its ATS-readiness across multiple dimensions.

Provide your analysis in the following JSON structure:
{
  "score": <number 0-100>,
  "issues": [
    {
      "category": "parsing" | "formatting" | "structure" | "content",
      "severity": "critical" | "warning" | "info",
      "title": "Brief issue title",
      "description": "Detailed explanation"
    }
  ],
  "recommendations": ["Specific actionable recommendation 1", ...],
  "sections": {
    "hasContact": <boolean>,
    "hasExperience": <boolean>,
    "hasEducation": <boolean>,
    "hasSkills": <boolean>
  },
  "keywordCoverage": {
    "technicalSkills": ["skill1", "skill2", ...],
    "softSkills": ["skill1", "skill2", ...],
    "industryTerms": ["term1", "term2", ...]
  }
}`;

const userPrompt = `Analyze this resume for ATS compatibility:

${resumeText}

Focus on:
1. Section structure and organization
2. Keyword presence and density
3. Formatting issues that may break ATS parsing
4. Contact information completeness
5. Action verbs and achievement statements
6. Overall professional presentation

Provide a comprehensive score and specific recommendations for improvement.`;
```

#### Analysis Criteria
Using OpenAI GPT-4o-mini, analyze resume for:

1. **Parsing Issues** (Critical)
   - Tables (ATS may misread)
   - Multi-column layouts
   - Headers/footers with important info
   - Images and graphics
   - Text boxes

2. **Formatting Problems** (Warning)
   - Unusual fonts
   - Inconsistent formatting
   - Special characters
   - Poor spacing

3. **Structure Issues** (Warning)
   - Missing standard sections
   - Unclear section headers
   - Chronological inconsistencies
   - Length issues (too long/short)

4. **Content Issues** (Info)
   - Weak action verbs
   - Missing keywords
   - Vague descriptions
   - No quantifiable achievements

5. **ATS Compatibility Score**: 0-100 scale
   - 90-100: Excellent ATS compatibility
   - 75-89: Good, minor improvements
   - 60-74: Moderate, several issues
   - Below 60: Poor, needs significant work

6. **Keyword Coverage**: Basic skill/keyword detection

7. **Section Structure**: Proper section headings
   - Contact Information
   - Professional Summary/Objective
   - Work Experience
   - Education
   - Skills
   - Additional Sections

8. **Actionable Recommendations**: List of 5-10 specific fixes

### Email Template

#### HTML Email Structure
Create a responsive HTML email template with:

**Header**
- ResuMate AI logo
- "Your ATS Health Check Results"

**Score Section**
- Large, visual score (0-100)
- Color-coded gauge:
  - Green (90-100): Excellent
  - Yellow (75-89): Good
  - Orange (60-74): Needs Work
  - Red (<60): Critical Issues

**Critical Issues Section**
- Top 3 most important issues
- Each with:
  - Icon indicator
  - Issue title
  - Brief description

**Recommendations Section**
- Numbered list of 5-7 specific fixes
- Prioritized by impact

**Detailed Analysis Section** (Collapsible)
- Section-by-section breakdown
- Keyword coverage summary
- Formatting flags

**CTA Section**
- "Want AI-powered optimization?"
- Button: "Sign Up for Full Access"
- Links to `/auth/signup`

**Footer**
- Privacy policy link
- Unsubscribe option
- Company info

#### Email Service Setup

**Recommended: Resend**
```bash
npm install resend
```

**Environment Variables**
```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=health-check@resumate.ai
```

**Implementation**
```typescript
// lib/email-service.ts
import { Resend } from 'resend';
import { HealthCheckEmailTemplate } from './email-templates/health-check';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendHealthCheckEmail(data: {
  email: string;
  score: number;
  issues: any[];
  recommendations: string[];
}) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: data.email,
    subject: `Your ATS Health Check Results (Score: ${data.score}/100)`,
    html: HealthCheckEmailTemplate(data),
  });
}
```

### API Routes

#### POST /api/health-check

**Request**
```typescript
{
  email: string;
  file: File; // multipart/form-data
}
```

**Response**
```typescript
{
  success: boolean;
  message: string;
  checkId?: string;
  estimatedWaitTime?: string; // "2-3 minutes"
}
```

**Implementation Steps**
1. Validate email format
2. Validate file type and size
3. Calculate file hash
4. Check for cached results (same hash)
5. Upload to R2/S3
6. Create database record (status: 'pending')
7. Trigger Inngest job for analysis
8. Return success response

**Error Handling**
- 400: Invalid email or file format
- 413: File too large
- 429: Rate limit exceeded (3 checks per email per day)
- 500: Server error

#### Analysis Flow (Inngest Job or Inline)

**Option A: Inngest Job** (Recommended)
```typescript
// lib/inngest/functions/analyze-health-check.ts
export const analyzeHealthCheck = inngest.createFunction(
  { id: "analyze-health-check" },
  { event: "health-check/analyze" },
  async ({ event, step }) => {
    const { checkId } = event.data;
    
    // Step 1: Get check from database
    const check = await step.run("get-check", async () => {
      return await getHealthCheckById(checkId);
    });
    
    // Step 2: Extract text from file
    const content = await step.run("extract-text", async () => {
      return await extractTextFromFile(check.file_url);
    });
    
    // Step 3: Run AI analysis
    const analysis = await step.run("analyze-resume", async () => {
      return await analyzeResumeHealth(content);
    });
    
    // Step 4: Update database
    await step.run("update-database", async () => {
      return await updateHealthCheck(checkId, {
        analysis_result: analysis,
        status: 'completed'
      });
    });
    
    // Step 5: Send email
    await step.run("send-email", async () => {
      return await sendHealthCheckEmail({
        email: check.email,
        ...analysis
      });
    });
  }
);
```

**Option B: Inline Processing** (Simpler, but blocks request)
```typescript
// Directly in POST /api/health-check
const analysis = await analyzeResumeHealth(extractedText);
await updateHealthCheck(checkId, { analysis_result: analysis });
await sendHealthCheckEmail({ email, ...analysis });
```

### Rate Limiting

**Strategy**: Use existing Upstash Redis integration

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "24 h"),
  prefix: "health-check",
});

// In API route
const { success } = await ratelimit.limit(email);
if (!success) {
  return NextResponse.json(
    { error: "Rate limit exceeded. Maximum 3 checks per day." },
    { status: 429 }
  );
}
```

### TypeScript Interfaces

```typescript
// lib/db.ts additions

export interface ResumeHealthCheck {
  id: string;
  email: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  file_hash?: string;
  analysis_result?: AnalysisResult;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  email_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResult {
  score: number;
  issues: Issue[];
  recommendations: string[];
  parsingFlags: ParsingFlags;
  sections: SectionCheck;
  keywordCoverage: KeywordCoverage;
  processedAt: string;
}

export interface Issue {
  category: 'parsing' | 'formatting' | 'structure' | 'content';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface ParsingFlags {
  hasTables: boolean;
  hasColumns: boolean;
  hasHeadersFooters: boolean;
  hasImages: boolean;
  hasUnusualFonts: boolean;
  hasTextBoxes: boolean;
}

export interface SectionCheck {
  hasContact: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
}

export interface KeywordCoverage {
  technicalSkills: string[];
  softSkills: string[];
  industryTerms: string[];
}

// CRUD functions
export async function createHealthCheck(data: Omit<ResumeHealthCheck, 'id' | 'created_at' | 'updated_at'>): Promise<ResumeHealthCheck>;
export async function getHealthCheckById(id: string): Promise<ResumeHealthCheck | undefined>;
export async function getHealthChecksByEmail(email: string): Promise<ResumeHealthCheck[]>;
export async function updateHealthCheck(id: string, data: Partial<ResumeHealthCheck>): Promise<ResumeHealthCheck | undefined>;
```

### Cost Optimization

1. **File Hash Caching**
   - Calculate SHA-256 hash of uploaded file
   - Check if identical file already analyzed
   - Serve cached results (valid for 30 days)
   - Saves OpenAI API costs and processing time

2. **OpenAI Model Selection**
   - Use `gpt-4o-mini` for cost-effective analysis
   - Temperature: 0 (consistent results)
   - Max tokens: 2000 (analysis output)

3. **Storage Optimization**
   - Delete files after 30 days
   - Compress files before storage
   - Use R2 (free egress)

4. **Email Optimization**
   - Use Resend free tier (3,000 emails/month)
   - Batch email sending if needed
   - HTML template compression

### Environment Variables Required

```env
# Email Service (NEW)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=health-check@resumate.ai

# All other vars already exist:
# DATABASE_URL (Neon PostgreSQL)
# R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
# OPENAI_API_KEY
# UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
# INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY (optional for async processing)
```

## Implementation Phases

### Phase 1: Frontend UI ✅ (Completed)
- Created `/health-check` page
- Drag-and-drop file upload UI
- FAQ accordion
- Form validation (client-side)
- Placeholder submission

### Phase 2: Database & Infrastructure
1. Create database migration: `scripts/create-resume-health-checks-table.sql`
2. Add TypeScript interfaces to `lib/db.ts`
3. Add CRUD functions to `lib/db.ts`
4. Add file hash generation utility

### Phase 3: API Routes
1. Create `/api/health-check/route.ts` (POST endpoint)
2. Implement file upload validation
3. Implement rate limiting
4. Implement file hash checking (cache)
5. Create database record
6. Trigger analysis (Inngest or inline)

### Phase 4: AI Analysis
1. Create `lib/ats-analyzer.ts`
2. Implement `analyzeResumeHealth()` function
3. Create OpenAI prompt for ATS analysis
4. Parse and structure analysis results
5. Add error handling and retries

### Phase 5: Email Integration
1. Install Resend: `npm install resend`
2. Add environment variables
3. Create `lib/email-service.ts`
4. Create email template: `lib/email-templates/health-check.tsx`
5. Implement email sending logic
6. Add email sent tracking in database

### Phase 6: Inngest Job (Optional)
1. Create `lib/inngest/functions/analyze-health-check.ts`
2. Implement step-by-step analysis job
3. Add error handling and retries
4. Register function in Inngest

### Phase 7: Testing & Polish
1. Test file upload with various formats
2. Test email delivery
3. Verify AI analysis quality with sample resumes
4. Add comprehensive error handling
5. Mobile responsiveness verification
6. Add analytics tracking
7. Performance optimization

## Security Considerations

1. **File Upload Security**
   - Validate MIME types
   - Scan for malware (optional, use ClamAV or VirusTotal)
   - Sanitize file names
   - Size limits (10MB max)

2. **Email Privacy**
   - Don't store passwords
   - Allow opt-out/unsubscribe
   - GDPR compliance (allow data deletion)
   - Rate limiting to prevent abuse

3. **Rate Limiting**
   - 3 checks per email per day
   - IP-based rate limiting (optional)
   - CAPTCHA for suspicious activity (optional)

4. **Data Retention**
   - Delete files after 30 days
   - Delete analysis after 90 days
   - Allow users to request deletion

## Success Metrics

### Technical Metrics
- API response time < 2s (without analysis)
- Analysis completion time < 60s
- Email delivery rate > 98%
- File upload success rate > 99%
- OpenAI API cost per check < $0.05

### Business Metrics
- Health check submissions per day
- Email open rate
- Click-through rate to sign-up
- Conversion from health check to sign-up
- User satisfaction (feedback)

## Future Enhancements

1. **Real-time Analysis**
   - WebSocket for live progress updates
   - Streaming analysis results

2. **Enhanced Reports**
   - PDF download of full report
   - Side-by-side comparison (before/after)
   - Video explanation of issues

3. **Integration with Main Platform**
   - Auto-import analyzed resume to dashboard
   - One-click optimization from health check

4. **Advanced Features**
   - Multi-language support
   - Industry-specific analysis
   - Job description comparison
   - ATS simulator (preview how ATS sees resume)

5. **Social Features**
   - Share results (anonymized)
   - Success stories
   - Community feedback

## Monitoring & Observability

1. **Logging**
   - Health check submissions
   - Analysis completion time
   - Email delivery status
   - Error rates

2. **Alerts**
   - High error rate (> 5%)
   - Email delivery failures
   - OpenAI API errors
   - Database issues

3. **Dashboards**
   - Daily submission count
   - Average analysis score
   - Popular issues detected
   - Conversion funnel

## Documentation

### User-facing
- FAQ section on health check page
- Email template with clear instructions
- Privacy policy for health checks

### Developer-facing
- API documentation
- Database schema documentation
- Email template customization guide
- Troubleshooting guide

---

## Quick Start (When Implementing Backend)

1. **Install dependencies**
   ```bash
   npm install resend
   ```

2. **Add environment variables**
   ```env
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=health-check@resumate.ai
   ```

3. **Run database migration**
   ```bash
   psql $DATABASE_URL -f scripts/create-resume-health-checks-table.sql
   ```

4. **Update lib/db.ts**
   - Add TypeScript interfaces
   - Add CRUD functions

5. **Create API route**
   ```bash
   mkdir -p app/api/health-check
   touch app/api/health-check/route.ts
   ```

6. **Implement AI analyzer**
   ```bash
   touch lib/ats-analyzer.ts
   ```

7. **Create email template**
   ```bash
   mkdir -p lib/email-templates
   touch lib/email-templates/health-check.tsx
   ```

8. **Test end-to-end**
   - Upload test resume
   - Verify database record
   - Check email delivery
   - Validate analysis quality

---

**Last Updated**: January 2025  
**Status**: Phase 1 (Frontend UI) Complete  
**Next Steps**: Implement Phase 2 (Database & Infrastructure)
