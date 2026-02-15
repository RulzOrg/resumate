-- Backfill malformed optimized_resumes.optimization_summary values.
-- Fixes rows where JSONB contains a stringified JSON object instead of an object.
-- Safe and idempotent: only touches rows that are JSONB strings that parse to objects.

BEGIN;

UPDATE optimized_resumes
SET
  optimization_summary = (optimization_summary #>> '{}')::jsonb,
  updated_at = NOW()
WHERE
  jsonb_typeof(optimization_summary) = 'string'
  AND (optimization_summary #>> '{}') IS NOT NULL
  AND LEFT(TRIM(optimization_summary #>> '{}'), 1) = '{';

COMMIT;
