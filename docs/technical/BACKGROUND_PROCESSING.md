# Background Resume Processing with Inngest

## Overview

Resume uploads now process **asynchronously in the background** using Inngest. This dramatically improves UX by allowing users to continue using the app while their resumes are being extracted and analyzed.

## Benefits

### User Experience ✨
- **Instant upload response** - No more waiting 2-4 minutes staring at a spinner
- **Continue working** - Add job descriptions, explore features while resume processes
- **Live status updates** - See processing progress in real-time
- **No browser timeouts** - Long-running extraction happens server-side

### Reliability 🛡️
- **Automatic retries** - Failed jobs retry up to 2 times with exponential backoff
- **Better error handling** - Granular failure tracking and recovery
- **No data loss** - Jobs are persisted and tracked
- **Observable** - Full visibility into processing status via Inngest dashboard

### Scalability 📈
- **Concurrent processing** - Handle multiple uploads simultaneously (limit: 5)
- **Queue management** - Handle traffic spikes gracefully
- **Resource optimization** - Doesn't block API routes

## Architecture

```
┌──────────────┐
│ User Uploads │
│   Resume     │
└──────┬───────┘
       │
       ├─► Save file to R2 ✓ (instant)
       ├─► Create DB record (status: "pending") ✓
       ├─► Enqueue Inngest job 📦
       └─► Return SUCCESS immediately ✓
              │
              └─► User continues using app 🎉
              
              
📦 Inngest Background Job (async, 4-minute timeout)
    │
    Step 1: Update status → "processing"
    │
    Step 2: Extract content (3-min timeout)
    │       ├─► Try LlamaParse (fast mode)
    │       ├─► Escalate to accurate mode if needed
    │       ├─► Try OSS fallback if LlamaParse fails
    │       └─► Try AI vision as last resort
    │
    Step 3: Structured analysis (2-min timeout)
    │       └─► GPT-4o-mini extracts resume sections
    │
    Step 4: Save results
    │       └─► Update status → "completed" ✓
    │
    OR on failure:
    │       └─► Update status → "failed"
    │       └─► Retry job (up to 2 retries)
```

## Implementation Files

### Core Files
- `lib/inngest/client.ts` - Inngest client configuration
- `lib/inngest/functions/process-resume.ts` - Background job implementation
- `app/api/inngest/route.ts` - Inngest webhook endpoint
- `app/api/resumes/master/upload/route.ts` - Modified to enqueue jobs
- `app/api/resumes/[id]/status/route.ts` - Status polling endpoint

### Modified Files
- `.env.local` - Added Inngest configuration
- `app/api/resumes/master/upload/route.ts` - Now enqueues jobs instead of processing synchronously

## Setup Instructions

### 1. Development Setup (Inngest Dev Server)

For local development, use the Inngest Dev Server:

```bash
# Install Inngest CLI globally
npm install -g inngest-cli

# Start the dev server (in a separate terminal)
npx inngest-cli dev

# Start your Next.js app
npm run dev
```

The Inngest Dev Server will:
- Provide a UI at http://localhost:8288
- Show all jobs, events, and execution logs
- Allow you to replay failed jobs
- No API keys needed for development

### 2. Production Setup (Inngest Cloud)

For production deployment:

1. **Create Inngest account**: https://www.inngest.com/
2. **Get API keys** from your Inngest dashboard
3. **Add to environment variables**:
   ```bash
   INNGEST_EVENT_KEY=your_event_key
   INNGEST_SIGNING_KEY=your_signing_key
   ```
4. **Deploy your app** - Inngest will automatically discover the `/api/inngest` endpoint

## Usage

### Upload Flow

**Before (Synchronous)**:
```typescript
// User waits 2-4 minutes for response
POST /api/resumes/master/upload
  ├─► Upload file
  ├─► Extract content (2-4 minutes) ⏱️
  ├─► Analyze structure
  └─► Return result
```

**After (Background)**:
```typescript
// User gets instant response
POST /api/resumes/master/upload
  ├─► Upload file (instant)
  ├─► Enqueue job (instant)
  └─► Return SUCCESS ✓ (0.5 seconds)

// Processing happens in background
Inngest Job (triggered automatically)
  ├─► Extract content
  ├─► Analyze structure
  └─► Update database
```

### Status Polling

Frontend can poll for status updates:

```typescript
// Poll every 2 seconds
const pollStatus = async (resumeId: string) => {
  const response = await fetch(`/api/resumes/${resumeId}/status`)
  const data = await response.json()
  
  return {
    status: data.status,        // "pending" | "processing" | "completed" | "failed"
    progress: data.progress,    // 0-100
    message: data.message,      // User-friendly message
    error: data.error,          // Error message if failed
    warnings: data.warnings,    // Extraction warnings
    mode: data.mode,            // Extraction mode used
  }
}

// Usage in React
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await pollStatus(resumeId)
    setResumeStatus(status)
    
    if (status.status === "completed" || status.status === "failed") {
      clearInterval(interval)
    }
  }, 2000)
  
  return () => clearInterval(interval)
}, [resumeId])
```

## Processing States

