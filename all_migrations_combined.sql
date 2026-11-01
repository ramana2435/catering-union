-- Migration 001: Create profiles table
-- This table stores user profile information for providers, workers, and admins
-- Each profile is linked to a Supabase Auth user

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('provider', 'worker', 'admin')),
  preferred_language TEXT DEFAULT 'en',
  profile_image_url TEXT,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_verification')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on phone_number (when not null)
-- This prevents duplicate phone numbers across users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_phone_number_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);
  END IF;
END $$;

-- Create index on role for efficient filtering by user type
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Create index on account_status for filtering active/suspended users
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- Add comment to table
COMMENT ON TABLE profiles IS 'User profile information linked to Supabase Auth users. Stores role-based data for providers, workers, and admins.';
COMMENT ON COLUMN profiles.role IS 'User role: provider (posts jobs), worker (applies for jobs), or admin (manages platform)';
COMMENT ON COLUMN profiles.account_status IS 'Account status: active, suspended, or pending_verification';
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
-- Migration 004: Create worker_attendance table
-- Stores real-time attendance and arrival status for workers
-- Tracks progression from confirmed -> getting_ready -> on_the_way -> arrived -> present

CREATE TABLE IF NOT EXISTS worker_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES catering_jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_status TEXT DEFAULT 'confirmed' CHECK (
    attendance_status IN (
      'confirmed', 
      'getting_ready', 
      'on_the_way', 
      'arrived', 
      'present', 
      'absent', 
      'cancelled'
    )
  ),
  arrival_time TIMESTAMPTZ,
  marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on job_id and worker_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_worker_attendance_job_worker ON worker_attendance(job_id, worker_id);

-- Create index on attendance_status for filtering by status
CREATE INDEX IF NOT EXISTS idx_worker_attendance_status ON worker_attendance(attendance_status);

-- Add comments
COMMENT ON TABLE worker_attendance IS 'Real-time attendance tracking for workers. Records progression from confirmation through arrival to presence.';
COMMENT ON COLUMN worker_attendance.attendance_status IS 'Current attendance status: confirmed, getting_ready, on_the_way, arrived, present, absent, or cancelled';
COMMENT ON COLUMN worker_attendance.arrival_time IS 'Timestamp when worker marked as arrived at job location';
COMMENT ON COLUMN worker_attendance.marked_by IS 'User who last updated the attendance status (worker themselves or provider/admin)';
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
-- Migration 007: Create reports table
-- Stores user reports about inappropriate or fake catering job posts
-- Enables community moderation and admin review workflow

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES catering_jobs(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on job_id for viewing all reports about a job
CREATE INDEX IF NOT EXISTS idx_reports_job_id ON reports(job_id);

-- Create index on reporter_id for user's report history
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

-- Create index on status and created_at for admin review queue
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at);

-- Add comments
COMMENT ON TABLE reports IS 'User reports about inappropriate or fake catering job posts. Supports community moderation.';
COMMENT ON COLUMN reports.reason IS 'Primary reason for report (e.g., spam, fake, inappropriate)';
COMMENT ON COLUMN reports.description IS 'Optional detailed description provided by reporter';
COMMENT ON COLUMN reports.status IS 'Report status: pending (awaiting review), reviewed (admin viewed), resolved (action taken), or dismissed (no action needed)';
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
-- Migration 009: Create database functions and triggers
-- Implements automatic updated_at timestamps, event date validation,
-- confirmed workers count management, soft delete, and audit logging

-- ============================================================================
-- FUNCTION 1: Auto-update updated_at column
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to profiles table
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to catering_jobs table
DROP TRIGGER IF EXISTS trigger_catering_jobs_updated_at ON catering_jobs;
CREATE TRIGGER trigger_catering_jobs_updated_at
  BEFORE UPDATE ON catering_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to worker_attendance table
DROP TRIGGER IF EXISTS trigger_worker_attendance_updated_at ON worker_attendance;
CREATE TRIGGER trigger_worker_attendance_updated_at
  BEFORE UPDATE ON worker_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to location_sharing_sessions table (via last_updated_at)
DROP TRIGGER IF EXISTS trigger_location_sessions_updated_at ON location_sharing_sessions;
CREATE TRIGGER trigger_location_sessions_updated_at
  BEFORE UPDATE ON location_sharing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Note: We update last_updated_at instead of updated_at for location_sharing_sessions
