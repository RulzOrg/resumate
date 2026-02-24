-- Enable Row Level Security (RLS) on all public tables
-- Since this app uses Clerk for authentication (not Supabase Auth),
-- all database access should go through the Next.js API routes using the service role key.
-- These policies block direct access from anon/authenticated roles while allowing service role access.

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.ats_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clerk_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_magnet_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimized_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_polar_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_sync ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RESTRICTIVE POLICIES
-- These policies deny all access to anon and authenticated roles.
-- The service role (used by your Next.js API) bypasses RLS entirely.
-- ============================================================================

-- ats_checks - ATS check data, accessed via API
CREATE POLICY "Deny all access to ats_checks"
  ON public.ats_checks
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- chat_messages - User chat data, accessed via API
CREATE POLICY "Deny all access to chat_messages"
  ON public.chat_messages
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- clerk_webhook_events - Only accessed by webhook handlers (service role)
CREATE POLICY "Deny all access to clerk_webhook_events"
  ON public.clerk_webhook_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- job_analysis - User data, accessed via API
CREATE POLICY "Deny all access to job_analysis"
  ON public.job_analysis
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- job_applications - User data, accessed via API
CREATE POLICY "Deny all access to job_applications"
  ON public.job_applications
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- job_targets - User data, accessed via API
CREATE POLICY "Deny all access to job_targets"
  ON public.job_targets
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- lead_magnet_submissions - Public lead gen, accessed via API
CREATE POLICY "Deny all access to lead_magnet_submissions"
  ON public.lead_magnet_submissions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- optimization_sessions - Session data, accessed via API
CREATE POLICY "Deny all access to optimization_sessions"
  ON public.optimization_sessions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Fix mutable search_path on optimization_sessions trigger function
CREATE OR REPLACE FUNCTION public.update_optimization_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- optimized_resumes - User data, accessed via API
CREATE POLICY "Deny all access to optimized_resumes"
  ON public.optimized_resumes
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- pending_polar_subscriptions - Payment data, accessed via webhooks/API
CREATE POLICY "Deny all access to pending_polar_subscriptions"
  ON public.pending_polar_subscriptions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- resume_versions - User data, accessed via API
CREATE POLICY "Deny all access to resume_versions"
  ON public.resume_versions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- resumes - User data, accessed via API
CREATE POLICY "Deny all access to resumes"
  ON public.resumes
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- usage_tracking - System data, accessed via API
CREATE POLICY "Deny all access to usage_tracking"
  ON public.usage_tracking
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- user_profiles - User data, accessed via API
CREATE POLICY "Deny all access to user_profiles"
  ON public.user_profiles
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- users_sync - User data, accessed via API/webhooks
CREATE POLICY "Deny all access to users_sync"
  ON public.users_sync
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- VERIFICATION QUERY
-- Run this after applying policies to confirm RLS is enabled:
-- ============================================================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
