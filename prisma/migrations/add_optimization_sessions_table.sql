-- Migration: Create optimization_sessions table for flow state persistence
-- This table stores the state of resume optimization flows so users can resume sessions

CREATE TABLE IF NOT EXISTS public.optimization_sessions (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id text NOT NULL,

  -- Resume reference
  resume_id uuid NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,

  -- Job details
  job_title varchar(255) NOT NULL,
  job_description text NOT NULL,
  company_name varchar(255),

  -- Flow state
  current_step smallint NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4),
  status varchar(32) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),

  -- Step results (stored as JSONB for flexibility)
  -- Resume text is stored to avoid re-fetching
  resume_text text,

  -- Step 1: Analysis results
  analysis_result jsonb,

  -- Step 2: Rewrite results (original LLM output)
  rewrite_result jsonb,

  -- Step 2: Edited content (user modifications)
  edited_content jsonb,

  -- Step 3: ATS scan results
  ats_scan_result jsonb,

  -- Step 4: Interview prep results
  interview_prep_result jsonb,

  -- Metadata
  last_active_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint to users_sync table
ALTER TABLE public.optimization_sessions
  ADD CONSTRAINT optimization_sessions_user_fk
  FOREIGN KEY (user_id)
  REFERENCES neon_auth.users_sync(id)
  ON DELETE CASCADE;

-- Create indexes for efficient queries
-- Index for finding user's sessions
CREATE INDEX IF NOT EXISTS optimization_sessions_user_id_idx
  ON public.optimization_sessions (user_id);

-- Index for finding sessions by resume
CREATE INDEX IF NOT EXISTS optimization_sessions_resume_id_idx
  ON public.optimization_sessions (resume_id);

-- Index for finding in-progress sessions (most common query)
CREATE INDEX IF NOT EXISTS optimization_sessions_status_idx
  ON public.optimization_sessions (user_id, status)
  WHERE status = 'in_progress';

-- Index for sorting by last activity
CREATE INDEX IF NOT EXISTS optimization_sessions_last_active_idx
  ON public.optimization_sessions (user_id, last_active_at DESC);

-- Composite index for finding user's recent in-progress sessions
CREATE INDEX IF NOT EXISTS optimization_sessions_user_active_idx
  ON public.optimization_sessions (user_id, status, last_active_at DESC);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_optimization_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS optimization_sessions_updated_at_trigger ON public.optimization_sessions;

CREATE TRIGGER optimization_sessions_updated_at_trigger
  BEFORE UPDATE ON public.optimization_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_sessions_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.optimization_sessions IS
  'Stores state for resume optimization flows, allowing users to resume interrupted sessions';

COMMENT ON COLUMN public.optimization_sessions.current_step IS
  'Current step in the flow: 1=Analysis, 2=Rewrite, 3=ATS Scan, 4=Interview Prep';

COMMENT ON COLUMN public.optimization_sessions.status IS
  'Session status: in_progress (active), completed (finished all steps), abandoned (user left)';

COMMENT ON COLUMN public.optimization_sessions.analysis_result IS
  'JSON: {matchScore, strongFitReasons[], holdingBackReasons[], missingKeywords[]}';

COMMENT ON COLUMN public.optimization_sessions.rewrite_result IS
  'JSON: {professionalSummary, workExperiences[], keywordsAdded[]}';

COMMENT ON COLUMN public.optimization_sessions.edited_content IS
  'JSON: {professionalSummary, workExperiences[]} - User-edited version of rewrite';

COMMENT ON COLUMN public.optimization_sessions.ats_scan_result IS
  'JSON: {overallScore, sections[], criticalIssues[], warnings[], recommendations[]}';

COMMENT ON COLUMN public.optimization_sessions.interview_prep_result IS
  'JSON: {questions[{question, difficulty, category, perfectAnswer, keyPoints[], relatedExperience}]}';
