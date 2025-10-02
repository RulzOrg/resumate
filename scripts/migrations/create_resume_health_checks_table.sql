-- Create resume_health_checks table for ATS Health Checker feature
-- This table stores health check submissions without authentication requirement

CREATE TABLE IF NOT EXISTS resume_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash VARCHAR(64),
  analysis_result JSONB,
  status VARCHAR(32) DEFAULT 'pending',
  processing_error TEXT,
  email_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_resume_health_checks_email ON resume_health_checks(email);
CREATE INDEX IF NOT EXISTS idx_resume_health_checks_file_hash ON resume_health_checks(file_hash);
CREATE INDEX IF NOT EXISTS idx_resume_health_checks_status ON resume_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_resume_health_checks_created_at ON resume_health_checks(created_at);

-- Add comments for documentation
COMMENT ON TABLE resume_health_checks IS 'Stores public ATS health check submissions without authentication requirement';
COMMENT ON COLUMN resume_health_checks.file_hash IS 'SHA-256 hash for deduplication and caching';
COMMENT ON COLUMN resume_health_checks.analysis_result IS 'JSON structure containing ATS analysis results';
COMMENT ON COLUMN resume_health_checks.status IS 'Status: pending, processing, completed, or failed';
