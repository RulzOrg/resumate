# UPLOAD_INGEST_HARDENED_PRD_v2.md

Production-ready spec to make **Upload Master Resume** reliable on Vercel. Hand this file to GPT-5 Codex in Cursor. Keep your HTML and CSS. Codex wires the backend, safe parsing, storage, and indexing.

---

## Outcomes

* Every upload returns one of three states: **ready**, **fallback**, or **failed** with a clear reason.
* We always store something usable. If strict parsing fails, we save a **MinimalResume** and index paragraph evidence so Optimize can still run.
* No schema drift. No ID collisions. Extractor edge cases handled.

---

## What changed vs older plan

* Real JSON Schema from Zod via `zod-to-json-schema`.
* One model adapter that supports OpenAI Responses and Chat Completions with schema enforcement.
* Collision-safe `evidence_id`s and Qdrant point ids.
* Extractor guards and OCR retry for short text, with page caps.
* R2 URL helper that supports public buckets or presigned URLs.
* Parsed resumes saved in Postgres with dedupe by file hash.
* Rate limits for ingest and rewrite.
* Correct Qdrant client and collection checks.
* Clear UX for fallback and failure, plus progress text.

---

## Architecture and state

```
uploaded
  └─ preflight_ok → extracted → normalized → validated → indexed → ready
         │               │           │            │
         │               │           │            └→ repair → validated
         │               │           └→ fallback_minimal (store + raw index)
         │               └→ ocr_retry → extracted
         └→ failed(reason)
```

**Reason codes**
`password_pdf`, `empty_or_short_text`, `extractor_unreachable`, `extractor_returned_empty`, `loose_extract_failed`, `schema_invalid`, `token_limit`, `unknown_format`.

---

## Data model

**Prisma**

```prisma
model Resume {
  id           String   @id @default(cuid())
  userId       String
  status       String        // ready | fallback | failed | uploaded
  reason       String?
  fileKey      String
  fileHash     String
  rawExcerpt   String?
  parsedJson   Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([userId, fileHash])
}
```

---

## Environment

```
# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_URL_MODE=presigned   # presigned | public
R2_PUBLIC_BASE=https://<bucket>.<account>.r2.cloudflarestorage.com  # if public

# Extractor
EXTRACTOR_URL=https://extractor.yourdomain.com

# OpenAI
OPENAI_API_KEY=...
OPENAI_ROUTE=json_responses   # json_responses | chat_completions

# Qdrant
QDRANT_URL=...
QDRANT_API_KEY=...
QDRANT_COLLECTION=resume_bullets_prod

# Upstash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Dependencies

```bash
pnpm add zod zod-to-json-schema openai @qdrant/js-client-rest \
  @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

pnpm add @prisma/client
pnpm add -D prisma
```

---

## Schemas

```ts
// lib/schemas.ts
import { z } from "zod";

export const BulletSchema = z.object({
  evidence_id: z.string(),
  text: z.string().min(2),
  skills: z.array(z.string()).default([]),
  metrics: z.string().optional(),
});

export const ExperienceSchema = z.object({
  company: z.string().default(""),
  title: z.string().default(""),
  start: z.string().nullable().optional(),
  end: z.union([z.string(), z.literal("present")]).nullable().optional(),
  bullets: z.array(BulletSchema).default([]),
});

export const ResumeExtractedSchema = z.object({
  basics: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z.array(z.string()).optional(),
  }).partial().default({}),
  summary: z.string().optional(),
  skills_normalized: z.array(z.string()).default([]),
  experiences: z.array(ExperienceSchema).default([]),
  education: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
});

export type ResumeExtracted = z.infer<typeof ResumeExtractedSchema>;

