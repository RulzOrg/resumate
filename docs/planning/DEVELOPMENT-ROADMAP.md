# Development Roadmap

This document outlines the prioritized tasks for ResuMate AI based on comprehensive codebase analysis completed on 2025-09-30.

**Last Updated**: 2025-11-04

---

## Critical Priority Tasks

### Task 1: Implement Real Usage Tracking System
**Status**: Not Started
**Estimated Effort**: 4-6 hours
**Priority**: 🔴 Critical
**Why**: Users can currently bypass subscription limits. All usage checks return mock data instead of real database queries.

**Current Issue**:
- Location: `lib/subscription.ts:121`
- Mock data used: `{ resumeOptimizations: 2, jobAnalyses: 3, resumeVersions: 2 }`
- No enforcement of Free/Pro/Enterprise tier limits

**Steps**:
1. Create `usage_tracking` table in database schema
   - Fields: user_id, action_type, timestamp, metadata
2. Add tracking functions to `lib/db.ts`
   - `trackUsage(userId, actionType)`
   - `getUserUsage(userId, period)`
3. Update `lib/subscription.ts` to query real data
   - Replace mock data with database queries
   - Add caching to avoid excessive DB calls
4. Add usage incrementing to relevant API endpoints
   - `/api/resumes/optimize/*`
   - `/api/jobs/analyze`
   - `/api/resumes/versions`
5. Test with different subscription tiers
   - Verify limits enforced correctly
   - Test edge cases (limit boundaries)

**Success Criteria**:
- [ ] Usage tracking table created and deployed
- [ ] Real-time usage queries implemented
- [ ] Subscription limits properly enforced
- [ ] No users can exceed their plan limits

---

### Task 2: Test and Wire New API Endpoints
**Status**: Not Started
**Estimated Effort**: 3-4 hours
**Priority**: 🔴 Critical
**Why**: Recently implemented `/api/score` and `/api/resumes/rephrase-bullet` endpoints are untested. Step 2/3 of optimizer depends on these.

**Current Issue**:
- Endpoints exist but no integration testing
- UI not connected to new endpoints
- Risk of bugs in production

**Steps**:
1. Test `/api/score` endpoint
   - Test with various resume/job combinations
   - Verify scoring algorithm accuracy
   - Test error handling (missing data, invalid input)
2. Test `/api/resumes/rephrase-bullet` endpoint
   - Test bullet point rephrasing
   - Verify AI response quality
   - Test rate limiting
3. Test `/api/resumes/rewrite` endpoint
   - Test full resume rewrite flow
   - Verify evidence integration
4. Add integration tests
   - Create test suite in `tests/integration/`
   - Add CI/CD integration
5. Wire up to optimizer UI (Step 2/3)
   - Connect Step 2 to `/api/score`
   - Connect Step 3 to `/api/rephrase-bullet`
   - Test full 3-step flow

**Success Criteria**:
- [ ] All endpoints tested with various inputs
- [ ] Integration tests added and passing
- [ ] UI successfully calls endpoints
- [ ] Full optimizer flow works end-to-end

---

### Task 3: Fix React Hook Dependency Warnings
**Status**: Not Started
**Estimated Effort**: 1-2 hours
**Priority**: 🔴 Critical
**Why**: Missing dependencies in useEffect/useCallback can cause stale closures and unexpected bugs.

**Current Issues**:
1. `components/jobs/analyze-job-dialog.tsx:173`
   - Missing dependencies in useEffect
2. `components/jobs/analyze-job-dialog.tsx:244`
   - Missing dependencies in useCallback
3. `components/optimization/optimizer-ui-only.tsx:317`
   - Missing dependencies in useEffect

**Steps**:
1. Fix `analyze-job-dialog.tsx` line 173
   - Add missing dependencies or use functional updates
2. Fix `analyze-job-dialog.tsx` line 244
   - Add missing dependencies or refactor
3. Fix `optimizer-ui-only.tsx` line 317
   - Add missing dependencies or use refs
4. Run ESLint to verify all fixes
   - `npm run lint`
5. Test affected components
   - Manual testing of job analysis dialog
   - Manual testing of optimizer UI

**Success Criteria**:
- [ ] No ESLint warnings for React hooks
- [ ] Components behave correctly after fixes
- [ ] No stale closure bugs introduced

---