CREATE OR REPLACE FUNCTION update_location_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_location_sessions_last_updated ON location_sharing_sessions;
CREATE TRIGGER trigger_location_sessions_last_updated
  BEFORE UPDATE ON location_sharing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_location_last_updated_at();

-- ============================================================================
-- FUNCTION 2: Validate event date on INSERT only
-- ============================================================================
-- This trigger prevents creating jobs with past event dates
-- but allows updating existing jobs (e.g., for corrections or rescheduling)
CREATE OR REPLACE FUNCTION validate_event_date_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Event date cannot be in the past. Provided date: %, Current date: %', 
      NEW.event_date, CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_event_date_insert ON catering_jobs;
CREATE TRIGGER trigger_validate_event_date_insert
  BEFORE INSERT ON catering_jobs
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_date_on_insert();

-- ============================================================================
-- FUNCTION 3: Auto-update confirmed_workers count and job status
-- ============================================================================
-- This trigger recalculates confirmed_workers count whenever confirmations change
-- and automatically updates job status to 'full' when capacity is reached
CREATE OR REPLACE FUNCTION update_confirmed_workers_count()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id UUID;
  v_confirmed_count INTEGER;
  v_required_workers INTEGER;
BEGIN
  -- Determine which job_id to update based on operation
  IF TG_OP = 'DELETE' THEN
    v_job_id := OLD.job_id;
  ELSE
    v_job_id := NEW.job_id;
  END IF;

  -- Count confirmed workers for this job
  SELECT COUNT(*) INTO v_confirmed_count
  FROM job_confirmations
  WHERE job_id = v_job_id 
    AND status = 'confirmed';

  -- Get required_workers count
  SELECT required_workers INTO v_required_workers
  FROM catering_jobs
  WHERE id = v_job_id;

  -- Update the catering_jobs table
  UPDATE catering_jobs
  SET 
    confirmed_workers = v_confirmed_count,
    status = CASE
      WHEN v_confirmed_count >= v_required_workers THEN 'full'
      WHEN status = 'full' AND v_confirmed_count < v_required_workers THEN 'open'
      ELSE status
    END
  WHERE id = v_job_id;

  -- Return appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to job_confirmations table
DROP TRIGGER IF EXISTS trigger_update_confirmed_workers ON job_confirmations;
CREATE TRIGGER trigger_update_confirmed_workers
  AFTER INSERT OR UPDATE OR DELETE ON job_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_confirmed_workers_count();

