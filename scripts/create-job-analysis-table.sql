-- Create job_analysis table for storing analyzed job postings
CREATE TABLE IF NOT EXISTS job_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  job_url TEXT,
  job_description TEXT NOT NULL,
  analysis_result JSONB NOT NULL,
  keywords TEXT[],
  required_skills TEXT[],
  preferred_skills TEXT[],
  experience_level VARCHAR(100),
  salary_range VARCHAR(100),
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_job_analysis_user_id FOREIGN KEY (user_id) REFERENCES users_sync(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_analysis_user_id ON job_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_job_analysis_created_at ON job_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_job_analysis_keywords ON job_analysis USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_job_analysis_skills ON job_analysis USING GIN(required_skills);