### Task 4: Complete Evidence-Based Optimizer UI
**Status**: 80% Complete
**Estimated Effort**: 6-8 hours
**Priority**: 🔴 Critical
**Why**: This is the core differentiating feature. Backend exists but UI wiring incomplete.

**Current State**:
- ✅ Resume indexing with Qdrant vector search implemented
- ✅ Evidence extraction and embedding working
- ✅ Semantic search functionality complete
- ❌ UI integration for evidence selection missing
- ❌ Evidence scoring visualization missing
- ❌ Bullet-level editing with evidence verification missing

**Steps**:
1. Wire up Step 2 to call `/api/score`
   - Pass resume and job analysis data
   - Handle loading states
   - Display score breakdown
2. Display evidence list with highlighting
   - Show matched evidence from user's resume
   - Highlight keywords and matches
   - Add relevance scores
3. Allow evidence selection
   - Checkboxes or cards for evidence items
   - Preview selected evidence
4. Show match score breakdown
   - Overall fit score
   - Category-by-category breakdown
   - Visual score indicators
5. Connect to `/api/resumes/rewrite` in Step 3
   - Pass selected evidence
   - Show before/after comparison
   - Allow bullet-level editing
6. Test full 3-step flow
   - Upload resume → Analyze job → Optimize with evidence

**Success Criteria**:
- [ ] Step 2 displays match scores and evidence
- [ ] Users can select evidence to include
- [ ] Step 3 generates optimized resume with selected evidence
- [ ] Full flow works without errors
- [ ] UI is intuitive and responsive

---

## High Priority Tasks

### Task 5: Implement or Remove Cover Letter Feature
**Status**: Not Started
**Estimated Effort**: 8-10 hours (implement) OR 15 minutes (remove)
**Priority**: 🟡 High
**Why**: Feature is promised on dashboard but not implemented. Creates bad UX.

**Current Issue**:
- Location: `app/dashboard/page.tsx:188-197`
- "Generate Letter" button exists but no implementation
- Users expect functionality that doesn't exist

**Option A - Implement** (8-10 hours):
1. Create API endpoint `/api/cover-letters/generate`
   - Accept resume data and job analysis
   - Use OpenAI to generate cover letter
   - Store generated cover letters
2. Design cover letter UI component
   - Form for additional context
   - Preview and editing interface
   - Download/copy functionality
3. Add to dashboard and optimize flow
   - Integrate with existing job analysis
   - Add to optimization results
4. Update pricing to reflect feature availability
   - Determine which tiers get cover letters

**Option B - Remove** (15 minutes):
1. Remove CTA card from `app/dashboard/page.tsx`
2. Remove from pricing feature lists (if mentioned)
3. Add to future roadmap document

**Success Criteria** (Option A):
- [ ] Cover letter generation API working
- [ ] UI allows users to generate and edit cover letters
- [ ] Cover letters stored in database
- [ ] Feature accessible from dashboard

**Success Criteria** (Option B):
- [ ] CTA card removed from dashboard
- [ ] No broken promises to users
- [ ] Feature documented in roadmap for future

---

### Task 6: Add Settings and Support Pages
**Status**: Not Started
**Estimated Effort**: 2-3 hours
**Priority**: 🟡 High
**Why**: Navigation links exist but lead to 404 errors. Basic user expectation.

**Current Issues**:
1. Settings link: `app/dashboard/page.tsx:208` → `/dashboard/settings` (404)
2. Support link: `app/dashboard/page.tsx:212` → `/support` (404)

**Steps**:
1. Create `/app/dashboard/settings/page.tsx`
   - User preferences section
   - Account management
   - Subscription management (link to Stripe portal)
   - Danger zone (delete account)
2. Add user preferences functionality
   - Default resume format preference
   - Email notifications toggle
   - Dark/light mode preference (if applicable)
3. Create `/app/support/page.tsx` OR redirect
   - Option A: Create FAQ page
   - Option B: Redirect to external help center
   - Option C: Email support form
4. Test navigation
   - Verify all links work
   - Test settings save/load
   - Test support page loads

**Success Criteria**:
- [ ] Settings page exists and functional
- [ ] Users can update preferences
- [ ] Support page exists or redirects appropriately
- [ ] No 404 errors in navigation

---

## Medium Priority Tasks

