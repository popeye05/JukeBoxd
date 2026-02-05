-- Create account deletion audit table for compliance
CREATE TABLE IF NOT EXISTS account_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ratings_count INTEGER DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  follows_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_deleted_at ON account_deletion_audit(deleted_at);
CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_user_id ON account_deletion_audit(user_id);