# Hardened Upload Pipeline Integration Guide

This guide shows how to integrate the new hardened upload pipeline into your components.

## Quick Start

The easiest way to use the new upload pipeline is through the `uploadResume()` helper function:

```typescript
import { uploadResume } from "@/lib/upload-handler"

async function handleFileUpload(file: File) {
  const result = await uploadResume(file, (progress) => {
    console.log(`Upload progress: ${progress}%`)
  })

  if (!result.success) {
    console.error("Upload failed:", result.error)
    return
  }

  // Handle success
  if (result.status === "success") {
    console.log("Resume ID:", result.resumeId)
    console.log("Evidence count:", result.evidenceCount)
    // Redirect to optimization or next step
  }

  // Handle fallback (manual review needed)
  if (result.status === "fallback") {
    console.log("Resume ID:", result.resumeId)
    console.log("Raw paragraphs:", result.rawParagraphs)
    // Show ReviewFallbackUI component
  }
}
```

## Integration Example (Upload Dialog)

See [components/dashboard/upload-resume-dialog.tsx](../components/dashboard/upload-resume-dialog.tsx) for a complete example.

### Key Changes:

1. **Import the helper and UI:**
```typescript
import { uploadResume } from "@/lib/upload-handler"
import { ReviewFallbackUI } from "@/components/resume/review-fallback-ui"
```

2. **Add state for fallback:**
```typescript
const [step, setStep] = useState<"upload" | "success" | "fallback">("upload")
const [rawParagraphs, setRawParagraphs] = useState<string[]>([])
const [uploadedResumeId, setUploadedResumeId] = useState<string | null>(null)
```

3. **Replace upload logic:**
```typescript
const handleUpload = async () => {
  if (!file) return

  setIsUploading(true)

  const result = await uploadResume(file, (progress) => {
    setUploadProgress(progress)
  })

  if (!result.success) {
    setError(result.error || "Upload failed")
    setIsUploading(false)
    return
  }

  setUploadedResumeId(result.resumeId!)

  if (result.status === "success") {
    setStep("success")
    // Auto-redirect or show success
  } else if (result.status === "fallback") {
    setRawParagraphs(result.rawParagraphs || [])
    setStep("fallback")
  }

  setIsUploading(false)
}
```

4. **Add fallback UI in render:**
```tsx
{step === "fallback" && uploadedResumeId && (
  <ReviewFallbackUI
    resumeId={uploadedResumeId}
    rawParagraphs={rawParagraphs}
    onComplete={() => {
      // Navigate to next step
      router.push(`/dashboard/optimize?resumeId=${uploadedResumeId}`)
    }}
  />
)}
```

## API Response Types

The `uploadResume()` function returns a `UploadResult`:

```typescript
interface UploadResult {
  success: boolean
  resumeId?: string
  status: "success" | "fallback" | "error"
  needsReview?: boolean      // True for fallback
  rawParagraphs?: string[]   // Fallback content
  parsed?: any               // Success: structured data
  evidenceCount?: number     // Success: number of evidence items
  error?: string             // Error: error message
  fileHash?: string          // File hash for deduplication
}
```

## Direct API Usage

If you prefer to call the API directly:

### POST /api/ingest

```typescript
const formData = new FormData()
formData.append("file", file)

const response = await fetch("/api/ingest", {
  method: "POST",
  body: formData,
})

const data = await response.json()

// Response is a discriminated union:
// - { status: "success", resumeId, parsed, evidenceCount, fileHash }
// - { status: "fallback", resumeId, reason, rawParagraphs, fileHash }
// - { status: "error", error, code }
```

### POST /api/index-resume

```typescript
await fetch("/api/index-resume", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ resumeId: "..." }),
})
```

### POST /api/index-raw

```typescript
await fetch("/api/index-raw", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    resumeId: "...",
    paragraphs: ["paragraph 1", "paragraph 2"],
  }),
})
```

### POST /api/paragraph-to-bullet

```typescript
const response = await fetch("/api/paragraph-to-bullet", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    paragraph: "Long paragraph of text...",
  }),
})

const data = await response.json()
// { bullets: string[], improved: boolean, suggestions: string[] }
```

## UI Components

### ReviewFallbackUI

Shows when automatic extraction fails. Allows users to:
- View raw paragraphs extracted from resume
- Convert paragraphs to bullet points using AI
- Review and approve converted content

```tsx
import { ReviewFallbackUI } from "@/components/resume/review-fallback-ui"

<ReviewFallbackUI
  resumeId={resumeId}
  rawParagraphs={paragraphs}
  onComplete={() => {
    // User completed review, proceed to next step
  }}
/>
```

## Error Handling

All endpoints include comprehensive error handling:

- **400 Bad Request**: Invalid file, size, or type
- **401 Unauthorized**: Missing authentication
- **429 Too Many Requests**: Rate limit exceeded (includes retry headers)
- **500 Internal Server Error**: Server-side processing error
- **503 Service Unavailable**: Qdrant or external service down

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1234567890000
```

## Testing the Pipeline

1. **Set environment variables:**
```bash
# Required
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
QDRANT_URL="http://localhost:6333"

# For storage
R2_ENDPOINT="https://..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="ai-resume-uploads"

# For rate limiting (optional)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

2. **Generate Prisma client:**
```bash
npx prisma generate
```

3. **Test upload:**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@resume.pdf"
```

## Migration from Old Upload

If you're migrating from the old `/api/resumes/upload` endpoint:

**Before:**
```typescript
const formData = new FormData()
formData.append("file", file)
formData.append("title", title)

const response = await fetch("/api/resumes/upload", {
  method: "POST",
  body: formData,
})
```

**After:**
```typescript
import { uploadResume } from "@/lib/upload-handler"

const result = await uploadResume(file, (progress) => {
  setProgress(progress)
})

if (result.success) {
  // Handle success or fallback
}
```

**Benefits:**
- ✅ Better error handling
- ✅ Progress tracking
- ✅ Automatic fallback
- ✅ Deduplication via file hashing
- ✅ Rate limiting
- ✅ Structured evidence extraction

## Troubleshooting

### "Upload failed" error
- Check environment variables are set
- Verify R2/S3 credentials
- Check file size (max 10MB)

### "Rate limit exceeded" error
- Wait for rate limit reset (check `X-RateLimit-Reset` header)
- Configure Upstash Redis if not set up

### Fallback always triggered
- Check OPENAI_API_KEY is valid
- Verify resume contains valid text content
- Check Qdrant is running and accessible

### Database errors
- Run `npx prisma generate`
- Verify DATABASE_URL is correct
- Check database schema includes `resumes` table with `file_hash` column