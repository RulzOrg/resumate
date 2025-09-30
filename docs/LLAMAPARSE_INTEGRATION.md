# LlamaParse Integration Documentation

## Overview

This integration adds **LlamaParse** as the primary document extraction engine for the AI Resume platform. LlamaParse provides high-quality text extraction from PDF and DOCX files with OCR support, significantly improving resume content extraction quality.

## Architecture

### Extraction Flow

```
Upload → LlamaParse (primary) → [Escalate if low coverage] → [Fallback to OSS if needed] → Evidence Extraction
```

1. **Text Files (.txt)**: Direct extraction, no LlamaParse needed
2. **PDF/DOCX Files**: 
   - First attempt with `LLAMAPARSE_MODE` (typically "fast")
   - If coverage < 60%, escalate once to `LLAMAPARSE_ESCALATE_MODE` (typically "accurate")
   - If LlamaParse fails or still has low coverage, fallback to OSS extractor at `EXTRACTOR_URL`
   - Choose result with higher `total_chars`

### Coverage Calculation

Coverage score = `total_chars / (page_count * min_chars_per_page)`

- Good coverage: ≥ 0.6 (60%)
- Low coverage: < 0.6 triggers escalation or fallback

## Files Added

### Core Implementation

- **`lib/llamaparse.ts`**: LlamaParse REST API client
  - `llamaParseExtract()`: Main extraction function
  - Polling for job completion
  - Coverage calculation
  - Warning generation

- **`lib/extract.ts`**: Unified extraction orchestration layer
  - `primaryExtract()`: LlamaParse with auto-escalation
  - `fallbackExtract()`: OSS extractor integration
  - Result selection logic

### Files Modified

- **`app/api/ingest/route.ts`**: Updated to use new extraction layer
  - Replaced AI vision extraction with LlamaParse
  - Added fallback logic
  - Persists extraction metadata to database

- **`prisma/schema.prisma`**: Added Resume model fields
  - `warnings: String[]`: Extraction warnings
  - `modeUsed: String?`: Mode used for extraction
  - `truncated: Boolean`: Document truncation flag
  - `pageCount: Int?`: Number of pages

## Environment Variables

### Required

```bash
LLAMACLOUD_API_KEY=llx-...
```
Your LlamaCloud API key. Get one at https://cloud.llamaindex.ai

### Optional (with defaults)

```bash
# Extraction mode for first attempt
LLAMAPARSE_MODE=fast
# Options: "fast" (default), "accurate"

# Extraction mode for escalation on low coverage
LLAMAPARSE_ESCALATE_MODE=accurate
# Options: "fast", "accurate" (default)

# API timeout in milliseconds
LLAMAPARSE_TIMEOUT_MS=45000
# Default: 45000 (45 seconds)

# Maximum pages to process
LLAMAPARSE_MAX_PAGES=20
# Default: 20 pages

# Minimum characters for valid extraction
LLAMAPARSE_MIN_CHARS=100
# Default: 100 characters

# Expected characters per page for coverage calculation
LLAMAPARSE_MIN_CHARS_PER_PAGE=200
# Default: 200 characters per page

# OSS fallback extractor URL (existing)
EXTRACTOR_URL=https://your-extractor-service.com
```

## Database Migration

Run the migration to add new fields:

```bash
psql $DATABASE_URL -f prisma/migrations/add_llamaparse_fields.sql
```

Or manually execute:

```sql
ALTER TABLE "public"."resumes" 
ADD COLUMN IF NOT EXISTS "warnings" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "mode_used" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "truncated" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "page_count" INTEGER;

CREATE INDEX IF NOT EXISTS "resumes_mode_used_idx" ON "public"."resumes"("mode_used");
```

Then regenerate Prisma client:

```bash
npx prisma generate
```

## Usage

The integration is transparent to the upload flow. Users upload resumes as before, and the system automatically:

1. Attempts LlamaParse extraction
2. Escalates to higher quality if needed
3. Falls back to OSS extractor if LlamaParse fails
4. Stores metadata for observability

## Metadata Fields

### `warnings: string[]`
Array of warning messages from extraction process. Examples:
- `"Low coverage: 45%"`
- `"Document has 25 pages, limited to 20"`
- `"Extracted only 80 chars, below minimum 100"`

### `modeUsed: string`
Extraction mode that was used:
- `"fast"`: LlamaParse fast mode
- `"accurate"`: LlamaParse accurate mode
- `"oss_fallback"`: OSS extractor was used
- `"text_file"`: Plain text file (no extraction needed)

