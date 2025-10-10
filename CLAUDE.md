# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Core Development:**
- `npm install` - Install dependencies (use npm, not yarn/pnpm - follows package-lock.json)
- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Build for production
- `npm run start` - Run production build locally
- `npm run lint` - Run ESLint and Next.js linting

**Database Setup:**
- `python scripts/setup-database.py` - Initialize complete database schema
- `python scripts/run-migration.py` - Run database migrations
- Requires DATABASE_URL environment variable

## Architecture Overview

This is a **Next.js 14 App Router** AI-powered resume optimization platform with the following stack:

**Core Technologies:**
- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Styling**: TailwindCSS v4 + shadcn/ui (Radix UI components)
- **Authentication**: Clerk with custom dark theme
- **Database**: Neon PostgreSQL with edge-compatible queries
- **AI Integration**: OpenAI SDK for resume analysis and optimization
- **Payments**: Stripe for subscription management
- **Deployment**: Vercel-optimized

**Key Architecture Patterns:**
- All UI components follow **shadcn/ui** patterns in `components/ui/`
- Server Actions and API routes handle business logic
- Database layer uses **Neon edge-compatible SQL** with proper TypeScript interfaces
- Authentication middleware protects `/dashboard` and `/api` routes
- File uploads and resume processing through secure API endpoints

## File Organization

**App Router Structure:**
- `app/` - Next.js 14 App Router pages and API routes
  - `api/resumes/` - Resume CRUD, upload, analysis, optimization
  - `api/jobs/` - Job description analysis and URL fetching
  - `api/billing/` - Stripe checkout and portal management
  - `dashboard/` - Protected user dashboard pages
  - `auth/` - Login/signup pages with Clerk integration

**Component Architecture:**
- `components/ui/` - Base shadcn/ui components (Button, Dialog, Card, etc.)
- `components/dashboard/` - Dashboard-specific components (ResumeList, UploadDialog)
- `components/jobs/` - Job analysis components (AnalyzeJobDialog)
- `components/optimization/` - Resume optimization wizards and results

**Data Layer:**
- `lib/db.ts` - All database functions with proper TypeScript interfaces
- `lib/auth-utils.ts` - Authentication helpers and user management
- `lib/utils.ts` - General utilities and Tailwind class merging
- `middleware.ts` - Clerk authentication middleware for protected routes

**Database Schema:**
- `users_sync` - User accounts synced with Clerk
- `resumes` - Resume storage with content extraction
- `job_analysis` - AI-analyzed job descriptions with structured data
- `optimized_resumes` - AI-optimized resumes with improvement tracking
- `job_applications` - Application tracking and status management

## Development Guidelines

**Styling & Components:**
- Use **shadcn/ui** components from `components/ui/` directory
- Follow existing Tailwind class organization: layout → spacing → colors
- Dark theme is primary - ensure all new components support it
- Use `clsx` for conditional styling and `class-variance-authority` for variants

**Database Development:**
- All database operations use **Neon edge SQL** through `lib/db.ts`
- Use existing TypeScript interfaces (User, Resume, JobAnalysis, etc.)
- Follow the established UUID generation and soft delete patterns
- Database queries are optimized for edge runtime compatibility

**Authentication Flow:**
- All protected routes require Clerk authentication
- Use `getAuthenticatedUser()` for pages requiring user context
- User creation is automatic via Clerk webhooks and database sync
- Subscription status affects feature availability

**API Development:**
- API routes follow RESTful patterns with proper error handling
- File uploads use secure temporary storage with content extraction
- AI integration uses structured prompts with proper token management
- Rate limiting and authentication on all sensitive endpoints

## Environment Setup

**Required Environment Variables:**
```bash
DATABASE_URL="postgresql://..." # Neon database URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..." # Clerk public key
CLERK_SECRET_KEY="sk_..." # Clerk secret key
OPENAI_API_KEY="sk-..." # OpenAI API key for AI features
STRIPE_SECRET_KEY="sk_..." # Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..." # Stripe public key
STRIPE_WEBHOOK_SECRET="whsec_..." # Stripe webhook secret
NEXT_PUBLIC_APP_URL="https://..." # App URL for callbacks
```

**Development Setup:**
1. Copy environment variables to `.env.local`
2. Run `python scripts/setup-database.py` to initialize database
3. Start development with `npm run dev`
4. Database migrations are in `scripts/` directory

## AI Integration Patterns

**Resume Analysis:**
- Content extraction from PDF/DOCX files through dedicated API endpoints
- Structured analysis with keyword extraction and skill identification
- Match scoring between resumes and job descriptions

**Job Description Processing:**
- URL fetching and content extraction for job postings
- AI-powered analysis extracting requirements, skills, and company culture
- Structured data storage for optimization algorithms

**Resume Optimization:**
- AI-driven content suggestions based on job analysis
- Keyword integration and skill highlighting
- Version tracking with before/after comparison

## Testing & Quality

**Code Quality:**
- TypeScript strict mode enabled with proper type safety
- ESLint configuration with Next.js rules
- Build process includes type checking and linting

**Manual Testing Focus:**
- Authentication flow with Clerk integration
- File upload and processing pipeline
- AI analysis and optimization accuracy
- Stripe payment integration

## Special Considerations

**Edge Runtime Compatibility:**
- Database queries optimized for Vercel Edge Runtime
- File processing uses streaming for large documents
- AI API calls include proper timeout and retry logic

**Security:**
- File uploads validated and sanitized
- User data isolation through proper database queries
- API endpoints protected with authentication middleware
- Stripe webhooks verified with signature validation

## AI Dev Tasks

Use these files when I request structured feature development using PRDs:
- `/ai-dev-tasks/create-prd.md`
- `/ai-dev-tasks/generate-tasks.md`
- `/ai-dev-tasks/process-task-list.md`