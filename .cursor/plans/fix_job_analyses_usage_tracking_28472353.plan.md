---
name: Fix Job Analyses Usage Tracking
overview: Add usage tracking increment when job analyses are created, similar to how resume optimizations track usage. This will fix the job analyses indicator showing 0 for pro customers.
todos: []
---

# Fi

x Job Analyses Usage Tracking

## Problem

Job analyses are not incrementing usage tracking when created, causing the indicator to always show "0 of ∞" for pro customers. Resume optimizations correctly call `incrementUsage`, but job analyses do not.

## Solution

Add `incrementUsage` call in `createJobAnalysisWithVerification` function after a successful job analysis creation, but only for new records (not updates).

## Changes

### 1. Update `createJobAnalysisWithVerification` in [lib/db.ts](lib/db.ts)

After line 1139 (after the job analysis is successfully created/upserted), add usage tracking:

- Import `incrementUsage` at the top if not already imported (check current imports)
- After determining `isNewRecord`, if it's a new record, call `incrementUsage(user.id, 'job_analysis', user.subscription_plan || 'free')`
- This should be done after the successful insert but before returning the analysis
- Handle errors gracefully - if increment fails, log it but don't fail the job analysis creation

The logic should be:

```typescript
const isNewRecord = analysis.id === id

// Only increment usage for new records, not updates
if (isNewRecord) {
  try {
    await incrementUsage(user.id, 'job_analysis', user.subscription_plan || 'free')
  } catch (usageError) {
    // Log but don't fail - usage tracking is non-critical
    console.error('[createJobAnalysis] Failed to increment usage:', usageError)
  }
}
```



### 2. Verify imports

Check that `incrementUsage` is exported and available in [lib/db.ts](lib/db.ts). If it's not already imported in the same file, ensure it's accessible (it should be since it's defined in the same file).

## Notes

- The `ON CONFLICT` clause means existing job analyses will be updated, not re-created, so we only increment for truly new records