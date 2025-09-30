# LlamaCloud API Integration Guide

**A comprehensive guide for integrating LlamaParse and LlamaExtract in any application**

---

## Table of Contents

1. [Overview](#overview)
2. [API Setup](#api-setup)
3. [LlamaParse Implementation](#llamaparse-implementation)
4. [LlamaExtract Implementation](#llamaextract-implementation)
5. [Common Issues & Solutions](#common-issues--solutions)
6. [Best Practices](#best-practices)
7. [Testing & Debugging](#testing--debugging)
8. [Production Checklist](#production-checklist)

---

## Overview

### What is LlamaCloud?

**LlamaCloud** provides AI-powered document processing APIs:
- **LlamaParse**: High-quality text extraction from PDFs with OCR support
- **LlamaExtract**: Structured data extraction with custom schemas (for forms, resumes, invoices, etc.)

### When to Use Which?

| Use Case | Tool | Why |
|----------|------|-----|
| Extract text from PDFs for RAG/search | **LlamaParse** | Optimized for text extraction |
| Extract structured data (resumes, forms) | **LlamaExtract** | Returns JSON with custom schema |
| Parse complex layouts (tables, columns) | **LlamaParse Premium** | Better OCR and layout understanding |
| Extract from scanned documents | **LlamaExtract Multimodal** | Best for images/scans |

---

## API Setup

### 1. Get API Key

1. Sign up at [cloud.llamaindex.ai](https://cloud.llamaindex.ai)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key (starts with `llx-...`)

### 2. Environment Variables

Add to your `.env` or `.env.local`:

```bash
# LlamaCloud API Key (required)
LLAMACLOUD_API_KEY="llx-your-api-key-here"

# Optional: Configuration
LLAMAPARSE_MODE="fast"                    # fast, premium, accurate
LLAMAPARSE_TIMEOUT_MS="600000"            # 10 minutes
LLAMAPARSE_MAX_PAGES="50"                 # Page limit
LLAMAPARSE_MIN_CHARS="100"                # Minimum expected chars
```

### 3. Install Dependencies

```bash
# For LlamaParse only
npm install --legacy-peer-deps

# For LlamaExtract (requires additional packages)
npm install llama-cloud-services @llamaindex/env @llamaindex/core @llamaindex/workflow-core --legacy-peer-deps
```

**Why `--legacy-peer-deps`?** LlamaCloud packages have peer dependency conflicts with some Next.js versions. This flag allows installation despite warnings.

---

## LlamaParse Implementation

### Architecture

```
Upload File
    ↓
1. POST /api/parsing/upload → Get Job ID
    ↓
2. Poll GET /api/parsing/job/{id} → Wait for SUCCESS
    ↓
3. GET /api/parsing/job/{id}/result/markdown → Fetch actual text
    ↓
4. Process extracted text
```

### Critical Implementation Details

#### ⚠️ CRITICAL: Case-Sensitive Status Check

**The API returns uppercase status codes!**

```typescript
// ❌ WRONG - Will never match!
if (data.status === "success") {
  return data
}

// ✅ CORRECT - Case-insensitive check
const statusLower = data.status.toLowerCase()
if (statusLower === "success") {
  return data
}
```

**This was our main bug!** The API returns `"SUCCESS"` (uppercase) but code was checking for `"success"` (lowercase), causing infinite polling.

#### ⚠️ CRITICAL: Fetch Result from Dedicated Endpoint

**The job status response does NOT contain the parsed text!**

```typescript
// ❌ WRONG - Job status only has metadata
const jobStatus = await fetch(`/api/parsing/job/${jobId}`)
const data = await jobStatus.json()
const text = data.text // ← This is undefined or empty!

// ✅ CORRECT - Fetch from result endpoint
const resultUrl = `/api/parsing/job/${jobId}/result/markdown`
const resultResponse = await fetch(resultUrl)
const extractedText = await resultResponse.text() // ← Actual content!
```

### Complete LlamaParse Implementation

```typescript
// lib/llamaparse.ts

const LLAMAPARSE_API_BASE = "https://api.cloud.llamaindex.ai/api/parsing"

export async function llamaParseExtract(
  fileBuffer: Buffer,
  fileType: string,
  userId: string,
  mode?: string
): Promise<ExtractResult> {
  const config = {
    apiKey: process.env.LLAMACLOUD_API_KEY || "",
    timeoutMs: 600000, // 10 minutes
  }

  // 1. Upload file
  const formData = new FormData()
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: fileType })
  formData.append("file", blob, "document.pdf")
  formData.append("result_type", "markdown")
  
  if (mode === "premium") {
    formData.append("premium_mode", "true")
  }

  const uploadResponse = await fetch(`${LLAMAPARSE_API_BASE}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  })

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.statusText}`)
  }

  const uploadData = await uploadResponse.json()
  const jobId = uploadData.id

  // 2. Poll for completion
  const startTime = Date.now()
  const pollInterval = 2000 // 2 seconds
  
  while (Date.now() - startTime < config.timeoutMs) {
    const statusResponse = await fetch(`${LLAMAPARSE_API_BASE}/job/${jobId}`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    })

    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.statusText}`)
    }

    const statusData = await statusResponse.json()
    
    // ⚠️ CRITICAL: Case-insensitive status check
    const statusLower = statusData.status.toLowerCase()
    
    if (statusLower === "success") {
      // 3. ⚠️ CRITICAL: Fetch actual result
      const resultUrl = `${LLAMAPARSE_API_BASE}/job/${jobId}/result/markdown`
      const resultResponse = await fetch(resultUrl, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      })

      if (!resultResponse.ok) {
        throw new Error(`Failed to fetch result: ${resultResponse.statusText}`)
      }

      const extractedText = await resultResponse.text()

      return {
        text: extractedText,
        total_chars: extractedText.length,
        page_count: statusData.pages || 1,
        warnings: [],
        mode_used: mode === "premium" ? "llamaparse_premium" : "llamaparse_fast",
        truncated: false,
        coverage: extractedText.length > 0 ? 1 : 0,
      }
    }
    
    if (statusLower === "error") {
      throw new Error(statusData.error || "LlamaParse job failed")
    }
    
    // Still processing, wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  throw new Error(`LlamaParse job timed out after ${config.timeoutMs}ms`)
}
```

---

## LlamaExtract Implementation

### When to Use LlamaExtract

Use LlamaExtract when you need **structured data** instead of plain text:
- ✅ Resumes (extract name, email, experience, education)
- ✅ Forms (extract field values)
- ✅ Invoices (extract line items, totals)
- ✅ Contracts (extract parties, dates, terms)
- ❌ General document search (use LlamaParse instead)

### Official API Pattern

Based on the [official LlamaExtract tutorial](https://youtu.be/01kM7tXRHi4):

```
1. Initialize LlamaExtract
    ↓
2. Create extraction agent with schema
    ↓
3. Extract from file using agent
    ↓
4. Get structured JSON result
```

### Schema Definition

Define your data structure using TypeScript/Pydantic format:

```typescript
// Example: Resume extraction schema
const RESUME_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    personal_info: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
        location: { type: "string", description: "City, State" },
        linkedin: { type: "string", description: "LinkedIn URL" },
      },
    },
    professional_summary: {
      type: "string",
      description: "Brief professional summary or objective",
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          location: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          description: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          field: { type: "string" },
          graduation_date: { type: "string" },
        },
      },
    },
    skills: {
      type: "array",
      items: { type: "string" },
    },
  },
}
```

### Complete LlamaExtract Implementation

```typescript
// lib/llamaextract.ts