| Status | Progress | Description | User Action |
|--------|----------|-------------|-------------|
| `pending` | 10% | Queued for processing | Wait |
| `processing` | 50% | Actively extracting and analyzing | Wait |
| `completed` | 100% | Ready to use | Use resume |
| `failed` | 0% | Processing failed | Retry upload |

## Job Configuration

### Timeouts
- **Total job timeout**: 5 minutes (configurable in Inngest)
- **Extraction step**: 4 minutes
- **Analysis step**: 2 minutes

### Retries
- **Retry count**: 2 attempts
- **Retry strategy**: Exponential backoff
- **Retry delay**: 1s, 2s, 4s

### Concurrency
- **Max concurrent jobs**: 5 resumes processing simultaneously
- **Queue**: Unlimited (jobs wait if limit reached)

## Monitoring & Debugging

### Inngest Dev Server (Development)

Access http://localhost:8288 to see:
- **Events** - All `resume/uploaded` events
- **Functions** - Job execution history
- **Logs** - Detailed step-by-step logs
- **Replay** - Re-run failed jobs

### Inngest Cloud (Production)

Access your Inngest dashboard to see:
- **Real-time job status**
- **Execution logs**
- **Error tracking**
- **Performance metrics**
- **Retry history**

### Database Queries

Check processing status distribution:

```sql
SELECT 
  processing_status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
FROM resumes
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY processing_status;
```

Check failed jobs:

```sql
SELECT 
  id,
  file_name,
  processing_error,
  warnings,
  mode_used,
  created_at
FROM resumes
WHERE processing_status = 'failed'
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

## Error Handling

### Job Failures

When a job fails after all retries:
1. Database status set to `"failed"`
2. Error message saved to `processing_error`
3. Warnings saved to `warnings` array
4. User sees "Processing failed" in UI
5. User can retry by re-uploading

### Common Failures

| Error | Cause | Solution |
|-------|-------|----------|
| "LlamaParse timeout" | API slow/down | Auto-retries, escalates to OSS |
| "Content too short" | Extraction failed | All methods tried, marked failed |
| "Analysis failed" | LLM error | Retries with backoff |

## Cost Considerations

### Inngest Free Tier
- **50,000 step executions/month**
- Each resume job = ~5 steps
- **= 10,000 resumes/month FREE**

### Inngest Paid Plans
- **$30/month**: 200K steps (40K resumes)
- **$100/month**: 1M steps (200K resumes)

### When to Upgrade
- Free tier sufficient for: <300 resumes/day
- Paid tier needed for: >300 resumes/day

## Migration from Sync to Async

### Backwards Compatibility

Old synchronous code is commented out but preserved in:
```
app/api/resumes/master/upload/route.ts (lines 203-439)
```

Can be removed after confirming background processing works.

### Database Schema

No changes needed - existing `processing_status` field supports all states:
- `pending` (new)
- `processing` (existing)
- `completed` (existing)
- `failed` (existing)

## Testing

### Local Testing

1. Start Inngest Dev Server:
   ```bash
   npx inngest-cli dev
   ```

2. Start Next.js:
   ```bash
   npm run dev
   ```

3. Upload a resume

4. Watch Inngest UI (http://localhost:8288) for:
   - Event received: `resume/uploaded`
   - Function triggered: `process-resume`
   - Steps executing in order
   - Final status: Success/Failure

5. Poll status endpoint:
   ```bash
   curl http://localhost:3000/api/resumes/{RESUME_ID}/status
   ```

### Production Testing

1. Deploy with Inngest keys configured
2. Upload test resume
3. Check Inngest dashboard for job execution
4. Verify database status updates
5. Confirm user sees correct status in UI

## Troubleshooting

### Jobs Not Running

**Problem**: Resume stays in "pending" forever

**Solutions**:
1. Check Inngest Dev Server is running (dev)
2. Check Inngest keys are set (production)
3. Verify `/api/inngest` endpoint is accessible
4. Check Inngest dashboard for errors

### Jobs Failing Immediately

**Problem**: All jobs fail with same error

**Solutions**:
1. Check environment variables (OPENAI_API_KEY, etc.)
2. Check R2 storage configuration
3. Check LlamaParse API key
4. Review Inngest logs for specific error

### Slow Processing

**Problem**: Jobs taking too long

**Solutions**:
1. Increase step timeouts in job function
2. Check LlamaParse API performance
3. Review extraction logs for bottlenecks
4. Consider increasing concurrency limit

## Future Enhancements

### Phase 2 (Optional)
- **WebSocket updates** - Real-time status push (no polling)
- **Progress tracking** - Granular progress (25%, 50%, 75%)
- **Retry UI** - Manual retry button for failed jobs
- **Bulk uploads** - Process multiple resumes in batch

### Phase 3 (Advanced)
- **Priority queue** - Premium users get faster processing
- **Scheduled jobs** - Periodic re-analysis of resumes
- **Webhooks** - Notify external systems on completion

## Summary

Background processing with Inngest provides:

✅ **Better UX** - Instant uploads, no waiting  
✅ **More reliable** - Auto-retries, better error handling  
✅ **Scalable** - Handle concurrent uploads  
✅ **Observable** - Full visibility into job status  
✅ **Easy to use** - Simple API, great DX  

Users can now upload resumes and continue using the app immediately while processing happens in the background!