-- ============================================================================
-- FUNCTION 4: Soft delete job with snapshot preservation
-- ============================================================================
-- Moves job data to deleted_jobs table and marks original as deleted
-- Preserves complete job snapshot for potential recovery
CREATE OR REPLACE FUNCTION soft_delete_job(
  p_job_id UUID,
  p_deleted_by UUID,
  p_deletion_reason TEXT DEFAULT NULL,
  p_expires_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  v_deleted_job_id UUID;
  v_job_snapshot JSONB;
  v_provider_id UUID;
BEGIN
  -- Get job data and convert to JSONB snapshot
  SELECT 
    row_to_json(cj.*)::jsonb,
    cj.provider_id
  INTO v_job_snapshot, v_provider_id
  FROM catering_jobs cj
  WHERE cj.id = p_job_id
    AND cj.deleted_at IS NULL;

  -- Check if job exists and is not already deleted
  IF v_job_snapshot IS NULL THEN
    RAISE EXCEPTION 'Job % not found or already deleted', p_job_id;
  END IF;

  -- Insert into deleted_jobs table
  INSERT INTO deleted_jobs (
    original_job_id,
    provider_id,
    deleted_by,
    deleted_at,
    expires_at,
    deletion_reason,
    job_snapshot
  ) VALUES (
    p_job_id,
    v_provider_id,
    p_deleted_by,
    NOW(),
    NOW() + (p_expires_days || ' days')::INTERVAL,
    p_deletion_reason,
    v_job_snapshot
  ) RETURNING id INTO v_deleted_job_id;

  -- Mark original job as deleted
  UPDATE catering_jobs
  SET 
    deleted_at = NOW(),
    deleted_by = p_deleted_by
  WHERE id = p_job_id;

  RETURN v_deleted_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION 5: Manual admin action logging
-- ============================================================================
-- Allows admins to log important actions to the audit trail
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Verify the user has admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_admin_id 
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'User % is not an admin', p_admin_id;
  END IF;

  -- Insert audit log entry
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    created_at
  ) VALUES (
    p_admin_id,
    p_action,
    p_target_type,
    p_target_id,
    p_details,
    NOW()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp';
COMMENT ON FUNCTION validate_event_date_on_insert() IS 'Prevents creating jobs with past event dates on INSERT only';
COMMENT ON FUNCTION update_confirmed_workers_count() IS 'Recalculates confirmed_workers count and auto-updates status to full when capacity reached';
COMMENT ON FUNCTION soft_delete_job(UUID, UUID, TEXT, INTEGER) IS 'Soft deletes a job by moving data to deleted_jobs and marking original as deleted';
COMMENT ON FUNCTION log_admin_action(UUID, TEXT, TEXT, UUID, JSONB) IS 'Manually log admin actions to audit trail. Requires admin role.';
-- Migration 010: Enable Row Level Security (RLS) on all tables
-- This migration enables the RLS framework but does NOT create any policies
-- Policies will be created in FEAT-002 (separate feature for security policies)

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on catering_jobs table
ALTER TABLE catering_jobs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on job_confirmations table
ALTER TABLE job_confirmations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on worker_attendance table
ALTER TABLE worker_attendance ENABLE ROW LEVEL SECURITY;

-- Enable RLS on location_sharing_sessions table
ALTER TABLE location_sharing_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on deleted_jobs table
ALTER TABLE deleted_jobs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin_audit_logs table
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE profiles IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE catering_jobs IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE job_confirmations IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE worker_attendance IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE location_sharing_sessions IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE deleted_jobs IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE reports IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE admin_audit_logs IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
-- Migration 011: Create performance indexes
-- Optimizes common query patterns for the application
-- Many basic indexes were already created in table creation migrations
-- This migration adds additional composite and specialized indexes

-- ============================================================================
-- Profiles indexes (basic indexes already in migration 001)
-- ============================================================================
-- Already created in 001: idx_profiles_role, idx_profiles_account_status

-- ============================================================================
-- Catering jobs indexes
-- ============================================================================
-- Already created in 002: idx_catering_jobs_provider_status, idx_catering_jobs_event_date, idx_catering_jobs_status

-- Additional index for open jobs by date (common query pattern)
CREATE INDEX IF NOT EXISTS idx_catering_jobs_open_by_date 
  ON catering_jobs(event_date, created_at) 
  WHERE status = 'open' AND deleted_at IS NULL;

-- Index for provider's active jobs
CREATE INDEX IF NOT EXISTS idx_catering_jobs_provider_active 
  ON catering_jobs(provider_id, event_date) 
  WHERE deleted_at IS NULL;

-- ============================================================================
-- Job confirmations indexes
-- ============================================================================
-- Already created in 003: idx_job_confirmations_job_id, idx_job_confirmations_worker_id
-- idx_job_confirmations_job_status, idx_job_confirmations_worker_status

-- Additional index for counting confirmed workers (used by trigger)
CREATE INDEX IF NOT EXISTS idx_job_confirmations_confirmed 
  ON job_confirmations(job_id) 
  WHERE status = 'confirmed';

-- ============================================================================
-- Worker attendance indexes
-- ============================================================================
-- Already created in 004: idx_worker_attendance_job_worker, idx_worker_attendance_status

-- Additional index for job attendance overview
CREATE INDEX IF NOT EXISTS idx_worker_attendance_job_status 
  ON worker_attendance(job_id, attendance_status);

-- ============================================================================
-- Location sharing sessions indexes
-- ============================================================================
-- Already created in 005: idx_location_sessions_job_worker, idx_location_sessions_worker, idx_location_sessions_active

-- Additional index for active sharing sessions
CREATE INDEX IF NOT EXISTS idx_location_sessions_enabled 
  ON location_sharing_sessions(job_id, sharing_enabled) 
  WHERE sharing_enabled = TRUE AND (expires_at IS NULL OR expires_at > NOW());

-- ============================================================================
-- Deleted jobs indexes
-- ============================================================================
-- Already created in 006: idx_deleted_jobs_original_id, idx_deleted_jobs_provider, idx_deleted_jobs_expires_at

-- Additional index for non-expired deleted jobs
CREATE INDEX IF NOT EXISTS idx_deleted_jobs_recoverable 
  ON deleted_jobs(provider_id, deleted_at) 
  WHERE expires_at IS NULL OR expires_at > NOW();

-- ============================================================================
-- Reports indexes
-- ============================================================================
-- Already created in 007: idx_reports_job_id, idx_reports_reporter, idx_reports_status_created

-- Additional index for pending reports (admin queue)
CREATE INDEX IF NOT EXISTS idx_reports_pending 
  ON reports(created_at DESC) 
  WHERE status = 'pending';

-- ============================================================================
-- Admin audit logs indexes
-- ============================================================================
-- Already created in 008: idx_admin_audit_logs_admin_created, idx_admin_audit_logs_target, idx_admin_audit_logs_created

-- Additional index for recent admin actions
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_recent 
  ON admin_audit_logs(created_at DESC);

-- Additional index for actions by type
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action 
  ON admin_audit_logs(action, created_at DESC);

-- ============================================================================
-- Summary of all indexes created across migrations
-- ============================================================================
-- Total indexes: 20+ (including those from earlier migrations)
-- 
-- Profiles: 2 indexes
-- Catering Jobs: 5 indexes
-- Job Confirmations: 5 indexes
-- Worker Attendance: 3 indexes
-- Location Sharing: 4 indexes
-- Deleted Jobs: 3 indexes
-- Reports: 3 indexes
-- Admin Audit Logs: 4 indexes
-- 
-- All indexes use IF NOT EXISTS for idempotency
-- =====================================================
-- Migration: 012_create_rls_policies_profiles.sql
-- Description: Row Level Security policies for profiles table
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "profiles_select_public_info" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_full" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_limited" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON profiles;

-- =====================================================
-- SELECT POLICIES
-- =====================================================

-- Policy 1: All authenticated users can read public profile information
CREATE POLICY "profiles_select_public_info" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: The above policy allows SELECT but application layer should filter
-- sensitive fields. For row-level granularity, use:
-- SELECT id, full_name, role, profile_image_url FROM profiles (public fields)
-- vs SELECT * FROM profiles WHERE id = auth.uid() (all fields for own profile)

-- Policy 2: Admin can SELECT all fields from all profiles
CREATE POLICY "profiles_admin_select_all" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 3: Users can create profile for their own auth.users.id
-- Block self-assignment of admin role
CREATE POLICY "profiles_insert_own_non_admin" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('worker', 'provider')
  );

