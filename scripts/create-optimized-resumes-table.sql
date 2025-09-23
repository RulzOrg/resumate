-- Create optimized_resumes table for storing AI-optimized resume versions
CREATE TABLE IF NOT EXISTS optimized_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  original_resume_id UUID NOT NULL,
  job_analysis_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  optimized_content TEXT NOT NULL,
  optimization_summary JSONB NOT NULL,
  match_score INTEGER,
  improvements_made TEXT[],
  keywords_added TEXT[],
  skills_highlighted TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_optimized_user_id FOREIGN KEY (user_id) REFERENCES users_sync(id) ON DELETE CASCADE,
  CONSTRAINT fk_optimized_resume_id FOREIGN KEY (original_resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  CONSTRAINT fk_optimized_job_analysis_id FOREIGN KEY (job_analysis_id) REFERENCES job_analysis(id) ON DELETE CASCADE
);

-- Create indexes for optimized resumes
CREATE INDEX IF NOT EXISTS idx_optimized_resumes_user_id ON optimized_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_optimized_resumes_original_id ON optimized_resumes(original_resume_id);
CREATE INDEX IF NOT EXISTS idx_optimized_resumes_job_analysis_id ON optimized_resumes(job_analysis_id);
CREATE INDEX IF NOT EXISTS idx_optimized_resumes_created_at ON optimized_resumes(created_at);
