-- Create resume_versions table to store upload snapshots
CREATE TABLE IF NOT EXISTS public.resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  resume_id uuid NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  kind varchar(32) NOT NULL,
  version integer NOT NULL,
  file_name varchar(255) NOT NULL,
  file_type varchar(50) NOT NULL,
  file_size integer NOT NULL,
  file_hash varchar(64) NOT NULL,
  storage_key text NOT NULL,
  metadata jsonb,
  change_type varchar(32) NOT NULL,
  change_summary text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.resume_versions
  ADD CONSTRAINT resume_versions_user_fk
  FOREIGN KEY (user_id)
  REFERENCES neon_auth.users_sync(id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS resume_versions_resume_id_idx ON public.resume_versions (resume_id);
CREATE INDEX IF NOT EXISTS resume_versions_user_id_idx ON public.resume_versions (user_id);
CREATE INDEX IF NOT EXISTS resume_versions_kind_idx ON public.resume_versions (kind);

-- Ensure resumes.file_hash column exists for hash persistence (no-op if already present)
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS file_hash varchar(64);

CREATE INDEX IF NOT EXISTS resumes_file_hash_idx ON public.resumes (file_hash);
