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
