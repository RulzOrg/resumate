-- Create resumes table for storing user resume data
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  content_text TEXT,
  kind VARCHAR(32) NOT NULL DEFAULT 'uploaded',
  processing_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  parsed_sections JSONB,
  extracted_at TIMESTAMP WITH TIME ZONE,
  source_metadata JSONB,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users_sync(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at);
CREATE INDEX IF NOT EXISTS idx_resumes_kind ON resumes(kind);
CREATE INDEX IF NOT EXISTS idx_resumes_processing_status ON resumes(processing_status);

-- Create job_applications table for tracking job applications
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  resume_id UUID NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  job_url TEXT,
  job_description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_job_app_user_id FOREIGN KEY (user_id) REFERENCES users_sync(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_app_resume_id FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

-- Create index for job applications
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_id ON job_applications(resume_id);