### `truncated: boolean`
- `true`: Document exceeded `LLAMAPARSE_MAX_PAGES` and was truncated
- `false`: Full document was processed

### `pageCount: number`
Number of pages detected in the document.

## UI Integration

The existing UI components automatically display extraction metadata through the `IngestResponse` union type:

- **Warnings Banner**: Shows `warnings` array when present
- **Truncation Notice**: Displays when `truncated: true`
- **Fallback Indicator**: Shows when `mode_used: "oss_fallback"`
- **OCR Indicator**: Inferred from low `pageCount` with high content

No UI changes were required - the integration uses existing status display logic.

## Testing Checklist

- [ ] Text file upload → `mode_used: "text_file"`
- [ ] Simple PDF → LlamaParse success, good coverage
- [ ] Complex PDF → Escalation to accurate mode
- [ ] Image-heavy PDF → Low coverage → OSS fallback
- [ ] LlamaParse API key missing → OSS fallback
- [ ] LlamaParse timeout → OSS fallback
- [ ] Large document (>20 pages) → Truncation warning
- [ ] Database persists all metadata fields
- [ ] UI shows warnings and status correctly

## Monitoring

Key metrics to monitor:

- **LlamaParse success rate**: `mode_used IN ('fast', 'accurate') / total`
- **Escalation rate**: `mode_used = 'accurate' / total`
- **Fallback rate**: `mode_used = 'oss_fallback' / total`
- **Average coverage**: `AVG(coverage)` from extraction logs
- **Truncation rate**: `truncated = true / total`
- **Warning frequency**: Common warnings by type

Query examples:

```sql
-- Success rate by mode
SELECT mode_used, COUNT(*) 
FROM resumes 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY mode_used;

-- Documents with warnings
SELECT COUNT(*), UNNEST(warnings) as warning
FROM resumes 
WHERE array_length(warnings, 1) > 0
GROUP BY warning
ORDER BY COUNT(*) DESC;

-- Truncated documents
SELECT COUNT(*) 
FROM resumes 
WHERE truncated = true;
```

## Cost Optimization

LlamaParse charges per page processed. To optimize:

1. Set appropriate `LLAMAPARSE_MAX_PAGES` (default: 20)
2. Use `fast` mode by default, only escalate when needed
3. Rely on OSS fallback for error cases
4. Monitor escalation rate and adjust coverage threshold if needed

## Troubleshooting

### "LLAMACLOUD_API_KEY not configured"
Set the `LLAMACLOUD_API_KEY` environment variable.

### Excessive fallbacks to OSS
Check:
- API key validity
- LlamaParse API status
- Network connectivity
- Timeout settings (increase `LLAMAPARSE_TIMEOUT_MS` if needed)

### Low coverage on good documents
Adjust:
- Decrease `LLAMAPARSE_MIN_CHARS_PER_PAGE` for dense documents
- Increase timeout for complex documents
- Review coverage calculation logic

### All extractions truncated
Increase `LLAMAPARSE_MAX_PAGES` if processing longer documents.

## API Reference

### `llamaParseExtract(fileBuffer, fileType, userId, mode?)`

Extracts text from document using LlamaParse REST API.

**Parameters:**
- `fileBuffer: Buffer` - Document file content
- `fileType: string` - MIME type (e.g., "application/pdf")
- `userId: string` - User ID for logging
- `mode?: string` - Extraction mode override (optional)

**Returns:** `Promise<ExtractResult>`

```typescript
interface ExtractResult {
  text: string           // Extracted text content
  total_chars: number    // Character count
  page_count: number     // Number of pages
  warnings: string[]     // Extraction warnings
  mode_used: string      // Mode used for extraction
  truncated: boolean     // Truncation flag
  coverage: number       // Coverage score (0-1)
  error?: string         // Error message if failed
}
```

### `primaryExtract(fileBuffer, fileType, userId)`

Orchestrates LlamaParse extraction with automatic escalation.

**Parameters:** Same as `llamaParseExtract` (without mode override)

**Returns:** `Promise<ExtractResult>` - Best result after attempting primary mode and optional escalation

### `fallbackExtract(fileBuffer, fileType, fileUrl?)`

Falls back to OSS extractor.

**Parameters:**
- `fileBuffer: Buffer` - Document file content (for future use)
- `fileType: string` - MIME type
- `fileUrl?: string` - Pre-signed URL for OSS extractor

**Returns:** `Promise<ExtractResult>` - Result from OSS extractor

## Support

For issues or questions:
1. Check logs for extraction errors
2. Review warning messages in database
3. Verify environment variable configuration
4. Test with sample documents
5. Check LlamaParse API status at https://status.llamaindex.ai