### Task 7: Implement Structured Logging
**Status**: Not Started
**Estimated Effort**: 3-4 hours
**Priority**: 🟢 Medium
**Why**: 83 console.log/console.error statements across 19 files. Needs production-ready logging.

**Current Issue**:
- Console logging throughout codebase
- No log levels or filtering
- Potential performance overhead
- Difficult to debug production issues

**Steps**:
1. Choose logging library
   - Option A: winston (full-featured)
   - Option B: pino (fast, JSON-structured)
   - Recommendation: pino for Next.js
2. Create logger utility in `lib/logger.ts`
   - Export logger instance
   - Configure log levels
   - Add request context tracking
3. Replace console.log with structured logs
   - Search and replace across codebase
   - Use appropriate log levels (debug, info, warn, error)
   - Add structured metadata
4. Add log levels and filtering
   - Development: debug level
   - Production: info level
   - Environment-based configuration
5. Configure for production/development
   - JSON format for production
   - Pretty format for development
   - Consider log aggregation service (Datadog, LogRocket)

**Success Criteria**:
- [ ] No console.log statements in production code
- [ ] Structured logging with levels implemented
- [ ] Production logs are JSON formatted
- [ ] Development logs are human-readable
- [ ] Request tracing possible

---

### Task 8: Add Server-Side File Validation
**Status**: Not Started
**Estimated Effort**: 2-3 hours
**Priority**: 🟢 Medium
**Why**: Currently only client-side validation (10MB limit). Security and data integrity risk.

**Current Issue**:
- Location: `components/onboarding/onboarding-flow.tsx`
- Only client-side validation
- Server can receive invalid files

**Steps**:
1. Add file size validation to all upload endpoints
   - `/api/resumes/upload`
   - `/api/resumes/[id]/upload`
   - Maximum 10MB enforcement server-side
2. Add file type verification
   - Use magic numbers (file signatures), not just extensions
   - Verify PDF, DOCX, TXT formats
   - Reject executables and suspicious files
3. Add virus scanning (optional but recommended)
   - Consider ClamAV or cloud service (VirusTotal API)
   - Quarantine suspicious files
4. Add error handling for invalid uploads
   - Clear error messages to users
   - Log suspicious upload attempts
   - Rate limit upload endpoints
5. Test with various file types
   - Valid: PDF, DOCX, TXT
   - Invalid: EXE, ZIP, JS
   - Oversized files (>10MB)
   - Malformed files

**Success Criteria**:
- [ ] Server-side file size validation enforced
- [ ] File type verification using magic numbers
- [ ] Clear error messages for invalid uploads
- [ ] All upload endpoints protected
- [ ] Security improved against malicious uploads

---

### Task 9: Expand Test Coverage
**Status**: Minimal (1 E2E test)
**Estimated Effort**: 8-12 hours
**Priority**: 🟢 Medium
**Why**: Low confidence in refactoring. Only 1 E2E test exists.

**Current State**:
- ✅ 1 E2E test: `tests/e2e/smoke-optimizer.spec.ts`
- ❌ No unit tests
- ❌ No integration tests for API routes
- ❌ No component tests

**Steps**:
1. Add unit tests for `lib/match.ts` (scoring logic)
   - Test score calculation
   - Test evidence matching
   - Test edge cases (empty resume, no matches)
2. Add unit tests for `lib/subscription.ts` (limits)
   - Test limit checking (once real usage implemented)
   - Test tier permissions
   - Test usage calculations
3. Add integration tests for key API routes
   - `/api/resumes/upload`
   - `/api/jobs/analyze`
   - `/api/resumes/optimize`
   - Test success and error cases
4. Add E2E tests for onboarding flow
   - Complete onboarding as new user
   - Upload resume
   - Set job targets
   - Verify redirection
5. Add E2E tests for optimization flow
   - Upload resume
   - Analyze job
   - Run optimizer
   - Download result
6. Set up CI/CD to run tests
   - GitHub Actions workflow
   - Run tests on PR
   - Block merge if tests fail

**Success Criteria**:
- [ ] Unit test coverage >70% for critical functions
- [ ] Integration tests for all API routes
- [ ] E2E tests for critical user flows
- [ ] CI/CD runs tests automatically
- [ ] Confidence in refactoring improved

---

### Task 10: Environment Variable Validation
**Status**: Not Started
**Estimated Effort**: 2-3 hours
**Priority**: 🟢 Medium
**Why**: Hardcoded Stripe fallbacks could fail silently. No startup validation.

