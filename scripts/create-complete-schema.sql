-- Complete database schema for Resume Optimization Platform
-- Run this after creating the users_sync table

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    content_text TEXT,
    is_primary BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for resumes
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_primary ON resumes(is_primary);
CREATE INDEX IF NOT EXISTS idx_resumes_deleted_at ON resumes(deleted_at);

-- Target job URLs captured during onboarding
CREATE TABLE IF NOT EXISTS job_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
    job_url TEXT NOT NULL,
    job_title VARCHAR(255),
    company_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_targets_user_id ON job_targets(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_targets_user_url ON job_targets(user_id, job_url);

-- Job applications table
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    job_url TEXT,
    job_description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for job applications
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_id ON job_applications(resume_id);

-- Job analysis table
CREATE TABLE IF NOT EXISTS job_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    job_url TEXT,
    job_description TEXT NOT NULL,
    analysis_result JSONB NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    required_skills TEXT[] DEFAULT '{}',
    preferred_skills TEXT[] DEFAULT '{}',
    experience_level VARCHAR(100),
    salary_range VARCHAR(100),
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for job analysis
CREATE INDEX IF NOT EXISTS idx_job_analysis_user_id ON job_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_job_analysis_keywords ON job_analysis USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_job_analysis_required_skills ON job_analysis USING GIN(required_skills);

-- Optimized resumes table
CREATE TABLE IF NOT EXISTS optimized_resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
    original_resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_analysis_id UUID NOT NULL REFERENCES job_analysis(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    optimized_content TEXT NOT NULL,
    optimization_summary JSONB NOT NULL,
    match_score INTEGER,
    improvements_made TEXT[] DEFAULT '{}',
    keywords_added TEXT[] DEFAULT '{}',
    skills_highlighted TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimized resumes
CREATE INDEX IF NOT EXISTS idx_optimized_resumes_user_id ON optimized_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_optimized_resumes_original_resume_id ON optimized_resumes(original_resume_id);
CREATE INDEX IF NOT EXISTS idx_optimized_resumes_job_analysis_id ON optimized_resumes(job_analysis_id);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
    bio TEXT,
    company VARCHAR(255),
    job_title VARCHAR(255),
    experience_level VARCHAR(100),
    skills TEXT[] DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_user_id ON user_profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Clerk webhook events table for debugging and audit trail
CREATE TABLE IF NOT EXISTS clerk_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_event_type ON clerk_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_user_id ON clerk_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_created_at ON clerk_webhook_events(created_at);

-- Add triggers to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables with updated_at columns
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_targets_updated_at BEFORE UPDATE ON job_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_analysis_updated_at BEFORE UPDATE ON job_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_optimized_resumes_updated_at BEFORE UPDATE ON optimized_resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
