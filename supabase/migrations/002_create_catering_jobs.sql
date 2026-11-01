-- Migration 002: Create catering_jobs table
-- Stores catering work requirements posted by providers
-- Includes soft delete functionality and location tracking

CREATE TABLE IF NOT EXISTS catering_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_type TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  required_workers INTEGER NOT NULL CHECK (required_workers > 0),
  confirmed_workers INTEGER DEFAULT 0 CHECK (confirmed_workers >= 0),
  address TEXT NOT NULL,
  area TEXT,
  city TEXT,
  district TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  google_maps_url TEXT,
  description TEXT,
  contact_person TEXT,
  contact_number TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'full', 'completed', 'cancelled')),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure confirmed_workers never exceeds required_workers
  CONSTRAINT confirmed_workers_not_exceed_required CHECK (confirmed_workers <= required_workers)
);

-- Create index on provider_id and status for efficient job queries
CREATE INDEX IF NOT EXISTS idx_catering_jobs_provider_status ON catering_jobs(provider_id, status);

-- Create index on event_date for chronological queries (exclude soft-deleted)
CREATE INDEX IF NOT EXISTS idx_catering_jobs_event_date ON catering_jobs(event_date) WHERE deleted_at IS NULL;

-- Create index on status for filtering open/full/completed jobs
CREATE INDEX IF NOT EXISTS idx_catering_jobs_status ON catering_jobs(status) WHERE deleted_at IS NULL;

-- Add comments
COMMENT ON TABLE catering_jobs IS 'Catering job postings by providers. Includes soft delete support (deleted_at, deleted_by).';
COMMENT ON COLUMN catering_jobs.required_workers IS 'Number of workers needed for this job. Must be > 0.';
COMMENT ON COLUMN catering_jobs.confirmed_workers IS 'Number of confirmed workers. Auto-updated by trigger. Must be >= 0 and <= required_workers.';
COMMENT ON COLUMN catering_jobs.status IS 'Job status: open (accepting workers), full (reached capacity), completed, or cancelled';
COMMENT ON COLUMN catering_jobs.deleted_at IS 'Soft delete timestamp. When set, job is hidden from normal listings.';
COMMENT ON COLUMN catering_jobs.deleted_by IS 'User who deleted this job (provider or admin)';