-- =====================================================
-- UPDATE POLICIES
-- =====================================================

-- Policy 4: Users can update own profile but CANNOT change role or account_status
CREATE POLICY "profiles_update_own_limited" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND NEW.role = OLD.role
    AND NEW.account_status = OLD.account_status
  );

-- Policy 5: Admins can update any field including role and account_status
CREATE POLICY "profiles_admin_update_all" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- NO DELETE POLICIES (preserve data integrity)
-- =====================================================
-- Profiles should never be deleted to maintain referential integrity
-- Use account_status = 'suspended' instead
-- =====================================================
-- Migration: 013_create_rls_policies_catering_jobs.sql
-- Description: Row Level Security policies for catering_jobs table
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "catering_jobs_select_eligible" ON catering_jobs;
DROP POLICY IF EXISTS "catering_jobs_insert_provider" ON catering_jobs;
DROP POLICY IF EXISTS "catering_jobs_update_own_provider" ON catering_jobs;
DROP POLICY IF EXISTS "catering_jobs_soft_delete_own" ON catering_jobs;
DROP POLICY IF EXISTS "catering_jobs_admin_select_all" ON catering_jobs;
DROP POLICY IF EXISTS "catering_jobs_admin_update_all" ON catering_jobs;
DROP POLICY IF EXISTS "catering_jobs_admin_delete" ON catering_jobs;

-- =====================================================
-- SELECT POLICIES
-- =====================================================

