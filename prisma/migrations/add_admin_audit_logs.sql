-- Create ENUM for admin action types
CREATE TYPE admin_action_type AS ENUM (
  'user_view',
  'user_update',
  'user_delete',
  'user_suspend',
  'user_unsuspend',
  'user_role_change',
  'subscription_update',
  'subscription_cancel',
  'data_export',
  'impersonate_start',
  'impersonate_end',
  'settings_change',
  'system_config_change'
);

-- Add admin audit logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL,
  action admin_action_type NOT NULL,
  target_user_id TEXT,
  details JSONB,
  ip_address inet,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_admin_user
    FOREIGN KEY (admin_user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_target_user
    FOREIGN KEY (target_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

-- Add index for querying by admin user
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);

-- Add index for querying by target user
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON admin_audit_logs(target_user_id);

-- Add index for querying by created_at
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
