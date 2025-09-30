# LlamaParse Timeout & Fallback Fix

## Issues Fixed

### Issue 1: LlamaParse Timeout ⏱️
**Problem**: LlamaParse was timing out after 45 seconds
```
[LlamaParse] Extraction failed: LlamaParse job timed out after 45000ms
```

**Root Cause**: Complex PDFs can take 30-90 seconds to process, especially with OCR

**Solution**: Increased timeout to 2 minutes (120 seconds)
- Updated `.env.local`: `LLAMAPARSE_TIMEOUT_MS=120000`
- This gives LlamaParse enough time for complex documents

### Issue 2: Storage Module Mismatch 🗄️
**Problem**: Fallback extractor couldn't get file URL
```
R2/S3 storage not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY
```

**Root Cause**: Using wrong storage module
- `lib/r2.ts` (new) expects `R2_ENDPOINT` 
- `lib/storage.ts` (existing) uses `R2_ACCOUNT_ID` and `R2_BUCKET_NAME`
- Your environment has the existing format

**Solution**: Use existing storage module
- Updated import from `getDownloadUrl` → `getSignedDownloadUrl`
- Uses `lib/storage.ts` which works with your existing env vars

### Issue 3: No Last-Resort Fallback 🛡️
**Problem**: When both LlamaParse and OSS fallback failed, extraction returned 0 characters

**Solution**: Added AI vision as final safety net
- If all methods fail (0 chars extracted)
- Try GPT-4o vision API as last resort
- Better to get imperfect extraction than fail completely

## Changes Made

### 1. Environment Configuration
**File**: `.env.local`

```diff
- LLAMAPARSE_TIMEOUT_MS=45000               # API timeout (45s)
+ LLAMAPARSE_TIMEOUT_MS=120000              # API timeout (2 minutes for complex PDFs)
```

### 2. Master Upload Route
**File**: `app/api/resumes/master/upload/route.ts`

**Changes**:
1. ✅ Updated import to use `getSignedDownloadUrl` from `lib/storage`
2. ✅ Re-added `generateText` import for AI vision fallback
3. ✅ Added AI vision extraction as last resort when all methods fail

**New Extraction Flow**:
```
Text File (.txt)
  └─> Direct read → Success

PDF/DOCX
  └─> LlamaParse (120s timeout)
       ├─> Success (coverage ≥60%) → Done ✓
       └─> Low coverage or timeout
            └─> Escalate to accurate mode (120s timeout)
                 ├─> Better result → Use it ✓
                 └─> Still poor/failed
                      └─> Try OSS fallback extractor
                           ├─> Better result → Use it ✓
                           └─> Still 0 chars
                                └─> AI Vision (GPT-4o) as last resort
                                     ├─> Success → Use it ✓
                                     └─> Failed → Return error ❌
```

## Code Details

### AI Vision Fallback Logic
```typescript
// After all extraction attempts
if (extractResult.total_chars === 0 && file.type !== "text/plain") {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Extract ALL text..." },
          { type: "image", image: buffer }
        ]
      }]
    })
    
    if (text && text.length > 50) {
      extractResult = {
        text: text.trim(),
        total_chars: text.length,
        mode_used: "ai_vision_fallback",
        warnings: [...existing, "Used AI vision as last resort"],
        coverage: 0.5,
      }
    }
  } catch (visionError) {
    // Will fail gracefully with proper error message
  }
}
```

## Expected Behavior

### Scenario 1: LlamaParse Success (Best Case)
```
[LlamaParse] Starting extraction: { mode: 'fast', timeout: 120000 }
... (30-60s processing)
[LlamaParse] Extraction completed: { chars: 3847, pages: 2, coverage: 0.96 }
[MasterUpload] Extraction complete: { mode: 'fast', chars: 3847 } ✓
```

### Scenario 2: LlamaParse Timeout → Escalation Success
```
[LlamaParse] Extraction failed: timeout after 120000ms
[Extract] Escalating to accurate mode
[LlamaParse] Starting extraction: { mode: 'accurate', timeout: 120000 }
[LlamaParse] Extraction completed: { chars: 3200, pages: 2 }
[MasterUpload] Extraction complete: { mode: 'accurate', chars: 3200 } ✓
```

### Scenario 3: LlamaParse Fails → OSS Fallback Success
```
[LlamaParse] Both modes timed out
[MasterUpload] Trying OSS fallback
[Fallback] OSS extraction succeeded: { chars: 2800 }
[MasterUpload] Extraction complete: { mode: 'oss_fallback', chars: 2800 } ✓
```

### Scenario 4: All Fail → AI Vision Saves the Day
```
[LlamaParse] Failed
[Fallback] Failed
[MasterUpload] All methods returned 0 chars, trying AI vision
[AI Vision] GPT-4o extraction succeeded: { chars: 2500 }
[MasterUpload] Extraction complete: { mode: 'ai_vision_fallback', chars: 2500 } ✓
```

### Scenario 5: Everything Fails (Worst Case)
```
[LlamaParse] Failed
[Fallback] Failed
[AI Vision] Failed
[MasterUpload] Extraction complete: { mode: 'fast', chars: 0, warnings: 3 }
Error: Unable to extract enough resume content for analysis ❌
```

## Testing Results

✅ **TypeScript**: No errors  
✅ **ESLint**: Passing  
✅ **Environment**: Timeout increased to 120s  
✅ **Storage**: Using correct module  
✅ **Fallbacks**: Three-tier safety net implemented  

## Benefits

1. **Increased Success Rate**: 120s timeout handles complex PDFs
2. **Storage Compatibility**: Works with existing R2 configuration
3. **Multiple Fallbacks**: 4 extraction methods (LlamaParse fast/accurate, OSS, AI vision)
4. **Graceful Degradation**: Always tries to extract something before failing
5. **Better Observability**: Clear logs show which method succeeded

## Monitoring

Check which extraction methods are being used:

```sql
-- Extraction mode distribution
SELECT mode_used, COUNT(*) as count
FROM resumes
WHERE mode_used IS NOT NULL
GROUP BY mode_used
ORDER BY count DESC;

-- Expected results:
-- fast (best case)
-- accurate (escalated)
-- oss_fallback (LlamaParse failed)
-- ai_vision_fallback (last resort)
```

## Next Steps

1. ✅ **Restart dev server** to pick up new timeout value
   ```bash
   # Kill the current server and restart
   npm run dev
   ```

2. 🔲 **Upload a resume** and check the logs

3. 🔲 **Monitor extraction modes** over time to see which methods work best

4. 🔲 **Adjust timeout if needed** based on actual processing times

## Troubleshooting

### If LlamaParse still times out
- Check LlamaParse API status: https://status.llamaindex.ai
- Increase timeout further: `LLAMAPARSE_TIMEOUT_MS=180000` (3 minutes)
- Check your API key limits/quota

### If all methods fail consistently
- Verify OPENAI_API_KEY has GPT-4o access (for AI vision)
- Check file format (corrupted PDFs will fail all methods)
- Try a different resume file to isolate the issue

### If you see "R2 storage not configured" again
- Check `.env.local` has all required R2 variables
- Restart dev server after env changes
- Verify `R2_ACCOUNT_ID` and `R2_BUCKET_NAME` are set

## Summary

The upload pipeline now has **4 layers of protection**:

1. **LlamaParse Fast** (120s timeout) - Primary method
2. **LlamaParse Accurate** (120s timeout) - Escalation on low coverage
3. **OSS Fallback** - When LlamaParse fails completely
4. **AI Vision (GPT-4o)** - Last resort when all else returns 0 chars

This ensures maximum extraction success rate while maintaining good performance for simple documents.
