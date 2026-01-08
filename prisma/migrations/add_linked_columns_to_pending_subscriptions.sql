-- Add linked_user_id and linked_at columns to pending_polar_subscriptions table
-- These columns track when a pending subscription has been linked to a user account

ALTER TABLE pending_polar_subscriptions
ADD COLUMN IF NOT EXISTS linked_user_id TEXT,
ADD COLUMN IF NOT EXISTS linked_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups by linked_user_id
CREATE INDEX IF NOT EXISTS idx_pending_polar_subs_linked_user_id ON pending_polar_subscriptions(linked_user_id);

-- Add foreign key constraint to users_sync table (optional, can be commented out if not needed)
-- ALTER TABLE pending_polar_subscriptions
-- ADD CONSTRAINT fk_pending_polar_subs_user
-- FOREIGN KEY (linked_user_id) REFERENCES users_sync(id) ON DELETE SET NULL;
