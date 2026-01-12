-- Add onboarding tracking columns to users_sync table
ALTER TABLE users_sync ADD COLUMN IF NOT EXISTS tour_completed_at TIMESTAMP;
ALTER TABLE users_sync ADD COLUMN IF NOT EXISTS getting_started_dismissed_at TIMESTAMP;
