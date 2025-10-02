-- Create a new resume_health_checks table to store resume health check data
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


-- Create indexes for faster queries
CREATE INDEX idx_resume_health_checks_email ON resume_health_checks(email);
CREATE INDEX idx_resume_health_checks_file_hash ON resume_health_checks(file_hash);
CREATE INDEX idx_resume_health_checks_status ON resume_health_checks(status);
CREATE INDEX idx_resume_health_checks_created_at ON resume_health_checks(created_at);