-- Add LlamaParse metadata fields to resumes table
-- Migration: add_llamaparse_fields
-- Created: 2024-09-30

-- Add new columns for LlamaParse extraction metadata
ALTER TABLE "public"."resumes" 
ADD COLUMN IF NOT EXISTS "warnings" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "mode_used" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "truncated" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "page_count" INTEGER;

-- Add index on mode_used for filtering
CREATE INDEX IF NOT EXISTS "resumes_mode_used_idx" ON "public"."resumes"("mode_used");

-- Comments for documentation
COMMENT ON COLUMN "public"."resumes"."warnings" IS 'Warnings from extraction process';
COMMENT ON COLUMN "public"."resumes"."mode_used" IS 'Extraction mode used (fast, accurate, oss_fallback, text_file)';
COMMENT ON COLUMN "public"."resumes"."truncated" IS 'Whether document was truncated during extraction';
COMMENT ON COLUMN "public"."resumes"."page_count" IS 'Number of pages in the document';
