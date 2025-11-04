-- Create usage_tracking table for tracking feature usage per user
-- This enables enforcement of subscription limits

CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  feature_type VARCHAR(50) NOT NULL, -- 'resume_optimization', 'job_analysis', 'resume_version'
  usage_count INTEGER DEFAULT 0,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  subscription_plan VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint to ensure one record per user per feature per period
  CONSTRAINT unique_user_feature_period UNIQUE (user_id, feature_type, period_start, period_end)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_feature_type ON public.usage_tracking(feature_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON public.usage_tracking(period_start, period_end);

-- Create a composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_usage_tracking_lookup
ON public.usage_tracking(user_id, feature_type, period_start, period_end);

-- Add comments for documentation
COMMENT ON TABLE public.usage_tracking IS 'Tracks feature usage per user for subscription limit enforcement';
COMMENT ON COLUMN public.usage_tracking.feature_type IS 'Type of feature being tracked: resume_optimization, job_analysis, resume_version';
COMMENT ON COLUMN public.usage_tracking.usage_count IS 'Number of times the feature has been used in the current period';
COMMENT ON COLUMN public.usage_tracking.period_start IS 'Start of the billing/tracking period';
COMMENT ON COLUMN public.usage_tracking.period_end IS 'End of the billing/tracking period';
COMMENT ON COLUMN public.usage_tracking.subscription_plan IS 'User subscription plan at the time of tracking';