export const MinimalResumeSchema = z.object({
  basics: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
  }).partial().default({}),
  raw_text_excerpt: z.string(),
  experiences_text: z.array(z.string()).default([]),
});
export type MinimalResume = z.infer<typeof MinimalResumeSchema>;
```

---

## JSON Schema generation

```ts
// lib/jsonSchema.ts
import { zodToJsonSchema } from "zod-to-json-schema";
import { ResumeExtractedSchema } from "./schemas";

export const STRICT_SCHEMA = {
  name: "ResumeExtracted",
  strict: true,
  schema: zodToJsonSchema(ResumeExtractedSchema, "ResumeExtracted"),
};

// first pass stays permissive on purpose
export const LOOSE_SCHEMA = {
  name: "ResumeLoose",
  strict: false,
  schema: { type: "object", additionalProperties: true },
};
```

---

## OpenAI adapter

```ts
// lib/llm.ts
import OpenAI from "openai";
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type JsonSchemaSpec = { name: string; strict: boolean; schema: any };

export async function callJsonModel(system: string, user: string, schema: JsonSchemaSpec) {
  const route = process.env.OPENAI_ROUTE ?? "json_responses";

  if (route === "chat_completions") {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: schema.name, strict: schema.strict, schema: schema.schema },
      },
    });
    const text = r.choices[0]?.message?.content ?? "{}";
    return JSON.parse(text);
  }

  const r = await openai.responses.create({
    model: "gpt-4o-mini",
    temperature: 0,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_schema", json_schema: schema },
  });
  return JSON.parse(r.output_text ?? "{}");
}

export async function repairToSchema(invalidJson: string, schema: JsonSchemaSpec, validationError: string) {
  const sys = "Fix JSON to match the schema exactly. Use [] instead of null. Remove unknown keys. Keep strings under 1k chars.";
  const usr = `SCHEMA:\n${JSON.stringify(schema.schema)}\nERROR:\n${validationError}\nINVALID_JSON:\n${invalidJson}`;
  return callJsonModel(sys, usr, schema);
}
```

---

## R2 URL helper

```ts
// lib/r2.ts
export function r2PublicUrl(key: string) {
  if (process.env.R2_URL_MODE === "public") {
    const base = process.env.R2_PUBLIC_BASE!;
    return `${base}/${encodeURIComponent(key)}`;
  }
  throw new Error("Presigned mode. Provide a presigned URL at upload time.");
}
```

---

## Qdrant client and collection

```ts
// lib/qdrant.ts
import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
});

export async function ensureCollection(name: string, size = 3072) {
  const list = await qdrant.getCollections();
  const exists = list.collections?.some(c => c.name === name);
  if (!exists) {
    await qdrant.createCollection(name, { vectors: { size, distance: "Cosine" } });
  }
}
```

---

## Embeddings

```ts
// lib/embeddings.ts
import OpenAI from "openai";
export const EMBED_SIZE = 3072;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embed(texts: string[]): Promise<number[][]> {
  const r = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: texts,
  });
  return r.data.map(d => d.embedding);
}
```

---

## Rate limiting

```ts
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
const redis = Redis.fromEnv();

export const rlIngest = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h") });
export const rlRewrite = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h") });
```

---

## Hardened ingest route

```ts
// app/api/ingest/route.ts
import { rlIngest } from "@/lib/ratelimit";
import { STRICT_SCHEMA, LOOSE_SCHEMA } from "@/lib/jsonSchema";
import { ResumeExtractedSchema, MinimalResumeSchema } from "@/lib/schemas";
import { callJsonModel, repairToSchema } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

type IngestResult =
  | { status: "ready"; resume: any; resumeId: string }
  | { status: "fallback"; minimal: any; reason: string; resumeId: string }
  | { status: "failed"; reason: string };

function splitParagraphs(t: string) {
  return t.split(/\n{2,}/).map(s => s.trim()).filter(Boolean).slice(0, 40);
}