**Current Issue**:
- Location: `lib/pricing.ts`
- Fallback Stripe IDs: `'price_1234567890'`
- No validation on startup

**Steps**:
1. Create `lib/env.ts` with Zod schema
   - Define required environment variables
   - Define optional variables with defaults
   - Add type-safe exports
2. Validate all required env vars on startup
   - DATABASE_URL
   - CLERK keys
   - OPENAI_API_KEY
   - STRIPE keys
   - Qdrant configuration
3. Provide clear error messages
   - Which variables are missing
   - What they're used for
   - How to obtain them
4. Document all required env vars
   - Update CLAUDE.md
   - Create .env.example
   - Add setup instructions
5. Update deployment docs
   - Vercel environment variables
   - Production vs development differences

**Success Criteria**:
- [ ] Environment validation on app startup
- [ ] Clear error messages for missing vars
- [ ] All env vars documented
- [ ] .env.example created
- [ ] Type-safe environment access

---

## Low Priority Tasks

### Task 11: Implement Job Application Tracking
**Status**: Schema exists, features not implemented
**Estimated Effort**: 10-15 hours
**Priority**: 🔵 Low
**Why**: Database schema exists but no UI. Could be valuable feature.

**Current State**:
- ✅ Database schema: `job_applications` table
- ✅ CRUD functions in `lib/db.ts`
- ❌ No UI for tracking applications
- ❌ No status updates
- ❌ No application history

**Steps**:
1. Design application tracking UI
   - Kanban board view (Applied, Interview, Offer, Rejected)
   - List view with filters
   - Detail view for each application
2. Create dashboard section for applications
   - `/app/dashboard/applications/page.tsx`
   - Add navigation item
3. Add status update functionality
   - Drag-and-drop status changes
   - Timeline of status updates
   - Notes and follow-up reminders
4. Connect to optimized resumes
   - Link application to specific resume version
   - Track which resume was used
5. Add filters and search
   - Filter by status, date, company
   - Search by job title or company name
   - Sort by date applied

**Success Criteria**:
- [ ] Application tracking UI exists
- [ ] Users can add/edit/delete applications
- [ ] Status updates work smoothly
- [ ] Applications linked to resume versions
- [ ] Filters and search functional

---

### Task 12: Implement User Profiles
**Status**: Schema exists, features not implemented
**Estimated Effort**: 6-8 hours
**Priority**: 🔵 Low
**Why**: Better personalization possible but not critical.

**Current State**:
- ✅ Database schema: `user_profiles` table
- ✅ CRUD functions in `lib/db.ts`
- ❌ No profile editing UI
- ❌ No skills management
- ❌ No preferences configuration

**Steps**:
1. Design profile editing UI
   - Personal information section
   - Skills and expertise
   - Industry and job preferences
2. Add skills management
   - Add/remove skills
   - Skill proficiency levels
   - Skill categories
3. Add preferences
   - Preferred resume format (chronological, functional, hybrid)
   - Writing style preference (formal, casual, technical)
   - Default optimization settings
4. Connect to resume generation
   - Use profile data to enhance AI prompts
   - Pre-fill resume sections from profile
5. Test profile updates
   - Save/load profile data
   - Verify data persistence
   - Test with resume generation

**Success Criteria**:
- [ ] Profile editing UI functional
- [ ] Skills management working
- [ ] Preferences saved and applied
- [ ] Profile data enhances AI generation
- [ ] All changes persist correctly

---

### Task 13: Implement Analytics Dashboard
**Status**: Not implemented (promised in Enterprise plan)
**Estimated Effort**: 15-20 hours
**Priority**: 🔵 Low
**Why**: Promised in pricing but not critical for launch.

**Current Issue**:
- Mentioned in Enterprise plan features
- No implementation exists

**Steps**:
1. Design analytics dashboard
   - Application success rate
   - Resume views/downloads
   - Optimization trends
   - Time-to-hire metrics
2. Create data collection system
   - Track user actions
   - Aggregate statistics
   - Calculate metrics
3. Build dashboard UI
   - Charts and graphs (recharts, visx)
   - Exportable reports
   - Date range filters
4. Add insights and recommendations
   - AI-powered insights
   - Success pattern detection
   - Optimization suggestions