export async function llamaExtractResume(
  fileBuffer: Buffer,
  fileType: string,
  userId: string,
  mode: "fast" | "balanced" | "multimodal" | "premium" = "balanced"
) {
  // 1. Import LlamaExtract functions
  const { createAgent, extract } = await import("llama-cloud-services/extract")

  // 2. Prepare configuration
  const config = {
    extraction_mode: mode.toUpperCase(),
    use_reasoning: mode !== "fast",
    cite_sources: false,
  }

  // 3. Create extraction agent
  const agent = await createAgent(
    `resume-extract-${Date.now()}`, // unique name
    RESUME_EXTRACTION_SCHEMA,        // your schema
    config
  )

  if (!agent || !agent.id) {
    throw new Error("Failed to create extraction agent")
  }

  // 4. Extract using the agent
  const result = await extract(
    agent.id,
    undefined,      // filePath (not needed)
    fileBuffer,     // fileContent
    "resume.pdf"    // fileName
  )

  if (!result || !result.data) {
    throw new Error("No data extracted")
  }

  // 5. Return structured data
  return {
    data: result.data,
    success: true,
    warnings: [],
    mode_used: `llamaextract_${mode}`,
  }
}
```

### Extraction Modes

| Mode | Speed | Quality | Best For |
|------|-------|---------|----------|
| `fast` | Fastest | Basic | Simple text PDFs |
| `balanced` | Medium | Good | Most use cases (default) |
| `multimodal` | Slow | Better | Complex layouts, images, tables |
| `premium` | Slowest | Best | Highest quality needed |

---

## Common Issues & Solutions

### Issue 1: Returns 0 Characters

**Symptoms**:
- Job completes successfully
- But extracted text is empty or very short (98-137 chars)
- Processing time is suspiciously fast (2 seconds)

**Root Causes**:
1. ❌ Not fetching from result endpoint
2. ❌ Case-sensitive status check (checking lowercase when API returns uppercase)
3. ❌ API key issues

**Solutions**:

```typescript
// ✅ Solution 1: Fetch from result endpoint
const resultUrl = `${API_BASE}/job/${jobId}/result/markdown`
const text = await (await fetch(resultUrl)).text()

