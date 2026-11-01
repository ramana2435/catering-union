-- Migration 008: Create admin_audit_logs table
-- Immutable audit trail of administrator actions
-- No updated_at column - records are append-only and never modified

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on admin_id and created_at for admin activity timeline
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_created ON admin_audit_logs(admin_id, created_at);

-- Create index on target_type and target_id for entity audit trail
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);

-- Create index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at);

-- Add comments
COMMENT ON TABLE admin_audit_logs IS 'Immutable audit trail of administrator actions. Records are append-only and never modified.';
COMMENT ON COLUMN admin_audit_logs.admin_id IS 'Admin who performed the action. ON DELETE SET NULL preserves audit trail even if admin deleted.';
COMMENT ON COLUMN admin_audit_logs.action IS 'Action performed (e.g., suspend_user, delete_job, review_report)';
COMMENT ON COLUMN admin_audit_logs.target_type IS 'Type of entity affected (e.g., profile, catering_job, report)';
COMMENT ON COLUMN admin_audit_logs.target_id IS 'UUID of the affected entity';
COMMENT ON COLUMN admin_audit_logs.details IS 'JSONB object with additional context about the action';
