# UPLOAD_INGEST_LLAMA_PARSE_PRD.md

Use **LlamaParse** as the primary extractor for PDF, DOCX, and TXT in the existing upload→ingest→index flow. Keep the current state machine, storage, and scoring. Add coverage checks and a clean fallback to your OSS extractor when needed. No UI HTML/CSS changes.

---

## Goals

* Extract more complete text from resumes with fewer edge case failures.
* Keep your “ready | fallback | failed” contract and DB persistence.
* Preserve your evidence-only rule and indexing flow.
* Extract the full content of the resume, analyze it, and save for later use
* Control cost and avoid vendor lock-in with a safe OSS fallback.

---

## Fit with current workflow

**Unchanged**

* State machine: uploaded → extracted → normalized → validated → indexed → ready
* Two-stage normalization: loose → strict → repair
* Union response from `/api/ingest`
* Qdrant indexing and scoring steps
* Prisma `Resume` row per upload

**New**

* **Primary extractor:** LlamaParse
* **Coverage gate:** if low coverage, escalate LlamaParse mode, then fall back to OSS extractor
* **Cost guard:** page caps and credit alerts
* **Adapter:** `lib/llamaparse.ts`, returns a normalized payload the rest of the pipeline can trust

---

## Environment

```
LLAMACLOUD_API_KEY=...
LLAMAPARSE_MODE=fast            # fast | balanced | premium
LLAMAPARSE_TIMEOUT_MS=60000
LLAMAPARSE_MAX_PAGES=12         # hard cap to control cost
LLAMAPARSE_MIN_CHARS=500        # coverage threshold, tune by testing
LLAMAPARSE_MIN_CHARS_PER_PAGE=80
LLAMAPARSE_ESCALATE_MODE=premium

# Existing
EXTRACTOR_URL=https://extractor.yourdomain.com   # your OSS fallback
OPENAI_API_KEY=...
QDRANT_URL=...
QDRANT_API_KEY=...
QDRANT_COLLECTION=resume_bullets_prod
```

---

## Data contract for the adapter

Adapter returns a single shape, regardless of source:

```ts
type ExtractResult = {
  full_text: string          // concatenated body text
  by_page: string[]          // text per page, length may be < page count if docx
  html?: string              // when available
  markdown?: string          // when available
  tables?: Array<{ page: number; csv: string }>
  meta: {
    file_type: "pdf" | "docx" | "txt"
    page_count?: number
    truncated: boolean
    mode_used?: "fast" | "balanced" | "premium"
  }
  coverage: {
    total_chars: number
    chars_per_page: number
    low_coverage: boolean
  }
  warnings: string[]         // e.g., ["ocr_used","low_coverage","truncated"]
}
```

---

## Library: LlamaParse adapter

**File:** `lib/llamaparse.ts`

```ts
type LPMode = "fast" | "balanced" | "premium";

export async function llamaParseExtract(args: {
  fileUrl: string;           // presigned or public URL
  fileType: "pdf" | "docx" | "txt";
  mode?: LPMode;
  maxPages?: number;
  timeoutMs?: number;
}): Promise<ExtractResult> {
  const key = process.env.LLAMACLOUD_API_KEY!;
  const mode = (args.mode ?? process.env.LLAMAPARSE_MODE ?? "fast") as LPMode;
  const maxPages = Number(process.env.LLAMAPARSE_MAX_PAGES ?? args.maxPages ?? 12);
  const timeoutMs = Number(process.env.LLAMAPARSE_TIMEOUT_MS ?? args.timeoutMs ?? 60000);

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // LlamaParse REST. We use "parse" to markdown + text.
    // If you prefer the LlamaIndex SDK, swap this for their client call.
    const resp = await fetch("https://api.llama.cloud/v1/parse", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: args.fileUrl,
        params: {
          mode,              // fast | balanced | premium
          max_pages: maxPages,
          ocr: true,         // ensure OCR for scans
          include_markdown: true,
          include_text: true,
          include_tables: true,
        },
      }),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`llamaparse_http_${resp.status}`);
    const data = await resp.json();

    // Expected data fields may vary slightly by plan; normalize defensively.
    const pages: string[] = data.pages?.map((p: any) => p.text ?? "") ?? [];
    const full = data.text ?? pages.join("\n\n");
    const md = data.markdown ?? data.md ?? null;
    const html = data.html ?? null;
    const pageCount = data.page_count ?? pages.length ?? undefined;
    const truncated = Boolean(data.truncated || (pageCount && pages.length < pageCount && maxPages && pageCount > maxPages));

    // Coverage gate
    const totalChars = (full ?? "").length;
    const cpp = pageCount ? Math.floor(totalChars / Math.max(pageCount, 1)) : totalChars;
    const minChars = Number(process.env.LLAMAPARSE_MIN_CHARS ?? 500);
    const minCPP = Number(process.env.LLAMAPARSE_MIN_CHARS_PER_PAGE ?? 80);
    const low = totalChars < minChars || (pageCount ? cpp < minCPP : false);

    // Tables to simple CSVs if present
    const tables = Array.isArray(data.tables)
      ? data.tables.map((t: any) => ({ page: t.page ?? 1, csv: Array.isArray(t.csv) ? t.csv.join("\n") : String(t.csv ?? "") }))
      : undefined;

    return {
      full_text: full || "",
      by_page: pages,
      html: html || undefined,
      markdown: md || undefined,
      tables,
      meta: { file_type: args.fileType, page_count: pageCount, truncated, mode_used: mode },
      coverage: { total_chars: totalChars, chars_per_page: cpp, low_coverage: low },
      warnings: [
        ...(truncated ? ["truncated"] : []),
        ...(data.ocr_used ? ["ocr_used"] : []),
        ...(low ? ["low_coverage"] : []),
      ],
    };
  } finally {
    clearTimeout(id);
  }
}
```

