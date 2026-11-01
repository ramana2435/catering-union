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
