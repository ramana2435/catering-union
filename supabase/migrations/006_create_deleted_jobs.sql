-- Migration 006: Create deleted_jobs table
-- Implements recovery system for soft-deleted catering jobs
-- Stores complete job snapshot as JSONB for easy restoration

CREATE TABLE IF NOT EXISTS deleted_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deleted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  deletion_reason TEXT,
  job_snapshot JSONB NOT NULL
);

-- Create index on original_job_id for recovery lookups
CREATE INDEX IF NOT EXISTS idx_deleted_jobs_original_id ON deleted_jobs(original_job_id);

-- Create index on provider_id for provider's deleted jobs
CREATE INDEX IF NOT EXISTS idx_deleted_jobs_provider ON deleted_jobs(provider_id);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_deleted_jobs_expires_at ON deleted_jobs(expires_at);

-- Add comments
COMMENT ON TABLE deleted_jobs IS 'Recovery system for soft-deleted catering jobs. Stores complete job data as JSONB snapshot.';
COMMENT ON COLUMN deleted_jobs.original_job_id IS 'Original UUID of the deleted catering job';
COMMENT ON COLUMN deleted_jobs.job_snapshot IS 'Complete JSON snapshot of the job data at deletion time. Enables full restoration.';
COMMENT ON COLUMN deleted_jobs.expires_at IS 'When this deleted job record expires and can be permanently removed. Null = keep indefinitely.';
COMMENT ON COLUMN deleted_jobs.deletion_reason IS 'Optional reason provided by user when deleting the job';
