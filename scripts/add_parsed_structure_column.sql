-- Add columns for caching LLM-extracted resume structure
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_structure JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP WITH TIME ZONE;

-- Create an index to help with finding processed resumes if needed later
CREATE INDEX IF NOT EXISTS idx_resumes_parsed_at ON resumes(parsed_at);
