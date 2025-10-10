## Relevant Files

- `app/api/resumes/master/upload/route.ts` - Entry point for master resume uploads; add MIME sniffing, antivirus hooks, and version metadata.
- `lib/storage.ts` - Centralised storage helpers; extend for virus scan integration and snapshot retention.
- `lib/db.ts` - Resume persistence helpers; update to store version history, canonical JSON, and quality metadata.
- `prisma/schema.prisma` - Database schema definitions; add resume version relationships and hashes.
- `prisma/migrations/add_resume_versions_table.sql` - Migration creating resume version snapshot storage.
- `lib/inngest/functions/process-resume.ts` - Background ingestion job; implement parser ensemble, coverage gates, and canonical output pipeline.
- `lib/extract.ts` / `lib/llamaparse.ts` - Extraction orchestration; enhance with fallback strategies, OCR routing, and reliability scoring.
- `lib/llm.ts` - LLM utilities; add CAR tagging, metric detection, and skill taxonomy mapping helpers.
- `components/dashboard/master-resume-dialog.tsx` - Upload UX; surface immediate failure toasts and weak-page alerts.
- `components/dashboard/MasterResumesSection.tsx` - Master resume list; display ingestion status, confidence, and remediation prompts.
- `components/optimization/structured-resume-editor.tsx` - Editor UI; add low-confidence highlights, original snippet previews, and re-OCR controls.
- `app/api/resumes/master/status/route.ts` (new) - Expose ingestion status and coverage diagnostics for the dashboard poller.
- `tests/routes/master-upload.test.ts` (new) - API test coverage for hardened upload path.
- `tests/inngest/process-resume.test.ts` (new) - Unit/integration tests for parser ensemble and canonical JSON emission.
- `tests/ui/master-resume-ingestion.spec.ts` (new) - E2E regression covering upload, remediation UX, and editor interactions.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [ ] 1.0 Harden master resume upload intake with MIME sniffing, antivirus scanning, version snapshots, and SLA-aware queuing.
  - [x] 1.1 Audit `app/api/resumes/master/upload/route.ts` to plug MIME sniffing and enforce allowed file type/size limits before storage.
  - [x] 1.2 Integrate antivirus scanning via `lib/storage.ts` (e.g., ClamAV wrapper) and block/quarantine failed scans with actionable error messaging.
  - [x] 1.3 Implement upload version snapshots: persist original file metadata, content hash, and change log entries for future revert flows.
  - [x] 1.4 Add upload SLA instrumentation (queue start/end timestamps, p95 tracking) and fail-fast responses when the pipeline cannot meet the 90 s target.

- [ ] 2.0 Implement parser ensemble, coverage gates, and retry policy in the ingestion job with structured failover logging.
  - [x] 2.1 Extend `lib/inngest/functions/process-resume.ts` to sequence primary structured parsing, secondary text extraction, and per-page OCR fallback.
  - [x] 2.2 Compute per-page and overall coverage metrics (character counts, section detection) and compare against thresholds before accepting results.
  - [ ] 2.3 Add retry/escrow logic to rerun alternative extractors when coverage fails, recording detailed diagnostics for observability.
  - [ ] 2.4 Emit structured failure payloads to the UI and support API when the ensemble cannot meet coverage gates.

- [ ] 3.0 Emit canonical resume JSON with confidences, provenance, CAR/metric tagging, timeline validation, and taxonomy-aligned skills.
  - [ ] 3.1 Define canonical resume schema types and persistence layer updates in `lib/db.ts` / `lib/schemas.ts` with backward compatibility.
  - [ ] 3.2 Populate the canonical JSON during ingestion: contact, summary, experience, education, certifications, extras, provenance, and confidence scores.
  - [ ] 3.3 Add CAR probability tagging and metric extraction per bullet using `lib/llm.ts` helpers, storing raw vs cleaned text variants.
  - [ ] 3.4 Map extracted skills to the existing taxonomy, capturing raw phrase, canonical label, source pointer, and confidence.
  - [ ] 3.5 Run timeline integrity checks (date normalization, overlap/gap detection, contractor/intern signals) and attach flags to the canonical JSON.

- [ ] 4.0 Add remediation UX hooks (low-confidence review, weak-page alerts, re-OCR triggers) plus fast failure notifications in the dashboard.
  - [ ] 4.1 Create/extend a status endpoint or polling mechanism to deliver ingestion statuses, coverage scores, and weak-page metadata to the dashboard.
  - [ ] 4.2 Update `master-resume-dialog.tsx` and `MasterResumesSection.tsx` to display live ingestion progress, failure toasts (<8 s), and actionable guidance.
  - [ ] 4.3 Enhance `structured-resume-editor.tsx` with low-confidence highlights, original snippet comparison, and “re-run OCR for page X” controls.
  - [ ] 4.4 Ensure toggling “use original text” updates canonical JSON, marks overrides for provenance, and refreshes the live preview.

- [ ] 5.0 Extend observability, SLA metrics, and security auditing for the Upload → Extract → Trust pipeline.
  - [ ] 5.1 Instrument structured logs and metrics (parser selections, retries, coverage, confidences) with PII minimisation and dashboard alerts.
  - [ ] 5.2 Implement monitoring jobs for SLA validation (upload→preview latency, ingestion issue notification time) and alert on threshold breaches.
  - [ ] 5.3 Document security/compliance controls: virus scan coverage, retention policies, version purge flows, and quarterly audit checkpoints.
  - [ ] 5.4 Add regression tests and golden samples to ensure extraction quality and confidence scoring stay above targets.
