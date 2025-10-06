-- Add email verification fields to users_sync table
ALTER TABLE neon_auth.users_sync
ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_status VARCHAR(50) DEFAULT 'verified',
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_expiry TIMESTAMP;

-- Add index for pending email lookups
CREATE INDEX IF NOT EXISTS idx_users_sync_pending_email ON neon_auth.users_sync(pending_email) WHERE pending_email IS NOT NULL;

-- Add index for email verification status
CREATE INDEX IF NOT EXISTS idx_users_sync_email_verification_status ON neon_auth.users_sync(email_verification_status);

-- Add comment for documentation
COMMENT ON COLUMN neon_auth.users_sync.pending_email IS 'Stores new email address during verification process before it becomes the primary email';
COMMENT ON COLUMN neon_auth.users_sync.email_verification_status IS 'Status of email verification: verified, pending_verification, or expired';
COMMENT ON COLUMN neon_auth.users_sync.email_verification_token IS 'Token from Clerk to track the verification request';
COMMENT ON COLUMN neon_auth.users_sync.email_verification_expiry IS 'Expiry timestamp for pending email verification (set by application, typically 24 hours from creation)';

