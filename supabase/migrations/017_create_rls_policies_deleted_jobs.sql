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