// ✅ Solution 2: Case-insensitive status check
const statusLower = data.status.toLowerCase()
if (statusLower === "success") { /* ... */ }

// ✅ Solution 3: Verify API key
console.log("API Key prefix:", process.env.LLAMACLOUD_API_KEY?.substring(0, 8))
```

### Issue 2: Timeout Errors

**Symptoms**:
- Extraction times out after 2 minutes
- Large PDFs fail consistently

**Solution**:
```typescript
// Increase timeout to 10 minutes
const timeoutMs = 600000 // 10 minutes
```

### Issue 3: "Exceeded Maximum Retries"

**Symptoms**:
- LlamaExtract fails with retry error
- Specific PDFs consistently fail

**Possible Causes**:
- PDF is corrupted or unsupported format
- API service issues
- Rate limiting

**Solutions**:
```typescript
// 1. Try different extraction mode
const result = await llamaExtractResume(buffer, type, userId, "multimodal")

// 2. Fall back to LlamaParse
try {
  result = await llamaExtractResume(...)
} catch (error) {
  console.log("LlamaExtract failed, using LlamaParse fallback")
  result = await llamaParseExtract(...)
}

// 3. Verify PDF is valid
const pdfInfo = await getPdfInfo(fileBuffer) // Use pdf-parse or similar
```

### Issue 4: Module Not Found

**Symptoms**:
```
Module not found: Can't resolve 'llama-cloud-services/extract'
```

**Solution**:
```bash
# Reinstall with peer dependencies
npm install llama-cloud-services @llamaindex/env @llamaindex/core @llamaindex/workflow-core --legacy-peer-deps
```

### Issue 5: TypeScript Errors

**Symptoms**:
```
Property 'LlamaExtract' does not exist
```

**Solution**:
The package uses function exports, not a class:

```typescript
// ❌ WRONG
import { LlamaExtract } from "llama-cloud-services/extract"
const client = new LlamaExtract()

