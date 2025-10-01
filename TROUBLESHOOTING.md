# Troubleshooting Guide - Generate CV Feature

## Common Issues and Solutions

### 1. Clerk Module Error: `Cannot find module './vendor-chunks/@clerk.js'`

**Error:**
```
Error: Cannot find module './vendor-chunks/@clerk.js'
Require stack:
- /Users/.../webpack-runtime.js
```

**Cause:** Stale Next.js build cache after adding new dependencies or routes

**Solution:**
```bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run build

# Or for development
rm -rf .next
npm run dev
```

**Prevention:** Run this after:
- Adding new npm packages
- Updating Clerk or auth dependencies
- Creating new API routes
- Git branch switches

---

### 2. Database Migration Not Found

**Error:**
```
relation "cv_versions" does not exist
```

**Cause:** Database migration hasn't been run

**Solution:**
```bash
# Option 1: Using psql
psql "$DATABASE_URL" -f scripts/migrations/003_cv_generation_tables.sql

# Option 2: Using Node.js
node -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(process.env.DATABASE_URL);
const migration = fs.readFileSync('scripts/migrations/003_cv_generation_tables.sql', 'utf-8');
sql(migration).then(() => console.log('✅ Migration complete'));
"

# Verify tables exist
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM cv_versions;"
```

---

### 3. Type Errors in Schemas

**Error:**
```
Type 'X' is not assignable to type 'Y'
```

**Cause:** Schema definitions don't match database or API responses

**Solution:**
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Check specific file
npx tsc --noEmit lib/schemas.generate.ts
```

**Common Fixes:**
- Ensure Zod schemas match database column types
- Check for optional vs required fields
- Verify enum values match exactly

---

### 4. Evidence Search Returns Empty

**Error:**
```
Evidence retrieval error: ...
```

**Cause:** Qdrant collection not initialized or empty

**Solution:**
```typescript
// Check if collection exists
import { ensureCollection } from "@/lib/qdrant";
await ensureCollection();

// Check if resume has been indexed
// Re-upload resume to trigger indexing
```

**Workaround:** Generation continues without evidence (uses full resume text)

---

### 5. OpenAI Generation Timeout

**Error:**
```
Generation timeout or rate limit
```

**Cause:** 
- OpenAI rate limits
- Network issues
- Prompt too long

**Solution:**
```typescript
// Check API key
console.log("OpenAI key:", process.env.OPENAI_API_KEY ? "✓" : "✗");

// Reduce prompt length in context
// Limit evidence to top 5 instead of 10
evidence = await searchEvidence(user.id, queries, 5);

// Increase timeout in generateObject call
const { object } = await generateObject({
  model: openai("gpt-4o"),
  schema: CvDraftSchema,
  messages: [...],
  temperature: 0,
  maxRetries: 3, // Add retries
});
```

---

### 6. Variant Selection Not Persisting

**Error:**
```
Selected variant reverts to unselected
```

**Cause:** Database update failed or state not refreshed

**Solution:**
```bash
# Check database function
psql "$DATABASE_URL" -c "
SELECT variant_id, label, is_selected 
FROM cv_variants 
WHERE version_id = 'YOUR_VERSION_ID';
"

# Verify only one is selected
# Should return exactly 1 row with is_selected = true
```

**Fix in Code:**
```typescript
// Add error handling
try {
  await selectCvVariant(variantId, userId);
  // Force refresh from database
  const updated = await getCvVariant(variantId, userId);
  setSelectedVariantId(updated.variant_id);
} catch (error) {
  console.error("Selection failed:", error);
}
```

---

### 7. Export Returns Empty or Invalid

**Error:**
```
Downloaded file is empty or corrupted
```

**Cause:** 
- Variant not found
- JSON serialization issue
- Draft structure mismatch

**Solution:**
```typescript
// Verify variant exists and has draft
const variant = await getCvVariant(variantId, userId);
console.log("Variant draft:", JSON.stringify(variant.draft, null, 2));

// Check for JSONB parsing
// Draft should be parsed object, not string
if (typeof variant.draft === 'string') {
  variant.draft = JSON.parse(variant.draft);
}
```

---

### 8. Build Errors with New Components

**Error:**
```
Module not found: Can't resolve '@/components/ui/...'
```

**Cause:** shadcn/ui component not installed

**Solution:**
```bash
# Install missing component
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add tabs

# Or check components.json for configured path
cat components.json | grep "components"
```

---

### 9. Eligibility Check Always Fails

**Error:**
```
{ "allowed": false, "score": 0, "must_have_coverage": 0 }
```

**Cause:**
- Resume content_text is empty
- Job analysis missing required fields
- Scoring API error

**Solution:**
```typescript
// Check resume has content
const resume = await getResumeById(resumeId, userId);
console.log("Resume content length:", resume.content_text?.length || 0);

