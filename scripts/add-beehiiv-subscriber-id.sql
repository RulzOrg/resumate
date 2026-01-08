-- Add beehiiv_subscriber_id column to users_sync table
-- This column stores the Beehiiv subscriber ID for faster unsubscribe operations
-- and tracking subscription status locally

ALTER TABLE users_sync 
ADD COLUMN IF NOT EXISTS beehiiv_subscriber_id VARCHAR(255);

-- Optional: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_sync_beehiiv_subscriber_id 
ON users_sync(beehiiv_subscriber_id) 
WHERE beehiiv_subscriber_id IS NOT NULL;


