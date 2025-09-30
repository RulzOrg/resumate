-- Add onboarding completion tracking to users_sync table
-- This migration adds a timestamp field to track when users complete onboarding

-- Add onboarding_completed_at column (NULL means onboarding not completed)
ALTER TABLE users_sync 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance (filtering users by onboarding status)
CREATE INDEX IF NOT EXISTS idx_users_sync_onboarding ON users_sync(onboarding_completed_at);

-- Optional: Mark existing users as having completed onboarding
-- This prevents existing users from being forced through onboarding
UPDATE users_sync 
SET onboarding_completed_at = created_at 
WHERE onboarding_completed_at IS NULL;

-- Add comment to column for documentation
COMMENT ON COLUMN users_sync.onboarding_completed_at IS 'Timestamp when user completed initial onboarding flow. NULL means onboarding not completed.';
