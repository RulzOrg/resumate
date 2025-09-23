-- Fix foreign key constraint issue for job_analysis table
-- This script resolves the data type mismatch between users_sync.id and job_analysis.user_id

-- First, check the current constraint and data types
-- You can run these queries to see current state:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'users_sync' AND column_name = 'id';

-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'job_analysis' AND column_name = 'user_id';

-- Step 1: Drop the existing foreign key constraint if it exists
ALTER TABLE job_analysis DROP CONSTRAINT IF EXISTS fk_job_analysis_user_id;
ALTER TABLE job_analysis DROP CONSTRAINT IF EXISTS job_analysis_user_id_fkey;

-- Step 2: Ensure both columns have the same data type
-- Standardize on VARCHAR(255) to match users_sync.id
ALTER TABLE job_analysis ALTER COLUMN user_id TYPE VARCHAR(255);

-- Step 3: Re-create the foreign key constraint with proper matching types
ALTER TABLE job_analysis 
ADD CONSTRAINT job_analysis_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users_sync(id) ON DELETE CASCADE;

-- Step 4: Create index for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_job_analysis_user_id ON job_analysis(user_id);

-- Verify the constraint was created properly
-- You can run this query to confirm:
-- SELECT conname, contype, confrelid::regclass, conkey, confkey
-- FROM pg_constraint 
-- WHERE conrelid = 'job_analysis'::regclass AND contype = 'f';