export async function POST(req: Request) {
  const { userId, fileKey, fileUrl, fileHash: clientHash } = await req.json();
  if (!userId || !fileKey) return Response.json({ status: "failed", reason: "missing_params" }, { status: 400 });

  const { success } = await rlIngest.limit(userId);
  if (!success) return new Response("Rate limit exceeded", { status: 429 });

  if (clientHash) {
    const existing = await prisma.resume.findFirst({ where: { userId, fileHash: clientHash } });
    if (existing?.parsedJson) {
      return Response.json({ status: "ready", resume: existing.parsedJson, resumeId: existing.id } satisfies IngestResult);
    }
  }

  const url = fileUrl ?? (process.env.R2_URL_MODE === "public"
    ? `${process.env.R2_PUBLIC_BASE}/${encodeURIComponent(fileKey)}`
    : null);

  if (!url) return Response.json({ status: "failed", reason: "no_file_url" }, { status: 400 });

  const ex = await fetch(`${process.env.EXTRACTOR_URL}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ url }),
  }).then(r => r.json()).catch(() => null);

  if (!ex) return Response.json({ status: "failed", reason: "extractor_unreachable" }, { status: 502 });
  if (!ex.text && !ex.html) return Response.json({ status: "failed", reason: "extractor_returned_empty" }, { status: 502 });

  const raw = String(ex.html ?? ex.text ?? "").trim();
  const excerpt = raw.slice(0, 2000);

  const resumeRow = await prisma.resume.create({
    data: {
      userId,
      status: "uploaded",
      fileKey,
      fileHash: clientHash ?? crypto.createHash("sha256").update(excerpt).digest("hex"),
      rawExcerpt: excerpt,
    },
  });

  if (excerpt.length < 80) {
    const minimal = MinimalResumeSchema.parse({ basics: {}, raw_text_excerpt: excerpt, experiences_text: [] });
    await prisma.resume.update({ where: { id: resumeRow.id }, data: { status: "fallback", reason: "empty_or_short_text", parsedJson: minimal } });
    return Response.json({ status: "fallback", minimal, reason: "empty_or_short_text", resumeId: resumeRow.id } satisfies IngestResult);
  }

  // loose, then strict, then repair
  let loose: any;
  try {
    loose = await callJsonModel(
      "Extract resume facts. Unknown fields should be empty arrays, not null. Limit strings to 1k characters.",
      `SOURCE:\n${excerpt}\nIf text is truncated, return best-effort JSON.`,
      LOOSE_SCHEMA
    );
  } catch {
    const minimal = MinimalResumeSchema.parse({ basics: {}, raw_text_excerpt: excerpt, experiences_text: splitParagraphs(excerpt) });
    await prisma.resume.update({ where: { id: resumeRow.id }, data: { status: "fallback", reason: "loose_extract_failed", parsedJson: minimal } });
    return Response.json({ status: "fallback", minimal, reason: "loose_extract_failed", resumeId: resumeRow.id } satisfies IngestResult);
  }

  try {
    const normalized = await callJsonModel(
      "Normalize to the strict schema. Do not invent facts. Use [] not null. Remove unknown keys.",
      JSON.stringify(loose),
      STRICT_SCHEMA
    );

    const ts = Date.now();
    let i = 0;
    for (const e of normalized.experiences ?? []) for (const b of e.bullets ?? []) b.evidence_id = `${userId}_${ts}_${i++}`;

    const parsed = ResumeExtractedSchema.parse(normalized);
    await prisma.resume.update({ where: { id: resumeRow.id }, data: { status: "ready", parsedJson: parsed } });
    return Response.json({ status: "ready", resume: parsed, resumeId: resumeRow.id } satisfies IngestResult);

  } catch (err: any) {
    try {
      const fixed = await repairToSchema(JSON.stringify(loose), STRICT_SCHEMA, String(err?.message ?? "zod_failed"));
      const ts = Date.now();
      let i = 0;
      for (const e of fixed.experiences ?? []) for (const b of e.bullets ?? []) b.evidence_id = `${userId}_${ts}_${i++}`;
      const parsed = ResumeExtractedSchema.parse(fixed);
      await prisma.resume.update({ where: { id: resumeRow.id }, data: { status: "ready", parsedJson: parsed } });
      return Response.json({ status: "ready", resume: parsed, resumeId: resumeRow.id } satisfies IngestResult);
    } catch {
      const minimal = MinimalResumeSchema.parse({ basics: loose?.basics ?? {}, raw_text_excerpt: excerpt, experiences_text: splitParagraphs(excerpt) });
      await prisma.resume.update({ where: { id: resumeRow.id }, data: { status: "fallback", reason: "schema_invalid", parsedJson: minimal } });
      return Response.json({ status: "fallback", minimal, reason: "schema_invalid", resumeId: resumeRow.id } satisfies IngestResult);
    }
  }
}
```

---

## Raw index route for fallback

```ts
// app/api/index-raw/route.ts
import { qdrant, ensureCollection } from "@/lib/qdrant";
import { embed, EMBED_SIZE } from "@/lib/embeddings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId, paragraphs } = await req.json() as { userId: string; paragraphs: string[] };
  if (!userId || !Array.isArray(paragraphs) || paragraphs.length === 0) return new Response("Missing params", { status: 400 });

  const coll = process.env.QDRANT_COLLECTION!;
  await ensureCollection(coll, EMBED_SIZE);

  const limited = paragraphs.slice(0, 80);
  const vecs = await embed(limited);
  const ts = Date.now();

  await qdrant.upsert(coll, {
    points: limited.map((text, i) => ({
      id: `${userId}_raw_${ts}_${i}`,
      vector: vecs[i],
      payload: { userId, text, source: "raw", needs_review: true },
    })),
  });

  return Response.json({ indexed: limited.length });
}
```

---

## Index full resume bullets

```ts
// app/api/index-resume/route.ts
import { qdrant, ensureCollection } from "@/lib/qdrant";
import { embed, EMBED_SIZE } from "@/lib/embeddings";
import type { ResumeExtracted } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId, resume } = await req.json() as { userId: string; resume: ResumeExtracted };
  if (!userId || !resume) return new Response("Missing params", { status: 400 });

  const coll = process.env.QDRANT_COLLECTION!;
  await ensureCollection(coll, EMBED_SIZE);

  const bullets = resume.experiences.flatMap(exp =>
    exp.bullets.map(b => ({
      id: b.evidence_id,
      text: b.text,
      payload: { userId, company: exp.company, title: exp.title, skills: b.skills || [] }
    }))
  );

  const vecs = await embed(bullets.map(b => b.text));
  await qdrant.upsert(coll, {
    points: bullets.map((b, i) => ({
      id: b.id,
      vector: vecs[i],
      payload: { ...b.payload, text: b.text },
    })),
  });

  return Response.json({ indexed: bullets.length });
}
```

---

## UX and client handling

**Progress text during ingest**

* Extracting text from your file
* Analyzing resume structure
* Validating and saving

**Failure actions**

* System error, say “Something went wrong on our end. Please try again in a few minutes.”
* Password PDF, say “Your PDF is protected. Export an unlocked copy and try again.”
* Show a **Try again** button on fail.

**Fallback banner**
“We couldn’t parse all sections from your resume. We saved what we could. Please review your experience bullets before optimizing.”

**Client union handling**

* `ready` → save to DB, index full bullets.
* `fallback` → save minimal to DB, index paragraphs with `/api/index-raw`, show Review UI.
* `failed` → show error type and retry.

---

## Fallback Review UI (built-in)

**Goal**
When ingest returns `fallback`, show what we extracted and let users promote paragraphs into proper bullets, then continue.

**What you already have**

* `/api/ingest` returns `minimal.experiences_text[]`
* `/api/index-raw` indexes those paragraphs so Optimize can still search

**New micro-endpoint**

```ts
// app/api/paragraph-to-bullet/route.ts
import OpenAI from "openai";
export const runtime = "nodejs";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { paragraph, targetKeyword, userId } = await req.json();
  if (!paragraph || !userId) return new Response("Missing params", { status: 400 });

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "Rewrite as a concise resume bullet using only the paragraph facts. No new claims or numbers. Max 220 characters." },
      { role: "user", content: `${targetKeyword ? `Keyword: ${targetKeyword}\n` : ""}Paragraph: ${paragraph}` }
    ]
  });

  const bullet = (r.choices[0]?.message?.content ?? paragraph).trim();
  const evidence_id = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return Response.json({ bullet, evidence_id });
}
```

**UI behavior**

* Show a **Review extracted content** panel when `status === "fallback"`.
* List `experiences_text[]` with actions per row:

  * Promote to bullet, calls `/api/paragraph-to-bullet`, adds to a Draft bullets list.
  * Edit, inline textarea before promoting.
  * Discard.
* When at least one bullet is promoted, allow Optimize to proceed.
* Keep the fallback banner visible until promoted bullets exist or the user uploads a cleaner file.

**Tip copy**
“We couldn’t parse all sections. Promote the most relevant paragraphs into bullets, then continue.”

---

## Acceptance criteria

* Upload never dies with a schema error. It returns **ready**, **fallback**, or **failed** with a reason.
* `ready` contains a valid `ResumeExtracted` with unique `evidence_id`s.
* `fallback` stores `MinimalResume`, indexes raw paragraphs, shows Review UI, and lets users promote paragraphs into bullets.
* Parsed resumes are persisted and deduped by `fileHash`.
* Qdrant uses `QDRANT_COLLECTION` and collision-safe ids.
* Rate limits protect ingest and rewrite.
* Logs do not contain raw PII. Only store `rawExcerpt` capped at 2k characters.

---

## QA checklist

* Image-only PDF → OCR path → fallback with paragraphs
* DOCX with tables → ready or fallback, no crash
* 10-page CV → truncated yet parsed, ready or fallback
* New grad with no experience → valid JSON with empty arrays
* Non-English resume → structure parsed, content preserved
* Password PDF → failed with clear guidance
* Rapid re-upload of same file → dedupe returns existing record
* Fallback path → Review UI can promote paragraphs, then Optimize works

---
 You are wiring the hardened upload pipeline defined in **UPLOAD_INGEST_HARDENED_PRD_v2.md** into this app.
> Keep the existing HTML and CSS. Add backend code, types, and small client handlers only.
>
> Implement these files and endpoints exactly:
>
> * `lib/schemas.ts`, `lib/jsonSchema.ts`, `lib/llm.ts`, `lib/embeddings.ts`, `lib/qdrant.ts`, `lib/ratelimit.ts`, `lib/r2.ts`
> * API routes: `app/api/ingest/route.ts`, `app/api/index-resume/route.ts`, `app/api/index-raw/route.ts`, `app/api/paragraph-to-bullet/route.ts`
> * Prisma model `Resume` and a `prisma` client import
>
> Use `zod-to-json-schema` for JSON Schema.
> Use `callJsonModel()` for all LLM JSON calls with schema enforcement.
> Prefix all `evidence_id` and raw point ids with `userId` and a timestamp.
> Validate extractor responses and handle short text. Assume OCR is handled by the extractor service.
> Persist every upload to Postgres with status, reason, fileHash, and parsed or minimal JSON.
> Add Upstash rate limits to ingest and rewrite.
> Use `@qdrant/js-client-rest`, ensure the collection exists, and upsert to `process.env.QDRANT_COLLECTION`.
> Return the union type from `/api/ingest`. Update the client upload handler to index raw paragraphs on fallback and show the Review UI.
> Keep logs free of PII.
>
> When done, output a short summary of changes and any env vars that must be set.

