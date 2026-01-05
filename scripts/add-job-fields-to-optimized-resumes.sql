-- Add job fields to optimized_resumes table for MVP simplified flow
ALTER TABLE optimized_resumes 
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS job_description TEXT;

-- Make job_analysis_id nullable since we no longer require it
ALTER TABLE optimized_resumes 
ALTER COLUMN job_analysis_id DROP NOT NULL;
