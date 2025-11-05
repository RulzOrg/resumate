-- Add unique constraint to prevent duplicate job analyses
ALTER TABLE job_analysis
ADD CONSTRAINT job_analysis_user_job_company_unique
UNIQUE (user_id, job_title, company_name);