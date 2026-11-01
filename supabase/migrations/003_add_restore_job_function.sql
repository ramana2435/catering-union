-- Migration 003: Add restore_job function for job recovery
-- Allows providers and admins to recover soft-deleted jobs within the recovery period

-- ============================================================================
-- FUNCTION: Restore a soft-deleted job
-- ============================================================================
CREATE OR REPLACE FUNCTION restore_job(
  p_deleted_job_id UUID,
  p_restored_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_deleted_record RECORD;
  v_job_snapshot JSONB;
  v_original_job_id UUID;
  v_is_expired BOOLEAN;
BEGIN
  -- Get the deleted job record
  SELECT 
    original_job_id,
    job_snapshot,
    expires_at,
    (expires_at < NOW()) as is_expired
  INTO v_deleted_record
  FROM deleted_jobs
  WHERE id = p_deleted_job_id;

  -- Check if deleted job exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deleted job record % not found', p_deleted_job_id;
  END IF;

  -- Check if recovery period has expired
  IF v_deleted_record.expires_at IS NOT NULL AND v_deleted_record.is_expired THEN
    RAISE EXCEPTION 'Recovery period has expired for this job';
  END IF;

  v_original_job_id := v_deleted_record.original_job_id;
  v_job_snapshot := v_deleted_record.job_snapshot;

  -- Restore the job by clearing deleted_at and deleted_by
  UPDATE catering_jobs
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = NOW()
  WHERE id = v_original_job_id;

  -- Check if the update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to restore job %. Original job may have been permanently deleted.', v_original_job_id;
  END IF;

  -- Remove the deleted job record (job has been restored)
  DELETE FROM deleted_jobs
  WHERE id = p_deleted_job_id;

  RETURN v_original_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION restore_job(UUID, UUID) IS 'Restores a soft-deleted job by clearing deleted_at/deleted_by and removing from deleted_jobs table';
