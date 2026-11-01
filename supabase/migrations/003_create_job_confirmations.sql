-- Migration 003: Create job_confirmations table
-- Stores worker confirmations for catering jobs
-- Prevents duplicate confirmations via unique constraint

CREATE TABLE IF NOT EXISTS job_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES catering_jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed',
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

-- Prevent duplicate confirmations for the same worker and job
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'job_confirmations_job_worker_unique'
  ) THEN
    ALTER TABLE job_confirmations 
    ADD CONSTRAINT job_confirmations_job_worker_unique UNIQUE (job_id, worker_id);
  END IF;
END $$;

-- Create index on job_id for efficient queries by job
CREATE INDEX IF NOT EXISTS idx_job_confirmations_job_id ON job_confirmations(job_id);

-- Create index on worker_id for efficient queries by worker
CREATE INDEX IF NOT EXISTS idx_job_confirmations_worker_id ON job_confirmations(worker_id);

-- Create index on job_id and status for filtering confirmed workers
CREATE INDEX IF NOT EXISTS idx_job_confirmations_job_status ON job_confirmations(job_id, status);

-- Create index on worker_id and status for worker's confirmed jobs
CREATE INDEX IF NOT EXISTS idx_job_confirmations_worker_status ON job_confirmations(worker_id, status);

-- Add comments
COMMENT ON TABLE job_confirmations IS 'Worker confirmations for catering jobs. Unique constraint prevents duplicate confirmations.';
COMMENT ON COLUMN job_confirmations.status IS 'Confirmation status: confirmed or cancelled';
COMMENT ON COLUMN job_confirmations.confirmed_at IS 'Timestamp when worker confirmed participation';
COMMENT ON COLUMN job_confirmations.cancelled_at IS 'Timestamp when confirmation was cancelled (if applicable)';
