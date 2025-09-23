-- Create the users_sync table from scratch
-- This is the base table that all other tables reference

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users_sync table
CREATE TABLE IF NOT EXISTS users_sync (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    clerk_user_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    subscription_status VARCHAR(50) DEFAULT 'free',
    subscription_plan VARCHAR(50) DEFAULT 'free',
    subscription_period_end TIMESTAMP WITH TIME ZONE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_sync_clerk_user_id ON users_sync(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_sync_email ON users_sync(email);
CREATE INDEX IF NOT EXISTS idx_users_sync_deleted_at ON users_sync(deleted_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_sync_updated_at 
    BEFORE UPDATE ON users_sync 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
