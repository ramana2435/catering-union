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