// Check job analysis
const job = await getJobAnalysisById(jobId, userId);
console.log("Required skills:", job.analysis_result?.required_skills);

// Test scoring separately
const score = await scoreFit({ job_analysis_id, resume_id, top_k: 10 });
console.log("Score result:", score);
```

---

### 10. Development Server Won't Start

**Error:**
```
Error: Port 3000 is already in use
```

**Solution:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

---

## Performance Issues

### Slow Generation (> 60 seconds)

**Causes:**
1. Prompt too long
2. Evidence retrieval slow
3. OpenAI API throttling

**Solutions:**
```typescript
// 1. Truncate resume content
const truncated = resume.content_text?.slice(0, 4000) || "";

// 2. Reduce evidence count
evidence = await searchEvidence(user.id, queries, 5); // Instead of 10

// 3. Generate variants sequentially instead of parallel
for (const label of variantLabels) {
  const { object } = await generateObject(...);
  // Save immediately
}
```

---

## Debugging Tips

### Enable Verbose Logging

```typescript
// In app/api/cv/generate/route.ts
console.log("1. Got user:", user.id);
console.log("2. Got resume:", resume.id, resume.content_text?.length);
console.log("3. Got job:", jobAnalysis.id, jobAnalysis.job_title);
console.log("4. Evidence count:", evidence.length);
console.log("5. Generating variant:", label);
console.log("6. Generated draft keys:", Object.keys(cvDraft));
```

### Check Database State

```sql
-- Check recent versions
SELECT version_id, user_id, job_id, status, created_at 
FROM cv_versions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check variants for a version
SELECT variant_id, label, is_selected, LENGTH(draft::text) as draft_size
FROM cv_variants 
WHERE version_id = 'YOUR_VERSION_ID';

-- Check changelog
SELECT change_type, COUNT(*) 
FROM cv_changelog 
GROUP BY change_type;
```

### Test API Routes Directly

```bash
# Test eligibility
curl -X POST http://localhost:3000/api/cv/eligibility \
  -H "Content-Type: application/json" \
  -d '{
    "job_analysis_id": "YOUR_JOB_ID",
    "resume_id": "YOUR_RESUME_ID"
  }'

# Test generation (requires auth)
curl -X POST http://localhost:3000/api/cv/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "current",
    "jobId": "YOUR_JOB_ID",
    "resumeId": "YOUR_RESUME_ID",
    "options": {
      "tone": "Impactful",
      "must_hit": ["Python"],
      "emphasis": [],
      "keep_spelling": "US",
      "max_pages": 2
    },
    "locks": {
      "sections": [],
      "bullet_ids": []
    }
  }'
```

---

## Environment Issues

### Missing Environment Variables

**Required:**
```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
OPENAI_API_KEY="sk-..."
```

**Check:**
```bash
# Verify all required vars are set
node -e "
const required = ['DATABASE_URL', 'OPENAI_API_KEY', 'CLERK_SECRET_KEY'];
required.forEach(key => {
  console.log(key + ':', process.env[key] ? '✓' : '✗ MISSING');
});
"
```

---

## Getting Help

If issues persist:

1. **Check logs:**
   - Browser console (F12)
   - Server logs (`npm run dev` output)
   - Database logs

2. **Review documentation:**
   - `GENERATE_CV_COMPLETE.md` - Feature overview
   - `docs/GENERATE_CV_IMPLEMENTATION_STATUS.md` - Implementation details
   - `docs/GENERATE_CV-PRD.md` - Requirements

3. **Test incrementally:**
   - Test eligibility API alone
   - Test with single variant
   - Test without evidence
   - Test with minimal options

4. **Verify dependencies:**
   ```bash
   npm list @clerk/nextjs
   npm list ai
   npm list openai
   npm list @neondatabase/serverless
   ```

5. **Check commit history:**
   ```bash
   git log --oneline feat/generate-cv-complete
   git show COMMIT_HASH
   ```

---

## Quick Fixes Checklist

- [ ] Clear `.next` cache: `rm -rf .next`
- [ ] Run database migration
- [ ] Verify environment variables
- [ ] Check OpenAI API key and credits
- [ ] Ensure resume has content_text
- [ ] Verify Qdrant is running
- [ ] Check Clerk is configured
- [ ] Test eligibility endpoint first
- [ ] Enable verbose logging
- [ ] Check database for existing records

---

**Last Updated:** January 2025  
**Branch:** `feat/generate-cv-complete`
