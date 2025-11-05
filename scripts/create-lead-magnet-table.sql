-- Create lead_magnet_submissions table for storing resume builder lead magnet submissions
CREATE TABLE IF NOT EXISTS lead_magnet_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  original_file_url TEXT NOT NULL,
  original_file_hash VARCHAR(64),
  optimized_file_url TEXT,
  optimized_file_hash VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error TEXT,
  improvements_summary JSONB, -- Stores extracted text and improvements
  ip_address VARCHAR(45),
  user_agent TEXT,
  download_expires_at TIMESTAMP WITH TIME ZONE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  converted_to_user BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_lead_magnet_email ON lead_magnet_submissions(email);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_status ON lead_magnet_submissions(status);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_created_at ON lead_magnet_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_download_expires ON lead_magnet_submissions(download_expires_at);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_converted ON lead_magnet_submissions(converted_to_user);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_submitted_at ON lead_magnet_submissions(submitted_at DESC);

-- Add a comment to the table
COMMENT ON TABLE lead_magnet_submissions IS 'Stores submissions from the resume builder lead magnet';
COMMENT ON COLUMN lead_magnet_submissions.improvements_summary IS 'JSON containing extracted text, analysis results, and improvements';
COMMENT ON COLUMN lead_magnet_submissions.converted_to_user IS 'True if this lead converted to a registered user';