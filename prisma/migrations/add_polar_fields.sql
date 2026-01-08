-- Add Polar subscription fields to users_sync table
ALTER TABLE users_sync ADD COLUMN IF NOT EXISTS polar_customer_id VARCHAR(255) UNIQUE;
ALTER TABLE users_sync ADD COLUMN IF NOT EXISTS polar_subscription_id VARCHAR(255) UNIQUE;

-- Create index on polar_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_sync_polar_customer_id ON users_sync(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_sync_polar_subscription_id ON users_sync(polar_subscription_id);
