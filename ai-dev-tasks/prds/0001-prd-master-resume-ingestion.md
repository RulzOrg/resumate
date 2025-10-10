# Master Resume “Upload → Extract → Trust” PRD

## 1. Introduction / Overview
The current master resume upload path stores the file and runs a single extractor, but it lacks hardened security, layered parsing, confidence scoring, and remediation UX. As a result, downstream optimisation starts from unreliable data and users receive little guidance when ingestion fails. This project delivers a cohesive Upload → Extract → Trust pipeline that secures uploads, improves extraction fidelity, and surfaces actionable feedback to both end users and internal reviewers.

## 2. Goals
- G1: Harden resume ingestion security (virus scan, MIME sniff, versioning) while keeping upload→preview ≤90 s p95.
- G2: Achieve ≥92% resume coverage for total characters and section detection using a parser ensemble with coverage gates.
- G3: Produce canonical resume JSON with provenance, confidence scores, CAR/metric tagging, and timeline checks for every completed upload.
- G4: Surface remediation feedback within 8 s for low-coverage or failed ingestions; provide UI hooks for low-confidence review and per-page re-OCR.
- G5: Enable downstream optimisations to realise +15% average match score and +25% CAR bullet acceptance over baseline within 30 days of launch.

## 3. User Stories
- US1 (End user): As a job seeker uploading my master resume, I want the system to flag weak pages or missing sections immediately so I can fix issues without guesswork.
- US2 (End user): As a user editing my resume, I want to review low-confidence fields, see the original snippet, and confirm or override the extraction quickly.
- US3 (Internal reviewer): As a support agent, I want canonical JSON with confidence scores, provenance, and coverage logs so I can audit ingestion quality and answer customer questions.
- US4 (Optimiser pipeline): As the optimisation service, I need cleaned CAR-tagged bullets, metric metadata, and taxonomy-aligned skills to tailor resumes with minimal rework.
- US5 (Security/ops): As a compliance owner, I need every upload virus-scanned, MIME-verified, hashed, and revocable to satisfy quarterly audits.

## 4. Functional Requirements
1. The system must accept PDF, DOCX, DOC, RTF, and TXT files, perform MIME sniffing, antivirus scanning, and reject unsupported or infected files before storage.
2. The system must version each decoded upload (original bytes + metadata), maintain a content hash for idempotency, and allow future revert-to-prior-upload flows.
3. The ingestion job must run a parser ensemble: primary structured parser, secondary text extractor, and OCR fallback (page-level) with configurable retries.
4. The ingestion job must compute per-page and overall coverage metrics (characters, sections) and re-run alternative extractors until thresholds are met or retries exhausted.
5. The system must fail fast when coverage thresholds (≥10k chars or ≥800 chars/page, ≥3 of 5 core sections) are not met, logging gaps and notifying the UI within 8 s.
6. The system must emit a canonical JSON document containing contact, summary, experience, education, certifications, extras, skills, provenance, and confidence scores as per the provided schema.
7. The system must attach metadata per bullet: raw text, cleaned text, metric extraction (value + unit), and CAR (context/action/result) probabilities.
8. The system must perform timeline integrity validation (date normalization, overlaps, gaps >12 months, contractor/intern detection) and record flags in the canonical JSON.
9. The system must map extracted skills to the existing taxonomy, capturing both raw phrase and canonical label, and mark each with its source pointer and confidence.
10. The system must geo-normalize locations (city, country) and detect URLs, email, and phone with confidence scores.
11. The UI must expose low-confidence fields, page coverage warnings, and per-page re-OCR triggers; toggling “use original text” must update canonical JSON and preview.
12. The system must log ingestion diagnostics (parser choices, retries, coverage scores, duration) to support observability, with PII masked where required.
13. The pipeline must enforce the SLA: upload completion to first preview (or actionable failure message) ≤90 seconds p95 for 5-page resumes.

## 5. Non-Goals (Out of Scope)
- Advanced multilingual taxonomy mapping beyond existing locale detection (phase 2).
- External company/title normalization via third-party datasets.
- Introducing new paid third-party parsers or storage vendors during this phase.
- Migrating historical resumes to the new canonical schema (future backfill effort).

## 6. Design Considerations
- Reuse existing dashboard editor surfaces for low-confidence review (checkboxes, live preview) and extend them with per-page alerts and “re-run OCR” buttons.
- Ensure warnings and coverage status appear in the upload flow and in the structured editor so users remain informed post-ingestion.
- Provide clear toast and inline messaging when coverage thresholds fail, with suggested remediation (e.g., “Page 2 is low resolution—re-upload at 300 DPI or run OCR now”).

## 7. Technical Considerations
- Continue leveraging current vendors: LlamaParse for structured extraction, existing OCR fallback, OpenAI for CAR tagging/metrics, Qdrant for evidence storage.
- Maintain flat third-party spend: reuse existing API tiers, cache or batch calls where possible.
- Integrate antivirus scanning using the existing security tooling approved by DevSecOps (TBD if we need to wrap ClamAV or similar).
- All ingestion jobs must be idempotent and resumable; use resumeId + hash to avoid duplicate processing.
- Ensure canonical JSON persists in the `resumes.parsed_sections` column (JSONB) with backward compatibility for existing readers.
- Telemetry should flow to the current logging/metrics stack with PII minimisation guidelines applied.

## 8. Success Metrics
- ≥92% of new master resume uploads meet coverage thresholds without manual retry.
- p95 latency from upload finish to actionable response (preview or failure notice) < 90 s.
- p95 notification time for ingestion issues < 8 s.
- Average document_quality_score ≥ 0.85 with section coverage gates passing.
- Manual correction events in the editor decrease by ≥40% within 30 days of launch.
- Tailored resume match scores improve by ≥15% and CAR bullet acceptance improves by ≥25% in user edits vs baseline.
- 100% uploads pass virus scan and MIME verification; zero critical security findings in the next quarterly review.

## 9. Open Questions
- Do we need explicit user-facing messaging for version history/revert in this phase, or is backend storage sufficient?
- Which antivirus solution (ClamAV vs existing vendor tooling) will we integrate, and who owns maintenance?
- How should we store/document per-page OCR artifacts for customer support without bloating storage costs?
- What thresholds constitute “low confidence” for UI surfacing (e.g., <0.75), and can users configure these?
- Are there regulatory considerations (e.g., GDPR data retention) requiring automatic purge of canonical JSON after a period?