-- Policy 1: Authenticated users can view:
--   - Open jobs that are not soft-deleted
--   - Their own jobs as provider
--   - Jobs they confirmed as worker
CREATE POLICY "catering_jobs_select_eligible" ON catering_jobs
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      status = 'open'
      OR provider_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM job_confirmations
        WHERE job_confirmations.job_id = catering_jobs.id
        AND job_confirmations.worker_id = auth.uid()
      )
    )
  );

-- Policy 2: Admins can view all jobs including soft-deleted
CREATE POLICY "catering_jobs_admin_select_all" ON catering_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 3: Providers can create jobs for themselves
CREATE POLICY "catering_jobs_insert_provider" ON catering_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'provider'
    )
  );

-- =====================================================
-- UPDATE POLICIES
-- =====================================================

-- Policy 4: Providers can update own jobs (not deleted, cannot change provider_id)
CREATE POLICY "catering_jobs_update_own_provider" ON catering_jobs
  FOR UPDATE
  TO authenticated
  USING (
    provider_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    provider_id = auth.uid()
    AND NEW.provider_id = OLD.provider_id
  );

-- Policy 5: Providers can soft-delete own jobs (set deleted_at and deleted_by)
CREATE POLICY "catering_jobs_soft_delete_own" ON catering_jobs
  FOR UPDATE
  TO authenticated
  USING (
    provider_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    provider_id = auth.uid()
    AND NEW.deleted_at IS NOT NULL
    AND NEW.deleted_by = auth.uid()
  );

-- Policy 6: Admins can update any job
CREATE POLICY "catering_jobs_admin_update_all" ON catering_jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- DELETE POLICIES
-- =====================================================

-- Policy 7: Admins can hard delete jobs when necessary
CREATE POLICY "catering_jobs_admin_delete" ON catering_jobs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
-- =====================================================
-- Migration: 014_create_rls_policies_job_confirmations.sql
-- Description: Row Level Security policies for job_confirmations table
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "job_confirmations_select_worker" ON job_confirmations;
DROP POLICY IF EXISTS "job_confirmations_select_provider" ON job_confirmations;
DROP POLICY IF EXISTS "job_confirmations_insert_worker" ON job_confirmations;
DROP POLICY IF EXISTS "job_confirmations_update_worker" ON job_confirmations;
DROP POLICY IF EXISTS "job_confirmations_update_provider" ON job_confirmations;
DROP POLICY IF EXISTS "job_confirmations_delete_worker" ON job_confirmations;
DROP POLICY IF EXISTS "job_confirmations_delete_provider" ON job_confirmations;
DROP POLICY IF EXISTS "job_confirmations_admin_all" ON job_confirmations;

-- =====================================================
-- SELECT POLICIES
-- =====================================================

-- Policy 1: Workers can view own confirmations
CREATE POLICY "job_confirmations_select_worker" ON job_confirmations
  FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

-- Policy 2: Providers can view confirmations for their jobs
CREATE POLICY "job_confirmations_select_provider" ON job_confirmations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE catering_jobs.id = job_confirmations.job_id
      AND catering_jobs.provider_id = auth.uid()
    )
  );

-- Policy 3: Admins can view all confirmations
CREATE POLICY "job_confirmations_admin_all" ON job_confirmations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 4: Workers can confirm jobs for themselves (job must exist, not deleted, status open)
CREATE POLICY "job_confirmations_insert_worker" ON job_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    worker_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE id = job_confirmations.job_id
      AND deleted_at IS NULL
      AND status = 'open'
    )
  );

-- =====================================================
-- UPDATE POLICIES
-- =====================================================

-- Policy 5: Workers can update own confirmation status (e.g., cancel)
CREATE POLICY "job_confirmations_update_worker" ON job_confirmations
  FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (
    worker_id = auth.uid()
    AND NEW.worker_id = OLD.worker_id
    AND NEW.job_id = OLD.job_id
  );

-- Policy 6: Providers can update confirmations for their jobs
CREATE POLICY "job_confirmations_update_provider" ON job_confirmations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE catering_jobs.id = job_confirmations.job_id
      AND catering_jobs.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE catering_jobs.id = job_confirmations.job_id
      AND catering_jobs.provider_id = auth.uid()
    )
  );

-- =====================================================
-- DELETE POLICIES
-- =====================================================

