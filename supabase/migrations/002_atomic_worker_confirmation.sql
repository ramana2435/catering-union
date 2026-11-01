-- ================================================================================
-- MIGRATION 002: Atomic Worker Confirmation with Vacancy Integrity
-- ================================================================================
-- This migration adds a PostgreSQL function for safe, atomic worker confirmations
-- preventing race conditions when multiple workers try to book the last vacancy.
--
-- FEATURES:
-- 1. Atomic vacancy check and confirmation insert in a single transaction
-- 2. Prevents duplicate confirmations
-- 3. Prevents booking full, cancelled, or completed jobs
-- 4. Automatically updates confirmed_workers count
-- 5. Automatically updates job status to 'full' when capacity reached
-- 6. Returns clear result codes for all scenarios
--
-- INSTRUCTIONS:
-- 1. Go to: https://supabase.com/dashboard/project/hvltowwtbyslgnfmhhcn/editor
-- 2. Copy this entire file
-- 3. Paste and click "Run"
-- 4. Verify it returns "Success. No rows returned" or similar success message
-- ================================================================================

-- Create or replace the atomic worker confirmation function
CREATE OR REPLACE FUNCTION confirm_worker_for_job(
  p_job_id UUID,
  p_worker_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_record RECORD;
  v_existing_confirmation UUID;
  v_new_confirmation_id UUID;
  v_new_confirmed_count INTEGER;
BEGIN
  -- Lock the job row for update to prevent race conditions
  SELECT 
    id,
    status,
    required_workers,
    confirmed_workers,
    deleted_at,
    event_date
  INTO v_job_record
  FROM catering_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  -- Check if job exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'code', 'JOB_NOT_FOUND',
      'message', 'Job not found'
    );
  END IF;

  -- Check if job is deleted
  IF v_job_record.deleted_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'code', 'JOB_DELETED',
      'message', 'This job has been removed'
    );
  END IF;

  -- Check if job is cancelled
  IF v_job_record.status = 'cancelled' THEN
    RETURN json_build_object(
      'success', false,
      'code', 'JOB_CANCELLED',
      'message', 'This job has been cancelled'
    );
  END IF;

  -- Check if job is completed
  IF v_job_record.status = 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'code', 'JOB_COMPLETED',
      'message', 'This job has already been completed'
    );
  END IF;

  -- Check if job is in the past
  IF v_job_record.event_date < CURRENT_DATE THEN
    RETURN json_build_object(
      'success', false,
      'code', 'JOB_EXPIRED',
      'message', 'This job has already passed'
    );
  END IF;

  -- Check for existing confirmation
  SELECT id INTO v_existing_confirmation
  FROM job_confirmations
  WHERE job_id = p_job_id
    AND worker_id = p_worker_id
    AND status = 'confirmed';

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'code', 'ALREADY_CONFIRMED',
      'message', 'You have already confirmed this job'
    );
  END IF;

  -- Check if job is full
  IF v_job_record.confirmed_workers >= v_job_record.required_workers THEN
    RETURN json_build_object(
      'success', false,
      'code', 'JOB_FULL',
      'message', 'This job is now full. All positions have been filled.'
    );
  END IF;

  -- All checks passed - insert confirmation
  INSERT INTO job_confirmations (
    job_id,
    worker_id,
    status,
    confirmed_at
  ) VALUES (
    p_job_id,
    p_worker_id,
    'confirmed',
    NOW()
  )
  RETURNING id INTO v_new_confirmation_id;

  -- Update confirmed_workers count
  v_new_confirmed_count := v_job_record.confirmed_workers + 1;

  UPDATE catering_jobs
  SET 
    confirmed_workers = v_new_confirmed_count,
    status = CASE
      WHEN v_new_confirmed_count >= v_job_record.required_workers THEN 'full'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_job_id;

  -- Return success with confirmation details
  RETURN json_build_object(
    'success', true,
    'code', 'CONFIRMED',
    'message', 'Job confirmed successfully',
    'confirmation_id', v_new_confirmation_id,
    'confirmed_workers', v_new_confirmed_count,
    'required_workers', v_job_record.required_workers,
    'is_now_full', v_new_confirmed_count >= v_job_record.required_workers
  );

EXCEPTION
  WHEN unique_violation THEN
    -- This should be caught by the check above, but just in case
    RETURN json_build_object(
      'success', false,
      'code', 'ALREADY_CONFIRMED',
      'message', 'You have already confirmed this job'
    );
  WHEN OTHERS THEN
    -- Generic error handler
    RETURN json_build_object(
      'success', false,
      'code', 'ERROR',
      'message', 'An error occurred while confirming the job: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION confirm_worker_for_job(UUID, UUID) TO authenticated;

-- Add comment to document the function
COMMENT ON FUNCTION confirm_worker_for_job IS 
'Atomically confirm a worker for a job with full vacancy integrity checks. Prevents race conditions when multiple workers try to book the last spot.';

-- ================================================================================
-- Create function to cancel worker confirmation
-- ================================================================================

CREATE OR REPLACE FUNCTION cancel_worker_confirmation(
  p_confirmation_id UUID,
  p_worker_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_confirmation_record RECORD;
  v_job_record RECORD;
BEGIN
  -- Lock the confirmation and job
  SELECT 
    jc.id,
    jc.job_id,
    jc.worker_id,
    jc.status
  INTO v_confirmation_record
  FROM job_confirmations jc
  WHERE jc.id = p_confirmation_id
    AND jc.worker_id = p_worker_id
  FOR UPDATE;

  -- Check if confirmation exists and belongs to this worker
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'code', 'CONFIRMATION_NOT_FOUND',
      'message', 'Confirmation not found or does not belong to you'
    );
  END IF;

  -- Check if already cancelled
  IF v_confirmation_record.status = 'cancelled' THEN
    RETURN json_build_object(
      'success', false,
      'code', 'ALREADY_CANCELLED',
      'message', 'This confirmation has already been cancelled'
    );
  END IF;

  -- Lock the job
  SELECT 
    id,
    status,
    confirmed_workers
  INTO v_job_record
  FROM catering_jobs
  WHERE id = v_confirmation_record.job_id
  FOR UPDATE;

  -- Update confirmation status
  UPDATE job_confirmations
  SET 
    status = 'cancelled',
    cancelled_at = NOW()
  WHERE id = p_confirmation_id;

  -- Decrease confirmed_workers count and update status if needed
  UPDATE catering_jobs
  SET 
    confirmed_workers = GREATEST(0, confirmed_workers - 1),
    status = CASE
      WHEN status = 'full' AND confirmed_workers - 1 < required_workers THEN 'open'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = v_confirmation_record.job_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'code', 'CANCELLED',
    'message', 'Confirmation cancelled successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'code', 'ERROR',
      'message', 'An error occurred while cancelling: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cancel_worker_confirmation(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION cancel_worker_confirmation IS 
'Cancel a worker confirmation and decrement the confirmed_workers count atomically.';

-- ================================================================================
-- END OF MIGRATION
-- ================================================================================