// ✅ CORRECT
import { createAgent, extract } from "llama-cloud-services/extract"
const agent = await createAgent(name, schema, config)
const result = await extract(agent.id, undefined, buffer, filename)
```

---

## Best Practices

### 1. Error Handling

```typescript
async function robustExtraction(fileBuffer: Buffer) {
  try {
    // Primary method
    return await llamaExtractResume(fileBuffer, "application/pdf", userId, "balanced")
  } catch (error) {
    console.error("Primary extraction failed:", error)
    
    try {
      // Fallback to different mode
      return await llamaExtractResume(fileBuffer, "application/pdf", userId, "multimodal")
    } catch (fallbackError) {
      console.error("Fallback extraction failed:", fallbackError)
      
      // Last resort: LlamaParse
      return await llamaParseExtract(fileBuffer, "application/pdf", userId)
    }
  }
}
```

### 2. Logging

Add comprehensive logging for debugging:

```typescript
console.log("[LlamaParse] Starting extraction:", {
  userId: userId.substring(0, 8),
  fileSize: fileBuffer.length,
  mode: "fast",
})

console.log("[LlamaParse] Poll status:", {
  pollCount: 5,
  elapsed: "10s",
  status: "PROCESSING",
})

console.log("[LlamaParse] Extraction complete:", {
  chars: 5990,
  pages: 2,
  coverage: 0.95,
})
```

### 3. Timeout Configuration

```typescript
const config = {
  // Development: Shorter timeout for faster feedback
  timeoutMs: process.env.NODE_ENV === "development" ? 120000 : 600000,
  
  // Production: Longer timeout for large files
  pollInterval: 2000,
  maxRetries: 3,
}
```

### 4. Result Validation

```typescript
function validateExtraction(result: ExtractResult): boolean {
  // Check minimum content
  if (result.total_chars < 100) {
    console.warn("Extraction too short:", result.total_chars)
    return false
  }
  
  // Check coverage
  if (result.coverage < 0.6) {
    console.warn("Low coverage:", result.coverage)
    return false
  }
  
  // Check for errors
  if (result.error) {
    console.error("Extraction error:", result.error)
    return false
  }
  
  return true
}
```

### 5. Caching Results

```typescript
// Cache successful extractions to avoid re-processing
const cacheKey = `extraction:${fileHash}`

const cached = await redis.get(cacheKey)
if (cached) {
  return JSON.parse(cached)
}

const result = await llamaParseExtract(...)
await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400) // 24h TTL

return result
```

---

## Testing & Debugging

### Debug Checklist

When extraction fails, check these in order:

1. **API Key**:
   ```typescript
   console.log("API Key set:", !!process.env.LLAMACLOUD_API_KEY)
   console.log("API Key prefix:", process.env.LLAMACLOUD_API_KEY?.substring(0, 8))
   ```

2. **File Upload**:
   ```typescript
   console.log("Upload response:", uploadResponse.status)
   console.log("Job ID:", uploadData.id)
   ```

3. **Polling**:
   ```typescript
   console.log("Poll status:", {
     attempt: 3,
     status: data.status, // Check if uppercase or lowercase
     hasResult: !!data.markdown,
   })
   ```

4. **Result Fetching**:
   ```typescript
   console.log("Result response:", resultResponse.status)
   console.log("Result length:", extractedText.length)
   console.log("Result preview:", extractedText.substring(0, 200))
   ```

### Test Files

Create test PDFs with known content:

```typescript
// test-extraction.ts
import { llamaParseExtract } from "./lib/llamaparse"
import fs from "fs"

async function testExtraction() {
  const testPdf = fs.readFileSync("./test-files/sample-resume.pdf")
  
  const result = await llamaParseExtract(
    testPdf,
    "application/pdf",
    "test-user",
    "fast"
  )
  
  console.log("Extraction result:", {
    chars: result.total_chars,
    pages: result.page_count,
    preview: result.text.substring(0, 500),
  })
  
  // Assertions
  if (result.total_chars < 1000) {
    throw new Error("Extraction too short!")
  }
  
  if (!result.text.includes("Expected Content")) {
    throw new Error("Expected content not found!")
  }
  
  console.log("✅ Test passed!")
}

