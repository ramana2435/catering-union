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
