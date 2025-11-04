-- Migration: Add newsletter subscription tracking columns to users_sync
-- Date: 2025-10-30
-- Purpose: Support Beehiiv email marketing integration

-- Add newsletter subscription columns
ALTER TABLE users_sync
ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS beehiiv_subscriber_id TEXT,
ADD COLUMN IF NOT EXISTS newsletter_subscribed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS newsletter_unsubscribed_at TIMESTAMP;

-- Add index for querying subscribed users
CREATE INDEX IF NOT EXISTS idx_users_newsletter_subscribed
ON users_sync(newsletter_subscribed)
WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users_sync.newsletter_subscribed IS 'User opted into newsletter subscription';
COMMENT ON COLUMN users_sync.beehiiv_subscriber_id IS 'Beehiiv API subscriber ID for tracking';
COMMENT ON COLUMN users_sync.newsletter_subscribed_at IS 'Timestamp when user subscribed to newsletter';
COMMENT ON COLUMN users_sync.newsletter_unsubscribed_at IS 'Timestamp when user unsubscribed from newsletter';
