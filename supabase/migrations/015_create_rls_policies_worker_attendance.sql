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
