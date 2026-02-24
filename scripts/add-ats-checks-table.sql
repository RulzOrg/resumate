-- ATS Resume Checker Lead Magnet Table
-- Stores resume uploads, email captures, and analysis results

CREATE TABLE IF NOT EXISTS ats_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lead capture fields
  email VARCHAR(255),
  email_submitted_at TIMESTAMPTZ,
  first_name VARCHAR(100),

  -- File information
  original_file_name VARCHAR(255) NOT NULL,
  original_file_url TEXT NOT NULL,
  original_file_hash VARCHAR(64),
  file_type VARCHAR(50) NOT NULL,
  file_size INT NOT NULL,

  -- Extracted content
  extracted_text TEXT,
  parsed_sections JSONB,

  -- Overall and category scores (0-100)
  overall_score INT,
  content_score INT,
  sections_score INT,
  ats_essentials_score INT,
  tailoring_score INT,

  -- Detailed analysis results
  issues JSONB,             -- Array of issue objects
  category_details JSONB,   -- Full breakdown per category

  -- Job description for tailoring (optional)
  job_description TEXT,
  job_title VARCHAR(255),
  company_name VARCHAR(255),

  -- Processing status
  -- Values: uploaded, email_captured, analyzing, completed, error
  status VARCHAR(32) NOT NULL DEFAULT 'uploaded',
  processing_error TEXT,

  -- Tracking & Analytics
  ip_address VARCHAR(45),
  user_agent TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  referrer TEXT,

  -- Conversion tracking
  converted_to_user BOOLEAN DEFAULT false,
  converted_user_id VARCHAR(255),
  converted_at TIMESTAMPTZ,

  -- Beehiiv newsletter integration
  beehiiv_subscribed BOOLEAN DEFAULT false,
  beehiiv_subscriber_id VARCHAR(100),
  marketing_consent BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ    -- Results expire after 30 days
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ats_checks_email ON ats_checks(email);
CREATE INDEX IF NOT EXISTS idx_ats_checks_status ON ats_checks(status);
CREATE INDEX IF NOT EXISTS idx_ats_checks_created_at ON ats_checks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ats_checks_ip_address ON ats_checks(ip_address);
CREATE INDEX IF NOT EXISTS idx_ats_checks_converted ON ats_checks(converted_to_user);
CREATE INDEX IF NOT EXISTS idx_ats_checks_overall_score ON ats_checks(overall_score);
CREATE INDEX IF NOT EXISTS idx_ats_checks_file_hash ON ats_checks(original_file_hash);

-- Comments for documentation
COMMENT ON TABLE ats_checks IS 'ATS Resume Checker lead magnet - stores uploads, email captures, and analysis results';
COMMENT ON COLUMN ats_checks.status IS 'Processing status: uploaded|email_captured|analyzing|completed|error';
COMMENT ON COLUMN ats_checks.issues IS 'Array of ATSIssue objects with severity, category, recommendations';
COMMENT ON COLUMN ats_checks.category_details IS 'Full scoring breakdown for content, sections, essentials, tailoring';
COMMENT ON COLUMN ats_checks.expires_at IS 'Results expire 30 days after analysis to encourage account creation';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ats_checks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for automatic updated_at
DROP TRIGGER IF EXISTS trigger_ats_checks_updated_at ON ats_checks;
CREATE TRIGGER trigger_ats_checks_updated_at
  BEFORE UPDATE ON ats_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_ats_checks_updated_at();
