-- Create pending_polar_subscriptions table for storing subscription data
-- before the user has signed up with Clerk
CREATE TABLE IF NOT EXISTS pending_polar_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polar_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  polar_customer_id VARCHAR(255) NOT NULL,
  polar_checkout_id VARCHAR(255),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  plan_type VARCHAR(50) NOT NULL DEFAULT 'pro',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  amount INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  recurring_interval VARCHAR(20) DEFAULT 'month',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  raw_webhook_data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_polar_subs_email ON pending_polar_subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_pending_polar_subs_status ON pending_polar_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pending_polar_subs_processed ON pending_polar_subscriptions(processed);