-- Policy 7: Workers can delete own confirmations (withdraw from job)
CREATE POLICY "job_confirmations_delete_worker" ON job_confirmations
  FOR DELETE
  TO authenticated
  USING (worker_id = auth.uid());

-- Policy 8: Providers can delete confirmations for their jobs
CREATE POLICY "job_confirmations_delete_provider" ON job_confirmations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE catering_jobs.id = job_confirmations.job_id
      AND catering_jobs.provider_id = auth.uid()
    )
  );
-- =====================================================
-- Migration: 015_create_rls_policies_worker_attendance.sql
-- Description: Row Level Security policies for worker_attendance table
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "worker_attendance_select_worker" ON worker_attendance;
DROP POLICY IF EXISTS "worker_attendance_select_provider" ON worker_attendance;
DROP POLICY IF EXISTS "worker_attendance_insert_provider" ON worker_attendance;
DROP POLICY IF EXISTS "worker_attendance_insert_worker" ON worker_attendance;
DROP POLICY IF EXISTS "worker_attendance_update_provider" ON worker_attendance;
DROP POLICY IF EXISTS "worker_attendance_update_worker" ON worker_attendance;
DROP POLICY IF EXISTS "worker_attendance_delete_provider" ON worker_attendance;
DROP POLICY IF EXISTS "worker_attendance_admin_all" ON worker_attendance;

-- =====================================================
-- SELECT POLICIES
-- =====================================================

-- Policy 1: Workers can view own attendance
CREATE POLICY "worker_attendance_select_worker" ON worker_attendance
  FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

-- Policy 2: Providers can view attendance for their jobs
CREATE POLICY "worker_attendance_select_provider" ON worker_attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE catering_jobs.id = worker_attendance.job_id
      AND catering_jobs.provider_id = auth.uid()
    )
  );

-- Policy 3: Admins can view all attendance
CREATE POLICY "worker_attendance_admin_all" ON worker_attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 4: Providers can create attendance records for workers confirmed for their jobs
CREATE POLICY "worker_attendance_insert_provider" ON worker_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE catering_jobs.id = worker_attendance.job_id
      AND catering_jobs.provider_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM job_confirmations
      WHERE job_confirmations.job_id = worker_attendance.job_id
      AND job_confirmations.worker_id = worker_attendance.worker_id
      AND job_confirmations.status = 'confirmed'
    )
  );

-- Policy 5: Workers can create own attendance with limited status values
CREATE POLICY "worker_attendance_insert_worker" ON worker_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    worker_id = auth.uid()
    AND attendance_status IN ('getting_ready', 'on_the_way', 'arrived')
    AND EXISTS (
      SELECT 1 FROM job_confirmations
      WHERE job_confirmations.job_id = worker_attendance.job_id
      AND job_confirmations.worker_id = auth.uid()
      AND job_confirmations.status = 'confirmed'
    )
  );

-- =====================================================
-- UPDATE POLICIES
-- =====================================================

-- Policy 6: Providers can update attendance for their jobs (mark present/absent)
CREATE POLICY "worker_attendance_update_provider" ON worker_attendance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE catering_jobs.id = worker_attendance.job_id
      AND catering_jobs.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE catering_jobs.id = worker_attendance.job_id
      AND catering_jobs.provider_id = auth.uid()
    )
  );

-- Policy 7: Workers can update own status (getting_ready -> on_the_way -> arrived)
CREATE POLICY "worker_attendance_update_worker" ON worker_attendance
  FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (
    worker_id = auth.uid()
    AND NEW.worker_id = OLD.worker_id
    AND NEW.job_id = OLD.job_id
    AND NEW.attendance_status IN ('getting_ready', 'on_the_way', 'arrived')
  );

-- =====================================================
-- DELETE POLICIES
-- =====================================================

-- Policy 8: Providers can delete attendance for their jobs
CREATE POLICY "worker_attendance_delete_provider" ON worker_attendance
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE catering_jobs.id = worker_attendance.job_id
      AND catering_jobs.provider_id = auth.uid()
    )
  );