---

## Escalation and fallback logic

**File:** `lib/extract.ts`

```ts
import { llamaParseExtract } from "./llamaparse";

export async function primaryExtract(opts: {
  fileUrl: string;
  fileType: "pdf" | "docx" | "txt";
}): Promise<ExtractResult> {
  // 1) LlamaParse in default mode
  let r = await llamaParseExtract(opts);

  // 2) If low coverage, escalate mode once
  const escalateTo = (process.env.LLAMAPARSE_ESCALATE_MODE as any) || "premium";
  if (r.coverage.low_coverage && (opts.fileType === "pdf" || opts.fileType === "docx")) {
    r = await llamaParseExtract({ ...opts, mode: escalateTo });
  }
  return r;
}

// Fallback to OSS service you already run
export async function fallbackExtract(fileUrl: string) {
  const f = new URLSearchParams(); f.set("url", fileUrl);
  const ex = await fetch(`${process.env.EXTRACTOR_URL}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: f,
  }).then(r => r.json());

  const raw = String(ex.html ?? ex.text ?? "").trim();
  const pages = Array.isArray(ex.pages) ? ex.pages : [];
  const pageCount = pages.length || ex.page_count || undefined;
  const truncated = Boolean(ex.truncated);

  const totalChars = raw.length;
  const cpp = pageCount ? Math.floor(totalChars / Math.max(pageCount, 1)) : totalChars;
  const minChars = Number(process.env.LLAMAPARSE_MIN_CHARS ?? 500);
  const minCPP = Number(process.env.LLAMAPARSE_MIN_CHARS_PER_PAGE ?? 80);
  const low = totalChars < minChars || (pageCount ? cpp < minCPP : false);

  return {
    full_text: raw,
    by_page: pages.map((p: any) => String(p.text ?? "")),
    html: ex.html || undefined,
    markdown: undefined,
    tables: ex.tables?.map((t: any) => ({ page: t.page ?? 1, csv: String(t.csv ?? "") })),
    meta: { file_type: ex.meta?.type ?? "pdf", page_count: pageCount, truncated, mode_used: "fallback" },
    coverage: { total_chars: totalChars, chars_per_page: cpp, low_coverage: low },
    warnings: [
      ...(truncated ? ["truncated"] : []),
      ...(ex.ocr_used ? ["ocr_used"] : []),
      ...(low ? ["low_coverage"] : []),
    ],
  } as ExtractResult;
}
```

---

## Ingest route changes

**File:** `app/api/ingest/route.ts`

* Replace the current extractor call with `primaryExtract()`.
* If LlamaParse errors or returns low coverage after escalation, call `fallbackExtract()`.
* Continue with loose → strict → repair normalization exactly as before.
* Store `warnings` on the `Resume` row `reason` or in a new `json` field if you prefer.

Snippet inside the route:

```ts
import { primaryExtract, fallbackExtract } from "@/lib/extract";

