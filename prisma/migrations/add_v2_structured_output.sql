-- Migration: Add System Prompt v1.1 Structured Output Columns
-- Purpose: Support full v2 resume editing with structured JSON storage
-- Date: December 2024

-- Add structured_output column for SystemPromptV1Output
ALTER TABLE optimized_resumes 
ADD COLUMN IF NOT EXISTS structured_output JSONB DEFAULT NULL;

-- Add qa_metrics column for quality tracking
ALTER TABLE optimized_resumes 
ADD COLUMN IF NOT EXISTS qa_metrics JSONB DEFAULT NULL;

-- Add export_formats column for tracking generated files
ALTER TABLE optimized_resumes 
ADD COLUMN IF NOT EXISTS export_formats JSONB DEFAULT NULL;

-- Create indexes for JSONB columns (improves query performance)
CREATE INDEX IF NOT EXISTS idx_optimized_resumes_structured_output 
ON optimized_resumes USING gin(structured_output);

CREATE INDEX IF NOT EXISTS idx_optimized_resumes_qa_metrics 
ON optimized_resumes USING gin(qa_metrics);

-- Comment the columns for documentation
COMMENT ON COLUMN optimized_resumes.structured_output IS 
'SystemPromptV1Output: Complete v2 structured resume data with UI sections, analysis, and QA';

COMMENT ON COLUMN optimized_resumes.qa_metrics IS 
'QA metrics: Coverage scores, readability metrics, format compliance, duplicate detection';

COMMENT ON COLUMN optimized_resumes.export_formats IS 
'Export URLs: {docx_url, pdf_url, txt_url} for generated files';

-- Verify migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'optimized_resumes' 
  AND column_name IN ('structured_output', 'qa_metrics', 'export_formats')
ORDER BY column_name;