-- =====================================================
-- Migration: 016_create_rls_policies_location_sharing.sql
-- Description: Row Level Security policies for location_sharing_sessions table
-- STRICT PRIVACY: Location data is highly sensitive and requires explicit consent
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "location_sharing_select_worker" ON location_sharing_sessions;
DROP POLICY IF EXISTS "location_sharing_select_provider" ON location_sharing_sessions;
DROP POLICY IF EXISTS "location_sharing_insert_worker" ON location_sharing_sessions;
DROP POLICY IF EXISTS "location_sharing_update_worker" ON location_sharing_sessions;
DROP POLICY IF EXISTS "location_sharing_delete_worker" ON location_sharing_sessions;
DROP POLICY IF EXISTS "location_sharing_admin_select" ON location_sharing_sessions;

-- =====================================================
-- SELECT POLICIES - STRICT PRIVACY ENFORCEMENT
-- =====================================================

-- Policy 1: Workers can view own location sharing sessions
CREATE POLICY "location_sharing_select_worker" ON location_sharing_sessions
  FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

-- Policy 2: Providers can view location ONLY for:
--   - Workers confirmed for their jobs
--   - Sessions that have NOT expired
--   - This ensures location is only visible during active job period
CREATE POLICY "location_sharing_select_provider" ON location_sharing_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE catering_jobs.id = location_sharing_sessions.job_id
      AND catering_jobs.provider_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM job_confirmations
      WHERE job_confirmations.job_id = location_sharing_sessions.job_id
      AND job_confirmations.worker_id = location_sharing_sessions.worker_id
      AND job_confirmations.status = 'confirmed'
    )
    AND location_sharing_sessions.expires_at > NOW()
  );

-- Policy 3: Admins can view location sessions (for support/safety purposes)
CREATE POLICY "location_sharing_admin_select" ON location_sharing_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 4: Workers can create location sessions for jobs they confirmed
CREATE POLICY "location_sharing_insert_worker" ON location_sharing_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    worker_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM job_confirmations
      WHERE job_confirmations.job_id = location_sharing_sessions.job_id
      AND job_confirmations.worker_id = auth.uid()
      AND job_confirmations.status = 'confirmed'
    )
  );

-- =====================================================
-- UPDATE POLICIES
-- =====================================================

-- Policy 5: Workers can update own location sessions
--   - Toggle sharing_enabled (opt-out mechanism)
--   - Update coordinates
--   - Extend or reduce expiration
CREATE POLICY "location_sharing_update_worker" ON location_sharing_sessions
  FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (
    worker_id = auth.uid()
    AND NEW.worker_id = OLD.worker_id
    AND NEW.job_id = OLD.job_id
  );

-- =====================================================
-- DELETE POLICIES
-- =====================================================

-- Policy 6: Workers can delete own location sessions (stop sharing completely)
CREATE POLICY "location_sharing_delete_worker" ON location_sharing_sessions
  FOR DELETE
  TO authenticated
  USING (worker_id = auth.uid());

-- =====================================================
-- NOTES ON PRIVACY PROTECTION
-- =====================================================
-- 1. Expired sessions (expires_at < NOW()) are NOT accessible via provider SELECT policy
-- 2. Only confirmed workers for a specific job can share location
-- 3. Providers can ONLY see location for workers in THEIR jobs
-- 4. Workers can disable sharing at any time via sharing_enabled = false
-- 5. No cascading deletes - if job deleted, location sessions remain for audit but invisible
-- 6. Application layer should respect sharing_enabled flag in queries
-- =====================================================
-- Migration: 017_create_rls_policies_deleted_jobs.sql
-- Description: Row Level Security policies for deleted_jobs table
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "deleted_jobs_select_provider" ON deleted_jobs;
DROP POLICY IF EXISTS "deleted_jobs_insert_provider" ON deleted_jobs;
DROP POLICY IF EXISTS "deleted_jobs_update_admin" ON deleted_jobs;
DROP POLICY IF EXISTS "deleted_jobs_delete_admin" ON deleted_jobs;
DROP POLICY IF EXISTS "deleted_jobs_admin_all" ON deleted_jobs;

-- =====================================================
-- SELECT POLICIES
-- =====================================================

-- Policy 1: Providers can view own deleted jobs
CREATE POLICY "deleted_jobs_select_provider" ON deleted_jobs
  FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