const fileUrl = /* presigned or public URL built earlier */;
let ext: ExtractResult | null = null;
try {
  ext = await primaryExtract({ fileUrl, fileType });
} catch (e) {
  ext = null;
}

if (!ext || ext.coverage.low_coverage) {
  try {
    const fb = await fallbackExtract(fileUrl);
    // prefer fallback if it has better coverage
    if (!ext || fb.coverage.total_chars > ext.coverage.total_chars) {
      ext = fb;
    }
  } catch {
    // leave ext as is if fallback also fails
  }
}

if (!ext || !ext.full_text) {
  return Response.json({ status: "failed", reason: "extractor_returned_empty" }, { status: 502 });
}

const raw = ext.markdown ?? ext.html ?? ext.full_text; // prefer md > html > text
const excerpt = raw.slice(0, 2000);

// Save `warnings` into DB for observability
await prisma.resume.update({
  where: { id: resumeRow.id },
  data: { reason: ext.warnings?.join(",") ?? null, rawExcerpt: excerpt },
});
```

The rest of the route remains the same:

* Loose extract JSON → Strict normalize → Repair
* Prefix `evidence_id` with `userId` and timestamp
* Return `ready | fallback | failed` union

---

## UX notes that piggyback on existing UI

* If `warnings` include `low_coverage` show:
  “We detected low-quality text in this file. We tried a higher-fidelity pass and may have added OCR.”
* If `warnings` include `ocr_used` show:
  “We used OCR to read your PDF.”
* Keep the fallback banner and Review UI as in the hardened PRD.

No HTML or CSS changes required. Bind messages to your existing toast and banner components.

---

## Cost controls

* Default `LLAMAPARSE_MODE=fast`
* Cap pages with `LLAMAPARSE_MAX_PAGES`
* Escalate once to `premium` on low coverage
* Log `mode_used`, `page_count`, and `total_chars`
* Alert if daily requests or pages exceed a threshold you define

---

## Tests

* Digital PDF with selectable text → fast mode, no low_coverage
* Image-only PDF → OCR path in LlamaParse, no fallback needed
* Messy PDF with columns → fast low, premium high, premium wins
* Bad DOCX → Mammoth-like fallback outperforms LlamaParse, fallback wins
* Huge PDF → truncated flag is true, still returns content
* Network error → fallback extractor used, union still resolves

---

## Acceptance criteria

* For typical resumes, LlamaParse returns more complete text than OSS extractor.
* In low coverage, mode escalation runs once before OSS fallback.
* Ingest never crashes with a schema error. Union response holds.
* DB stores `warnings`, mode used, and truncated flag for analytics.
* Scoring and rewrite steps work unchanged.

---

## “Build this” prompt for Codex

> You are integrating **LlamaParse** as the primary extractor in our Next.js ingest flow.
> Keep the existing HTML and CSS. Implement server code and small glue only.
>
> Do the following:
>
> 1. Create `lib/llamaparse.ts` with `llamaParseExtract()` that calls LlamaParse REST using `LLAMACLOUD_API_KEY`. Return the `ExtractResult` shape described in this PRD. Include coverage and warnings.
> 2. Create `lib/extract.ts` with `primaryExtract()` that runs LlamaParse in `LLAMAPARSE_MODE`, escalates once to `LLAMAPARSE_ESCALATE_MODE` if coverage is low, and `fallbackExtract()` that calls our existing OSS extractor at `EXTRACTOR_URL`.
> 3. Update `app/api/ingest/route.ts` to use `primaryExtract()` first, then conditionally `fallbackExtract()` if LlamaParse errors or still has low coverage. Prefer the result with higher `total_chars`. Keep the rest of the pipeline identical: loose → strict → repair, unique `evidence_id` prefix, union return, DB save.
> 4. Persist `warnings`, `mode_used`, `truncated`, and `page_count` to the `Resume` row.
> 5. Add env vars: `LLAMACLOUD_API_KEY`, `LLAMAPARSE_MODE`, `LLAMAPARSE_TIMEOUT_MS`, `LLAMAPARSE_MAX_PAGES`, `LLAMAPARSE_MIN_CHARS`, `LLAMAPARSE_MIN_CHARS_PER_PAGE`, `LLAMAPARSE_ESCALATE_MODE`.
>
> Do not modify the UI. Only return the new flags so the existing banner and toasts can reflect OCR and low-coverage states.
>
> When finished, print a short summary of files changed and the new env vars.
