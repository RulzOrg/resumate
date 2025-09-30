-- Migration: Fix processing_status default value
-- Changes the default from 'completed' to 'pending' which is more accurate
-- for newly created resumes that haven't been processed yet

-- Change the default value for the processing_status column
ALTER TABLE resumes
  ALTER COLUMN processing_status SET DEFAULT 'pending';

-- Note: This does NOT change existing records, only the default for new inserts
-- Existing records will keep their current processing_status values