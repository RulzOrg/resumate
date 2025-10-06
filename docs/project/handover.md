# ResuMate AI - Engineering Handover Document

**Project Name:** ResuMate AI
**Purpose:** AI-powered resume optimization platform with job matching, resume analysis, and intelligent content generation
**Last Updated:** 2025-10-01
**Status:** Production-ready, deployed on Vercel

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Features Implemented](#features-implemented)
5. [Database Schema](#database-schema)
6. [Environment Setup](#environment-setup)
7. [Development Workflow](#development-workflow)
8. [API Routes](#api-routes)
9. [Third-Party Integrations](#third-party-integrations)
10.[Testing](#testing)
11.[Deployment](#deployment)
12.[Known Issues & Notes](#known-issues--notes)

---

## Project Overview

ResuMate AI is a full-stack SaaS application that helps job seekers optimize their resumes for specific job postings using AI. The platform analyzes job descriptions, extracts key requirements, and generates tailored resumes with improved keyword matching and ATS compatibility.

### Key Value Propositions
- **AI-powered job analysis** with requirement extraction
- **Resume optimization** tailored to specific job postings
- **Vector-based matching** for intelligent scoring
- **Version management** for resume iterations
- **Subscription-based monetization** with Stripe

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Language:** TypeScript 5
- **Styling:** TailwindCSS v4
- **Component Library:** shadcn/ui (Radix UI primitives)
- **Forms:** React Hook Form + Zod validation
- **State Management:** React Context + Server Components
- **Icons:** Lucide React
- **Themes:** next-themes (dark mode support)

### Backend
- **Runtime:** Node.js (Vercel Edge Functions compatible)
- **API:** Next.js API Routes
- **Database ORM:** Prisma 6 + @neondatabase/serverless
- **Database:** PostgreSQL (Neon serverless)
- **Authentication:** Clerk (email/password + OAuth providers)
- **File Storage:** Cloudflare R2 / AWS S3
- **Vector Database:** Qdrant (for AI scoring and semantic search)

### AI/ML Services
- **LLM Provider:** OpenAI (GPT-4o, GPT-4o-mini)
- **SDK:** Vercel AI SDK (@ai-sdk/openai, ai package)
- **Embeddings:** text-embedding-3-large (3072 dimensions)
- **Document Parsing:** LlamaCloud API (LlamaParse)
- **Vector Search:** Qdrant JS Client

### Payments & Subscriptions
- **Payment Processor:** Stripe (Switching to Polar)
- **Webhooks:** Clerk webhooks + Stripe webhooks (Svix verification)
- **Plans:** Free, Pro (monthly/annual), Enterprise (monthly/annual)

### DevOps & Infrastructure
- **Hosting:** Vercel
- **Analytics:** Vercel Analytics
- **Rate Limiting:** Upstash Redis
- **Background Jobs:** Inngest (optional, configured for background processing)
- **Monitoring:** Console logging + Vercel runtime logs

### Development Tools
- **Package Manager:** npm (strict, uses package-lock.json)
- **Linting:** ESLint + Next.js config
- **Testing:** Vitest (unit tests) + Playwright (E2E tests)
- **Type Safety:** TypeScript strict mode
- **Environment Variables:** dotenv-cli for scripts

---

## Architecture

### Application Structure

```
ai-resume/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Auth pages (Clerk)
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── page.tsx              # Main dashboard
│   │   ├── jobs/                 # Job analysis pages
│   │   ├── optimize/             # Resume optimization wizard
│   │   ├── optimized/            # Optimized resume results
│   │   └── versions/             # Resume version history
│   ├── api/                      # API routes
│   │   ├── resumes/              # Resume CRUD, upload, extract
│   │   ├── jobs/                 # Job analysis
│   │   ├── billing/              # Stripe checkout/portal
│   │   ├── webhooks/             # Clerk + Stripe webhooks
│   │   ├── score/                # AI scoring endpoint
│   │   ├── ingest/               # Background ingestion
│   │   └── health/               # Health checks
│   ├── onboarding/               # User onboarding flow
│   ├── pricing/                  # Pricing page
│   └── layout.tsx                # Root layout with providers
├── components/                   # React components
│   ├── ui/                       # shadcn/ui base components
│   ├── dashboard/                # Dashboard-specific components
│   ├── jobs/                     # Job analysis components
│   ├── optimization/             # Resume optimization UI
│   └── providers/                # Context providers
├── lib/                          # Utility libraries
│   ├── db.ts                     # Database functions (Prisma + raw SQL)
│   ├── auth.ts                   # Clerk auth utilities
│   ├── llm.ts                    # OpenAI LLM wrapper
│   ├── embeddings.ts             # Vector embeddings
│   ├── qdrant.ts                 # Qdrant client
│   ├── match.ts                  # Vector search & scoring
│   ├── llamaparse.ts             # LlamaParse document extraction
│   ├── stripe.ts                 # Stripe client
│   ├── subscription.ts           # Subscription logic
│   ├── pricing.ts                # Pricing tiers
│   ├── storage.ts                # R2/S3 file storage
│   ├── rate-limit.ts             # Rate limiting
│   └── error-handler.ts          # Error handling
├── prisma/
│   └── schema.prisma             # Database schema
├── scripts/                      # Database migration scripts
│   ├── setup-database.py         # Initial database setup
│   └── run-migration.py          # Run migrations
├── middleware.ts                 # Clerk authentication middleware
├── .env.example                  # Environment variable template
└── package.json                  # Dependencies and scripts
```

### Data Flow

1. **User Authentication**
   - Clerk handles sign-up/sign-in
   - Webhook syncs user to `users_sync` table
   - Middleware protects `/dashboard` and `/api/*` routes

2. **Resume Upload & Processing**
   - Upload → R2/S3 storage
   - LlamaParse extracts text content
   - Structured data extraction via OpenAI
   - Embeddings generated and stored in Qdrant
   - Resume metadata stored in PostgreSQL

3. **Job Analysis**
   - User inputs job URL or description
   - AI extracts requirements, skills, keywords
   - Data stored in `job_analysis` table

4. **Resume Optimization**
   - User selects resume + job analysis
   - AI generates optimized resume content
   - Match score calculated via vector search
   - Optimized version saved with metadata

5. **AI Scoring (Step 2)**
   - Vector search in Qdrant for resume evidence
   - Semantic matching against job requirements
   - Score computed based on keyword coverage

---

## Features Implemented

### 1. Authentication & User Management
- **Provider:** Clerk
- **Features:**
  - Email/password authentication
  - OAuth providers (Google, GitHub, etc.)
  - Custom branded auth pages
  - User profile management
  - Webhook sync to internal database
  - Onboarding flow for new users

### 2. Resume Management
- **Upload:**
  - Support for PDF and DOCX files
  - File validation (size, type)
  - Storage in R2/S3
  - Duplicate detection via file hash

- **Processing:**
  - LlamaParse extraction (fast/premium modes)
  - Structured data parsing (name, email, experience, education, skills)
  - Content indexing in Qdrant vector database
  - Processing status tracking

- **Features:**
  - Set primary resume
  - Resume versioning
  - Master resume concept
  - Resume duplication
  - Content rewriting
  - Bullet point rephrasing

### 3. Job Analysis
- **Input Methods:**
  - Job URL (web scraping)
  - Manual paste of job description

- **Analysis:**
  - AI-powered extraction of:
    - Job title
    - Company name
    - Required skills
    - Preferred skills
    - Experience level
    - Keywords
    - Key requirements
    - Salary range
    - Location
    - Benefits

- **Storage:**
  - Saved to `job_analysis` table
  - Linked to user account

### 4. Resume Optimization
- **Workflow:**
  - Step 1: Select master resume
  - Step 2: Review job and AI score
  - Step 3: Generate optimized resume

- **AI Capabilities:**
  - Tailored content generation
  - Keyword integration
  - Skill highlighting
  - ATS optimization
  - Before/after match scoring
  - Structured output (markdown format)

- **Features:**
  - Optimization summary with changes
  - Downloadable optimized resumes
  - Comparison view (original vs optimized)

### 5. AI Scoring & Matching
- **Vector Search:**
  - Qdrant-based semantic search
  - Text-embedding-3-large embeddings (3072D)
  - Top-K evidence retrieval

- **Scoring Algorithm:**
  - Keyword coverage calculation
  - Weighted skill matching
  - Experience level alignment
  - Overall match score (0-100)

### 6. Subscription & Billing
- **Plans:**
  - Free: 3 optimizations/month, 5 job analyses
  - Pro: Unlimited optimizations, advanced features
  - Enterprise: White-label, priority support

- **Integration:**
  - Stripe Checkout for subscriptions
  - Stripe Customer Portal for management
  - Webhook handling for subscription updates
  - Usage limit enforcement

### 7. Additional Features
- **Onboarding:** Multi-step onboarding for new users
- **Rate Limiting:** Upstash Redis-based rate limiting on API routes
- **Error Handling:** Centralized error handling with user-friendly messages
- **Health Checks:** `/api/health/qdrant` for vector DB status
- **Dark Mode:** System-aware dark mode with manual toggle
- **Responsive Design:** Mobile-first responsive UI

---

## Database Schema

### Prisma Schema Location
`/Users/jeberulz/Documents/AI-projects/ai-resume/ai-resume/prisma/schema.prisma`

### Tables

#### 1. `users_sync` (schema: `neon_auth`)
User accounts synced from Clerk

```prisma
- id: String (PK)
- email: String (unique)
- name: String
- clerkUserId: String (unique, nullable)
- subscriptionStatus: String (default: "free")
- subscriptionPlan: String (default: "free")
- subscriptionPeriodEnd: DateTime (nullable)
- stripeCustomerId: String (unique, nullable)
- stripeSubscriptionId: String (unique, nullable)
- createdAt: DateTime
- updatedAt: DateTime
- deletedAt: DateTime (nullable, soft delete)
```

**Relations:**
- `resumes`: Resume[]
- `jobAnalyses`: JobAnalysis[]
- `jobApplications`: JobApplication[]

#### 2. `resumes` (schema: `public`)
Resume files and parsed content

```prisma
- id: UUID (PK)
- userId: String (FK → users_sync.id)
- title: String
- fileName: String
- fileUrl: String
- fileType: String
- fileSize: Int
- fileHash: String (nullable, for deduplication)
- kind: String (default: "uploaded", values: uploaded/master/optimized)
- processingStatus: String (default: "pending")
- processingError: String (nullable)
- parsedSections: Json (nullable, structured resume data)
- extractedAt: DateTime (nullable)
- sourceMetadata: Json (nullable)
- isPrimary: Boolean (default: false)
- warnings: String[] (default: [])
- modeUsed: String (nullable, llamaparse mode)
- truncated: Boolean (default: false)
- pageCount: Int (nullable)
- createdAt: DateTime
- updatedAt: DateTime
- deletedAt: DateTime (nullable)
```

**Indexes:**
- userId
- createdAt
- kind
- processingStatus
- fileHash

#### 3. `job_analysis` (schema: `public`)
AI-analyzed job descriptions

```prisma
- id: UUID (PK)
- userId: String (FK → users_sync.id)
- jobUrl: String (nullable)
- jobTitle: String
- companyName: String
- jobDescription: String (nullable)
- parsedData: Json (nullable)
- requirements: String[] (default: [])
- preferredSkills: String[] (default: [])
- experienceLevel: String (nullable)
- employmentType: String (nullable)
- location: String (nullable)
- salaryRangeMin: Int (nullable)
- salaryRangeMax: Int (nullable)
- salaryCurrency: String (nullable)
- benefits: String[] (default: [])
- companySize: String (nullable)
- industry: String (nullable)
- keywords: String[] (default: [])
- analyzedAt: DateTime (nullable)
- extractionMethod: String (nullable)
- processingError: String (nullable)
- createdAt: DateTime
- updatedAt: DateTime
- deletedAt: DateTime (nullable)
```

**Indexes:**
- userId
- createdAt

#### 4. `job_applications` (schema: `public`)
Application tracking (basic implementation)

```prisma
- id: UUID (PK)
- userId: String (FK → users_sync.id)
- resumeId: UUID (FK → resumes.id)
- jobTitle: String
- companyName: String
- jobUrl: String (nullable)
- jobDescription: String (nullable)
- status: String (default: "pending")
- appliedAt: DateTime
- createdAt: DateTime
- updatedAt: DateTime
```

**Indexes:**
- userId
- resumeId

### Qdrant Collections

#### Collection: `resume_bullets`
Vector embeddings for resume content

**Structure:**
```typescript
{
  id: string,  // Format: {userId}_{timestamp}_{index}
  vector: number[],  // 3072-dimensional embedding
  payload: {
    user_id: string,
    resume_id: string,
    section: string,  // e.g., "Experience", "Skills"
    text: string,
    keywords: string[],
    category: string
  }
}
```

---

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Clerk Authentication (REQUIRED)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# App Configuration (REQUIRED)
NEXT_PUBLIC_APP_URL=http://localhost:3002  # or https://your-domain.com

# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
NEON_API_KEY=your_neon_api_key  # Optional, for programmatic access

# OpenAI (REQUIRED for AI features)
OPENAI_API_KEY=sk-proj-xxx

# Qdrant Vector Database (REQUIRED for AI scoring)
QDRANT_URL=http://localhost:6333  # Local dev
# QDRANT_URL=https://xyz.aws.cloud.qdrant.io:6333  # Production (Qdrant Cloud)
QDRANT_API_KEY=your_qdrant_api_key  # Required for Qdrant Cloud
QDRANT_COLLECTION=resume_bullets

# Stripe Payment Integration (REQUIRED for billing)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxx

# Storage - Cloudflare R2 (choose R2 OR S3)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_REGION=  # Leave empty for R2
R2_PUBLIC_BASE_URL=https://pub-xxx.r2.dev

# Alternative: AWS S3 (if not using R2)
# AWS_ACCESS_KEY_ID=your_aws_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret
# AWS_REGION=us-east-1
# S3_BUCKET_NAME=your_bucket_name
# S3_PUBLIC_BASE_URL=https://your_bucket.s3.amazonaws.com

# LlamaCloud for Document Parsing (REQUIRED for resume upload)
LLAMACLOUD_API_KEY=llx-xxx
LLAMAPARSE_MODE=fast  # or "premium"
LLAMAPARSE_ESCALATE_MODE=premium
LLAMAPARSE_TIMEOUT_MS=600000  # 10 minutes
LLAMAPARSE_MAX_PAGES=50
LLAMAPARSE_MIN_CHARS=100
LLAMAPARSE_MIN_CHARS_PER_PAGE=200

# Upstash Redis - Rate Limiting (OPTIONAL but recommended)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Inngest - Background Jobs (OPTIONAL)
INNGEST_EVENT_KEY=  # Leave empty for dev
INNGEST_SIGNING_KEY=
```

### Setup Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd ai-resume
   ```

2. **Install Dependencies**
   ```bash
   npm ci  # Use npm ci, not npm install, for reproducible builds
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Setup Database**
   ```bash
   # Ensure DATABASE_URL is set in .env.local
   python3 scripts/setup-database.py
   ```

5. **Start Qdrant (for local development)**
   ```bash
   npm run docker:qdrant
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

7. **Access Application**
   - Open http://localhost:3002 (or port specified in dev server)

---

## Development Workflow

### Available Scripts

```bash
# Development
npm run dev                    # Start Next.js dev server (localhost:3002)
npm run build                  # Production build
npm run start                  # Run production build locally
npm run lint                   # ESLint and type checking

# Database
python3 scripts/setup-database.py       # Initialize database schema
python3 scripts/run-migration.py        # Run migrations

# Qdrant
npm run docker:qdrant          # Start Qdrant via Docker Compose

# Testing
npm run test                   # Run Vitest unit tests
npm run test:watch             # Watch mode for tests
npm run test:coverage          # Coverage report
npm run test:e2e               # Run Playwright E2E tests
npm run test:e2e:install       # Install Playwright browsers

# Utilities
npm run check-schema           # Validate database schema
npm run check-env              # Validate environment variables
```

### Development Best Practices

1. **Type Safety**
   - Always use TypeScript strict mode
   - Define Zod schemas for API inputs/outputs
   - Use Prisma types for database queries

2. **Error Handling**
   - Use `handleApiError()` from `lib/error-handler.ts`
   - Wrap async operations in try-catch
   - Return user-friendly error messages

3. **Authentication**
   - Use `await auth()` from Clerk to get userId
   - Use `getOrCreateUser()` to sync with internal DB
   - Protect routes with middleware

4. **Database Queries**
   - Prefer Prisma for type-safe queries
   - Use raw SQL only when necessary
   - Always filter by userId for user-scoped data

5. **AI Calls**
   - Use `callJsonModel()` from `lib/llm.ts` for structured outputs
   - Set appropriate timeouts
   - Handle rate limits and errors gracefully

---

## API Routes

### Resume Management

#### `POST /api/resumes/upload`
Upload a new resume file
- **Auth:** Required
- **Rate Limit:** 10 req/15min per user
- **Body:** FormData with `file` field
- **Response:** `{ resume: Resume }`

#### `GET /api/resumes`
List all user resumes
- **Auth:** Required
- **Query:** `kind` (optional: "master", "uploaded")
- **Response:** `{ resumes: Resume[] }`

#### `GET /api/resumes/[id]`
Get single resume details
- **Auth:** Required
- **Response:** `{ resume: Resume }`

#### `DELETE /api/resumes/[id]`
Delete a resume
- **Auth:** Required
- **Response:** `{ success: true }`

#### `POST /api/resumes/[id]/primary`
Set resume as primary
- **Auth:** Required
- **Response:** `{ resume: Resume }`

#### `POST /api/resumes/extract`
Extract content from uploaded resume
- **Auth:** Required
- **Body:** `{ resume_id: string }`
- **Response:** `{ resume: Resume, extracted_text: string }`

#### `POST /api/resumes/optimize`
Generate optimized resume
- **Auth:** Required
- **Rate Limit:** 5 req/5min per user
- **Body:** `{ resume_id: string, job_analysis_id: string }`
- **Response:** `{ optimized_resume: OptimizedResume }`

#### `POST /api/resumes/rephrase-bullet`
Rephrase a single bullet point
- **Auth:** Required
- **Body:** `{ bullet_text: string }`
- **Response:** `{ rephrased: string }`

#### `POST /api/resumes/rewrite`
Rewrite resume content
- **Auth:** Required
- **Body:** `{ resume_id: string, instructions: string }`
- **Response:** `{ rewritten_content: string }`

#### `POST /api/resumes/duplicate`
Duplicate a resume
- **Auth:** Required
- **Body:** `{ resume_id: string }`
- **Response:** `{ resume: Resume }`

### Job Analysis

#### `POST /api/jobs/analyze`
Analyze a job description
- **Auth:** Required
- **Rate Limit:** 10 req/15min per user
- **Body:** `{ job_url?: string, job_description?: string }`
- **Response:** `{ job_analysis: JobAnalysis }`

#### `POST /api/jobs/preview-analysis`
Preview job analysis without saving
- **Auth:** Required
- **Body:** `{ job_description: string }`
- **Response:** `{ analysis: JobAnalysis }`

### Scoring

#### `POST /api/score`
Calculate AI match score
- **Auth:** Required
- **Body:** `{ job_analysis_id: string, resume_id?: string, queries?: string[], top_k?: number }`
- **Response:** `{ evidence: Evidence[], score: Score }`

### Indexing

#### `POST /api/index-resume`
Index resume in Qdrant
- **Auth:** Required
- **Body:** `{ resume_id: string }`
- **Response:** `{ indexed: true, count: number }`

#### `POST /api/ingest`
Background ingestion endpoint (Inngest)
- **Auth:** Inngest signature
- **Body:** Inngest event payload
- **Response:** Inngest response

### Billing

#### `POST /api/billing/create-checkout`
Create Stripe checkout session
- **Auth:** Required
- **Body:** `{ price_id: string }`
- **Response:** `{ url: string }`

#### `POST /api/billing/portal`
Create Stripe customer portal session
- **Auth:** Required
- **Response:** `{ url: string }`

### Webhooks

#### `POST /api/webhooks/clerk`
Clerk user events webhook
- **Auth:** Clerk webhook signature (Svix)
- **Events:** `user.created`, `user.updated`, `user.deleted`

#### `POST /api/webhooks/stripe`
Stripe subscription events webhook
- **Auth:** Stripe webhook signature
- **Events:** `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`

### Health & Debug

#### `GET /api/health/qdrant`
Check Qdrant connection status
- **Auth:** None
- **Response:** `{ status: "healthy" | "unhealthy", url: string, collection: string, collectionExists: boolean, responseTime: string }`

---

## Third-Party Integrations

### 1. Clerk (Authentication)
**Purpose:** User authentication and management

**Setup:**
1. Create account at https://clerk.com
2. Create a new application
3. Enable email/password + OAuth providers
4. Configure webhooks to `/api/webhooks/clerk`
5. Copy keys to `.env.local`

**Features Used:**
- Email/password sign-up/sign-in
- OAuth providers (Google, GitHub)
- User metadata
- Webhooks for user sync

### 2. Neon (PostgreSQL Database)
**Purpose:** Serverless PostgreSQL database

**Setup:**
1. Create account at https://neon.tech
2. Create a new project
3. Copy connection string to `DATABASE_URL`
4. Run `python3 scripts/setup-database.py`

**Features Used:**
- Serverless pooling
- Edge-compatible queries
- Auto-scaling

### 3. OpenAI
**Purpose:** LLM for resume optimization and analysis

**Setup:**
1. Create account at https://platform.openai.com
2. Generate API key
3. Set `OPENAI_API_KEY` in `.env.local`

**Models Used:**
- `gpt-4o`: Resume optimization, complex analysis
- `gpt-4o-mini`: Quick analysis, extraction
- `text-embedding-3-large`: Vector embeddings (3072D)

**Typical Usage:**
- Resume content generation: ~2000-4000 tokens
- Job analysis: ~1000-2000 tokens
- Embeddings: ~500 tokens per resume section

### 4. Qdrant (Vector Database)
**Purpose:** Semantic search and AI scoring

**Setup (Local):**
```bash
npm run docker:qdrant
```

**Setup (Production - Qdrant Cloud):**
1. Create account at https://cloud.qdrant.io
2. Create a cluster (free tier available)
3. Copy cluster URL and API key
4. Set environment variables:
   ```
   QDRANT_URL=https://xyz.aws.cloud.qdrant.io:6333
   QDRANT_API_KEY=your_api_key
   QDRANT_COLLECTION=resume_bullets
   ```

**Collection Schema:**
- **Name:** `resume_bullets`
- **Vector Size:** 3072
- **Distance:** Cosine

**Critical Note:** AI scoring (Step 2) will fail without Qdrant configured in production.

### 5. LlamaCloud (Document Parsing)
**Purpose:** High-quality PDF/DOCX text extraction

**Setup:**
1. Create account at https://cloud.llamaindex.ai
2. Generate API key
3. Set `LLAMACLOUD_API_KEY`

**Modes:**
- `fast`: Quick extraction (~5-10s per document)
- `premium`: Higher accuracy with OCR (~15-30s per document)

**Configuration:**
```bash
LLAMAPARSE_MODE=fast
LLAMAPARSE_ESCALATE_MODE=premium  # Fallback for low-quality extractions
LLAMAPARSE_TIMEOUT_MS=600000  # 10 minutes
```

### 6. Stripe (Payments)
**Purpose:** Subscription billing

**Setup:**
1. Create account at https://stripe.com
2. Create products and pricing plans
3. Configure webhooks to `/api/webhooks/stripe`
4. Copy keys and price IDs to `.env.local`

**Products:**
- Pro Monthly: `STRIPE_PRICE_PRO_MONTHLY`
- Pro Annual: `STRIPE_PRICE_PRO_YEARLY`
- Enterprise Monthly: `STRIPE_PRICE_ENTERPRISE_MONTHLY`
- Enterprise Annual: `STRIPE_PRICE_ENTERPRISE_YEARLY`

**Webhook Events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### 7. Cloudflare R2 / AWS S3 (File Storage)
**Purpose:** Resume file storage

**Setup (R2):**
1. Create Cloudflare account
2. Enable R2
3. Create bucket
4. Generate API tokens
5. Set R2_* environment variables

**Setup (S3):**
1. Create AWS account
2. Create S3 bucket
3. Configure IAM user with S3 permissions
4. Set AWS_* environment variables

**Note:** Only one storage provider is needed.

### 8. Upstash Redis (Rate Limiting)
**Purpose:** API rate limiting

**Setup:**
1. Create account at https://upstash.com
2. Create Redis database
3. Copy REST URL and token
4. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

**Optional:** If not configured, rate limiting falls back to in-memory (resets on deployment).

### 9. Inngest (Background Jobs)
**Purpose:** Asynchronous resume processing

**Setup:**
1. Create account at https://inngest.com
2. Copy event key and signing key
3. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`

**Optional:** For development, Inngest Dev Server can be used without keys.

---

## Testing

### Unit Tests (Vitest)
Located in: `**/*.test.ts` or `**/*.spec.ts`

```bash
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

**Note:** Unit test coverage is currently minimal. Primary testing is manual and E2E.

### E2E Tests (Playwright)
Located in: `e2e/` or `**/*.e2e.ts`

```bash
npm run test:e2e:install  # Install browsers
npm run test:e2e          # Run E2E tests
```

**E2E Test Mode:**
Set `E2E_TEST_MODE=1` in `.env.local` to bypass authentication for testing.

### Manual Testing Checklist

**Authentication:**
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign in with OAuth provider
- [ ] Sign out
- [ ] Onboarding flow for new users

**Resume Management:**
- [ ] Upload PDF resume
- [ ] Upload DOCX resume
- [ ] View resume list
- [ ] Set primary resume
- [ ] Delete resume
- [ ] Duplicate resume
- [ ] View resume processing status

**Job Analysis:**
- [ ] Analyze job from URL
- [ ] Analyze job from pasted description
- [ ] View job analysis results
- [ ] View job list

**Resume Optimization:**
- [ ] Complete Step 1 (select resume)
- [ ] Complete Step 2 (review job with AI score)
- [ ] Complete Step 3 (generate optimized resume)
- [ ] View optimized resume
- [ ] Compare original vs optimized
- [ ] Download optimized resume

**Billing:**
- [ ] View pricing page
- [ ] Create checkout session
- [ ] Complete payment (test mode)
- [ ] Access customer portal
- [ ] Verify subscription limits

**Error Handling:**
- [ ] Rate limit enforcement
- [ ] Invalid file upload
- [ ] Missing environment variables
- [ ] Qdrant connection failure
- [ ] Stripe webhook failure

---

## Deployment

### Vercel Deployment

**Prerequisites:**
- Vercel account
- GitHub repository connected
- All third-party services configured

**Steps:**

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com
   - Click "Import Project"
   - Select your repository

3. **Configure Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add all variables from `.env.example`
   - **Critical for production:**
     - `QDRANT_URL` (use Qdrant Cloud URL)
     - `QDRANT_API_KEY`
     - `OPENAI_API_KEY`
     - `DATABASE_URL`
     - All Clerk variables
     - All Stripe variables
     - Storage variables (R2 or S3)

4. **Deploy**
   - Vercel will automatically deploy on push to main
   - Build command: `npm run build`
   - Output directory: `.next`

5. **Setup Webhooks**
   - **Clerk:** Add webhook URL: `https://your-app.vercel.app/api/webhooks/clerk`
   - **Stripe:** Add webhook URL: `https://your-app.vercel.app/api/webhooks/stripe`

6. **Verify Deployment**
   - Visit `/api/health/qdrant` to check Qdrant connection
   - Test sign-up flow
   - Test resume upload
   - Test optimization workflow

### Production Checklist

- [ ] All environment variables set in Vercel
- [ ] Qdrant Cloud cluster created and configured
- [ ] Clerk production instance configured
- [ ] Stripe production mode enabled
- [ ] Database migrations run
- [ ] R2/S3 bucket configured with CORS
- [ ] Webhooks configured and verified
- [ ] Rate limiting enabled (Upstash)
- [ ] Analytics enabled (Vercel Analytics)
- [ ] Domain configured (if custom domain)

### Database Migrations

**Initial Setup:**
```bash
python3 scripts/setup-database.py
```

**Future Migrations:**
```bash
python3 scripts/run-migration.py
```

**Manual SQL:**
Connect to Neon database and run SQL directly if needed.

---

## Known Issues & Notes

### Critical Notes

1. **Qdrant is Required for AI Scoring**
   - The Step 2 "Review Job" feature will fail without Qdrant
   - Local dev: Use Docker Compose (`npm run docker:qdrant`)
   - Production: Must configure Qdrant Cloud or self-hosted instance
   - Health check: `/api/health/qdrant`

2. **LlamaParse Timeouts**
   - Premium mode can take 30-60 seconds for complex documents
   - Timeout set to 10 minutes (`LLAMAPARSE_TIMEOUT_MS=600000`)
   - If extraction fails, retry with `fast` mode

3. **Stripe Test Mode**
   - Use test credit cards in development
   - Switch to production keys for live payments
   - Update webhook endpoints for production

4. **Package Manager**
   - **Must use npm**, not yarn or pnpm
   - `package-lock.json` is the source of truth
   - Vercel deployment uses npm by default

5. **Middleware Onboarding Redirect**
   - New users are redirected to `/onboarding`
   - Completed in `middleware.ts` after Clerk auth
   - Skipped for API routes and onboarding route itself

### Performance Considerations

- **Resume Processing:** 10-60 seconds depending on mode
- **Optimization:** 5-15 seconds for GPT-4o generation
- **Vector Search:** <500ms for typical queries
- **Database Queries:** <100ms with Neon edge

### Security Notes

- All API routes are protected with Clerk authentication
- Rate limiting enforced on expensive operations
- File uploads validated for type and size
- Webhook signatures verified (Clerk + Stripe)
- SQL injection prevented via Prisma
- XSS protection via React escaping

### Future Improvements

- [ ] Add comprehensive unit tests
- [ ] Implement usage tracking for subscription limits
- [ ] Add cover letter generation
- [ ] Add bulk resume optimization
- [ ] Implement collaborative features
- [ ] Add analytics dashboard
- [ ] Improve error recovery for failed uploads
- [ ] Add resume templates
- [ ] Implement ATS scoring visualization

---

## Contact & Support

For questions about this codebase, refer to:
- **Documentation:** `/docs` directory (various technical specs)
- **CLAUDE.md:** AI assistant guidance
- **README.md:** Quick start guide
- **GitHub Issues:** Report bugs and feature requests

---

**Document Version:** 1.0
**Last Updated:** 2025-10-01
**Prepared For:** Senior Full-Stack Engineer Handover