testExtraction().catch(console.error)
```

### Using LlamaCloud Playground

1. Go to [cloud.llamaindex.ai](https://cloud.llamaindex.ai)
2. Upload your problematic PDF
3. Try different extraction modes
4. Compare results with your API implementation
5. Check if the issue is API-side or code-side

---

## Production Checklist

Before deploying to production:

### Configuration
- [ ] API key configured in production environment
- [ ] Timeout set appropriately (10 minutes recommended)
- [ ] Error handling for all edge cases
- [ ] Logging configured (but no sensitive data)
- [ ] Rate limiting implemented (if needed)

### Testing
- [ ] Tested with small PDFs (1-2 pages)
- [ ] Tested with large PDFs (10+ pages)
- [ ] Tested with scanned PDFs
- [ ] Tested with complex layouts (tables, columns)
- [ ] Tested error scenarios (invalid files, timeouts)

### Monitoring
- [ ] Success rate tracking
- [ ] Processing time metrics
- [ ] Error rate monitoring
- [ ] API usage tracking (for billing)
- [ ] Alerting for failures

### Performance
- [ ] Result caching implemented
- [ ] Async/background processing for large files
- [ ] Queue system for high volume
- [ ] Retry logic with exponential backoff
- [ ] Fallback extraction methods

### Security
- [ ] API key stored securely (not in code)
- [ ] File size limits enforced
- [ ] File type validation
- [ ] User rate limiting
- [ ] Sanitize extracted content before saving

---

## Quick Reference

### LlamaParse Endpoints

```
POST   /api/parsing/upload
GET    /api/parsing/job/{id}
GET    /api/parsing/job/{id}/result/markdown  ← Actual content here!
```

### Common Gotchas

1. ⚠️ Status is **uppercase** (`"SUCCESS"` not `"success"`)
2. ⚠️ Result is **not** in job status response
3. ⚠️ Must fetch from `/result/markdown` endpoint
4. ⚠️ Premium mode parameter is `"premium_mode"` not `"mode"`
5. ⚠️ Package requires `--legacy-peer-deps` flag

### Typical Processing Times

| Document Type | Fast Mode | Premium Mode |
|---------------|-----------|--------------|
| Simple 1-page | 2-5s | 5-10s |
| Resume 2-pages | 3-8s | 10-20s |
| Report 10-pages | 10-30s | 30-90s |
| Scanned document | 15-60s | 60-180s |

### API Rate Limits

Check your plan at [cloud.llamaindex.ai](https://cloud.llamaindex.ai):
- Free tier: 1000 pages/month
- Pro tier: 10,000 pages/month
- Enterprise: Custom limits

---

## Example Project Structure

```
your-app/
├── lib/
│   ├── llamaparse.ts       # LlamaParse implementation
│   ├── llamaextract.ts     # LlamaExtract implementation
│   └── extraction-utils.ts # Shared utilities
├── app/
│   └── api/
│       └── extract/
│           └── route.ts    # API endpoint
├── docs/
│   └── LLAMACLOUD_SETUP.md # This file!
└── .env.local
    └── LLAMACLOUD_API_KEY=llx-...
```

---

## Support & Resources

- **Official Docs**: https://docs.cloud.llamaindex.ai/
- **LlamaParse Guide**: https://docs.cloud.llamaindex.ai/llamaparse/getting_started
- **LlamaExtract Guide**: https://docs.cloud.llamaindex.ai/llamaextract/getting_started
- **Official Tutorial**: https://youtu.be/01kM7tXRHi4 (Resume extraction example)
- **GitHub Examples**: https://github.com/run-llama/llama_cloud_services
- **Support**: support@llamaindex.ai

---

## Version History

**v1.0** - Initial guide (Sept 2024)
- LlamaParse integration
- LlamaExtract integration
- Common issues and solutions
- Production checklist

---

**Remember**: The two most common issues are:
1. ❌ Case-sensitive status check
2. ❌ Not fetching from result endpoint

Fix these first before debugging anything else! ✅
