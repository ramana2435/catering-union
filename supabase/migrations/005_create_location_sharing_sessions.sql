-- Migration 005: Create location_sharing_sessions table
-- Stores temporary voluntary location sharing by workers
-- Location data is privacy-sensitive and access is restricted via RLS

CREATE TABLE IF NOT EXISTS location_sharing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES catering_jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  sharing_enabled BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on job_id and worker_id for efficient provider lookups
CREATE INDEX IF NOT EXISTS idx_location_sessions_job_worker ON location_sharing_sessions(job_id, worker_id);

-- Create index on worker_id for worker's own session management
CREATE INDEX IF NOT EXISTS idx_location_sessions_worker ON location_sharing_sessions(worker_id);

-- Create index on job_id, worker_id, and expires_at for active session queries
CREATE INDEX IF NOT EXISTS idx_location_sessions_active ON location_sharing_sessions(job_id, worker_id, expires_at);

-- Add comments
COMMENT ON TABLE location_sharing_sessions IS 'Temporary voluntary location sharing by workers. Privacy-sensitive data protected by RLS.';
COMMENT ON COLUMN location_sharing_sessions.sharing_enabled IS 'Whether worker has enabled location sharing. Workers can toggle this anytime.';
COMMENT ON COLUMN location_sharing_sessions.expires_at IS 'When this session expires. After expiration, location data should not be accessible.';
COMMENT ON COLUMN location_sharing_sessions.last_updated_at IS 'Last time location was updated. Used for staleness detection.';