-- Policy 2: Admins can view all deleted jobs
CREATE POLICY "deleted_jobs_admin_all" ON deleted_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 3: Inserts are automatic via soft_delete_job() function (SECURITY DEFINER)
-- Allow inserts only when auth.uid() matches provider_id
-- This prevents users from creating fake deleted job records
CREATE POLICY "deleted_jobs_insert_provider" ON deleted_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    deleted_by = auth.uid()
    AND provider_id = auth.uid()
  );

-- =====================================================
-- UPDATE POLICIES
-- =====================================================

-- Policy 4: Admins can update deleted jobs (e.g., adjust expiration, add notes)
CREATE POLICY "deleted_jobs_update_admin" ON deleted_jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- DELETE POLICIES
-- =====================================================

-- Policy 5: Admins can delete (cleanup after restore or expired retention)
CREATE POLICY "deleted_jobs_delete_admin" ON deleted_jobs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Regular workers CANNOT access deleted_jobs table at all
-- 2. Providers can only see jobs they deleted themselves
-- 3. soft_delete_job() function handles the actual insert with SECURITY DEFINER
-- 4. job_snapshot JSONB column preserves all original job data for recovery
-- 5. expires_at can be used for automatic cleanup via scheduled job
-- =====================================================
-- Migration: 018_create_rls_policies_reports.sql
-- Description: Row Level Security policies for reports table
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "reports_select_reporter" ON reports;
DROP POLICY IF EXISTS "reports_insert_user" ON reports;
DROP POLICY IF EXISTS "reports_admin_select_all" ON reports;
DROP POLICY IF EXISTS "reports_admin_update" ON reports;
DROP POLICY IF EXISTS "reports_admin_delete" ON reports;

-- =====================================================
-- SELECT POLICIES
-- =====================================================

-- Policy 1: Users can view own submitted reports
CREATE POLICY "reports_select_reporter" ON reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Policy 2: Admins can view all reports
CREATE POLICY "reports_admin_select_all" ON reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 3: Authenticated users can submit reports
-- Report must reference a valid job
CREATE POLICY "reports_insert_user" ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE id = reports.job_id
    )
  );

-- =====================================================
-- UPDATE POLICIES
-- =====================================================

-- Policy 4: Only admins can update reports
-- Used to update status ('reviewed', 'resolved', 'dismissed')
CREATE POLICY "reports_admin_update" ON reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- DELETE POLICIES
-- =====================================================

-- Policy 5: Only admins can delete reports
CREATE POLICY "reports_admin_delete" ON reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Regular users cannot delete their own reports (prevent abuse)
-- 2. Users can view status updates on their reports
-- 3. Only admins can change report status
-- 4. Report reasons should be validated in application layer
-- 5. Consider adding rate limiting for report submissions
-- =====================================================
-- Migration: 019_create_rls_policies_audit_logs.sql
-- Description: Row Level Security policies for admin_audit_logs table
-- IMMUTABLE: Audit logs cannot be updated or deleted
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "audit_logs_select_admin" ON admin_audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON admin_audit_logs;

-- =====================================================
-- SELECT POLICIES
-- =====================================================

-- Policy 1: Only admins can view audit logs
CREATE POLICY "audit_logs_select_admin" ON admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 2: Admins can insert audit logs via log_admin_action() function
-- The function is SECURITY DEFINER and sets admin_id = auth.uid()
CREATE POLICY "audit_logs_insert_admin" ON admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- NO UPDATE POLICIES - IMMUTABLE AUDIT TRAIL
-- =====================================================
-- Audit logs must never be modified after creation
-- This ensures complete accountability and prevents tampering

-- =====================================================
-- NO DELETE POLICIES - IMMUTABLE AUDIT TRAIL
-- =====================================================
-- Audit logs must never be deleted
-- Even if an admin account is compromised, the audit trail remains
-- For compliance and forensic purposes, all actions are permanently recorded

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Only INSERT and SELECT policies exist for this table
-- 2. No UPDATE policy = nobody can modify audit logs
-- 3. No DELETE policy = nobody can delete audit logs
-- 4. admin_id uses ON DELETE SET NULL to preserve logs even if admin deleted
-- 5. Use log_admin_action() function for consistent audit logging
-- 6. details JSONB field can store arbitrary context about the action
-- 7. target_type and target_id provide structured references
