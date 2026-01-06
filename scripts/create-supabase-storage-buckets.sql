-- Supabase Storage Buckets Setup with RLS Policies
-- Run this in the Supabase SQL Editor or via migration

-- ============================================
-- BUCKET: resumes
-- Purpose: Store user uploaded resume files (PDF, DOCX)
-- Access: Private - users can only access their own files
-- ============================================

-- Create the resumes bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

-- RLS Policies for resumes bucket
-- Note: Since we use Clerk for auth (not Supabase Auth), we rely on service role key
-- for server-side operations. These policies are for additional security.

-- Policy: Allow authenticated service role full access
DROP POLICY IF EXISTS "Service role full access on resumes" ON storage.objects;
CREATE POLICY "Service role full access on resumes"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'resumes')
WITH CHECK (bucket_id = 'resumes');

-- Policy: Restrict anon users from direct access (server handles auth via Clerk)
DROP POLICY IF EXISTS "Deny anon access to resumes" ON storage.objects;
CREATE POLICY "Deny anon access to resumes"
ON storage.objects
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ============================================
-- BUCKET: exports
-- Purpose: Store generated DOCX/PDF exports
-- Access: Private - users can only access their own exports
-- ============================================

-- Create the exports bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  false,
  20971520, -- 20MB limit (generated files can be larger)
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

-- RLS Policies for exports bucket

-- Policy: Allow authenticated service role full access
DROP POLICY IF EXISTS "Service role full access on exports" ON storage.objects;
CREATE POLICY "Service role full access on exports"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'exports')
WITH CHECK (bucket_id = 'exports');

-- Policy: Restrict anon users from direct access
DROP POLICY IF EXISTS "Deny anon access to exports" ON storage.objects;
CREATE POLICY "Deny anon access to exports"
ON storage.objects
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ============================================
-- Verify bucket creation
-- ============================================
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('resumes', 'exports');

