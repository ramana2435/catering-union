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
