-- Migration script to update database schema for Clerk integration
-- This script updates the users_sync table to work with Clerk user IDs

-- First, let's add a clerk_user_id column to track Clerk users
ALTER TABLE users_sync 
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Create an index on clerk_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_sync_clerk_user_id ON users_sync(clerk_user_id);

-- Update the raw_json column to remove password-related data since Clerk handles auth
-- We'll keep the raw_json for any additional user metadata we might need

-- Add a subscription-related columns for billing integration
ALTER TABLE users_sync 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create indexes for subscription-related queries
CREATE INDEX IF NOT EXISTS idx_users_sync_subscription_status ON users_sync(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_sync_stripe_customer_id ON users_sync(stripe_customer_id);

-- Add a webhook events table to track Clerk webhook events
CREATE TABLE IF NOT EXISTS clerk_webhook_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_id TEXT UNIQUE NOT NULL,
    user_id TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_event_type ON clerk_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_user_id ON clerk_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_created_at ON clerk_webhook_events(created_at);

-- Add a user_profiles table for additional user data that Clerk doesn't handle
CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
    bio TEXT,
    company TEXT,
    job_title TEXT,
    experience_level TEXT,
    skills TEXT[],
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_user_id ON user_profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Update existing tables to ensure they work with the new schema
-- No changes needed for resumes, job_analysis, job_applications, or optimized_resumes
-- as they already reference user_id from users_sync table

COMMENT ON TABLE users_sync IS 'Main users table synced with Clerk authentication';
COMMENT ON COLUMN users_sync.clerk_user_id IS 'Clerk user ID for authentication sync';
COMMENT ON COLUMN users_sync.subscription_status IS 'Current subscription status (free, active, canceled, etc.)';
COMMENT ON COLUMN users_sync.subscription_plan IS 'Current subscription plan (free, pro, enterprise)';
COMMENT ON TABLE clerk_webhook_events IS 'Log of Clerk webhook events for debugging and sync';
COMMENT ON TABLE user_profiles IS 'Extended user profile data not handled by Clerk';