5. Implement for Enterprise tier only
   - Check subscription level
   - Upsell to lower tiers

**Success Criteria**:
- [ ] Analytics dashboard visible to Enterprise users
- [ ] Meaningful metrics displayed
- [ ] Data accurate and up-to-date
- [ ] Insights actionable
- [ ] Reports exportable

---

### Task 14: Code Cleanup and Documentation
**Status**: Ongoing
**Estimated Effort**: 4-6 hours
**Priority**: 🔵 Low
**Why**: Code quality and maintainability.

**Steps**:
1. Remove all console.log statements (after Task 7)
2. Add JSDoc comments to complex functions
3. Update CLAUDE.md with latest architecture
4. Create API documentation (OpenAPI/Swagger)
5. Add inline comments for complex logic
6. Remove dead code and unused imports
7. Standardize code formatting (Prettier)

**Success Criteria**:
- [ ] No console.log in production code
- [ ] Complex functions documented
- [ ] API documentation complete
- [ ] Dead code removed
- [ ] Consistent code style

---

## Task Dependencies

```
Task 1 (Usage Tracking) → Must be done before Task 9 (Tests for subscription.ts)
Task 2 (API Testing) → Must be done before Task 4 (Evidence UI)
Task 3 (React Hooks) → Independent, can be done anytime
Task 4 (Evidence UI) → Depends on Task 2
Task 5 (Cover Letter) → Independent decision needed
Task 6 (Settings/Support) → Independent
Task 7 (Logging) → Should be done before Task 14
Task 8 (File Validation) → Independent
Task 9 (Testing) → Can start anytime, easier after Task 1
Task 10 (Env Validation) → Independent
Task 11-14 (Low Priority) → Can be done after critical tasks
```

---

## Recommended Execution Order

### Phase 1: Critical Fixes (Week 1)
1. Task 3: Fix React Hook Warnings (1-2 hours) ✅ Quick win
2. Task 1: Implement Usage Tracking (4-6 hours) ✅ Critical for business
3. Task 2: Test New APIs (3-4 hours) ✅ Unblock optimizer
4. Task 4: Complete Evidence UI (6-8 hours) ✅ Core feature

### Phase 2: User Experience (Week 2)
5. Task 6: Settings/Support Pages (2-3 hours) ✅ Fix broken links
6. Task 5: Cover Letter Decision (15 min or 8-10 hours) ✅ Improve UX
7. Task 8: Server File Validation (2-3 hours) ✅ Security

### Phase 3: Quality & Polish (Week 3)
8. Task 7: Structured Logging (3-4 hours) ✅ Production readiness
9. Task 10: Env Validation (2-3 hours) ✅ Deployment safety
10. Task 9: Expand Tests (8-12 hours) ✅ Confidence building

### Phase 4: Features & Growth (Week 4+)
11. Task 11: Application Tracking (10-15 hours) ⚪ Nice to have
12. Task 12: User Profiles (6-8 hours) ⚪ Enhancement
13. Task 13: Analytics Dashboard (15-20 hours) ⚪ Enterprise feature
14. Task 14: Code Cleanup (4-6 hours) ⚪ Ongoing

---

## Task Selection Guide

**Choose based on your current goals:**

- **Want to launch soon?** → Focus on Phase 1 & 2 (Critical + UX)
- **Want to monetize?** → Start with Task 1 (Usage Tracking)
- **Want to differentiate?** → Prioritize Task 4 (Evidence UI)
- **Want stability?** → Focus on Phase 3 (Quality & Testing)
- **Want growth features?** → Move to Phase 4 (Application Tracking, Analytics)

**Need a decision?** Start with **Task 3** (React Hooks) - it's quick, low-risk, and unblocks other work.

---

## Progress Tracking

Update this section as tasks are completed:

- [ ] Task 1: Usage Tracking
- [ ] Task 2: API Testing
- [ ] Task 3: React Hooks
- [ ] Task 4: Evidence UI
- [ ] Task 5: Cover Letter
- [ ] Task 6: Settings/Support
- [ ] Task 7: Logging
- [ ] Task 8: File Validation
- [ ] Task 9: Testing
- [ ] Task 10: Env Validation
- [ ] Task 11: Application Tracking
- [ ] Task 12: User Profiles
- [ ] Task 13: Analytics
- [ ] Task 14: Code Cleanup

**Last Updated**: 2025-09-30