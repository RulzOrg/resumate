-- Add admin audit logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for querying by admin user
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);

-- Add index for querying by target user
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON admin_audit_logs(target_user_id);

-- Add index for querying by created_at
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
