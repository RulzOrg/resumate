-- Add avatar_url column to users_sync table
ALTER TABLE users_sync ADD COLUMN IF NOT EXISTS avatar_url TEXT;
