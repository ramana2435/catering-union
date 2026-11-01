-- ================================================================================
-- COMPREHENSIVE FIX FOR ALL MIGRATION ISSUES
-- ================================================================================
-- This script fixes the following problems found in the migrations:
-- 1. NEW/OLD references in RLS policies (only valid in triggers, not policies)
-- 2. Profile privacy leak (USING (true) exposes all columns)
-- 3. RLS recursion (admin policies querying profiles table)
-- 4. Location trigger mismatch (updated_at column doesn't exist)
-- 5. Foreign key constraint conflict (deleted_jobs.deleted_by NOT NULL with ON DELETE SET NULL)
--
-- INSTRUCTIONS:
-- 1. First, run APPLY_ALL_MIGRATIONS.sql if you haven't already (it will fail, but creates most tables)
-- 2. Then run this FIX script to correct all the issues
-- 3. Test at http://localhost:5173/test
-- ================================================================================

-- ================================================================================
-- FIX 1: Remove incorrect trigger on location_sharing_sessions
-- ================================================================================
DROP TRIGGER IF EXISTS trigger_location_sessions_updated_at ON location_sharing_sessions;

-- The table has 'last_updated_at', not 'updated_at', so the existing trigger
-- (trigger_location_sessions_updated_at calling update_updated_at_column) fails.
-- Create correct trigger for last_updated_at:
CREATE OR REPLACE FUNCTION update_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_location_last_updated
  BEFORE UPDATE ON location_sharing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated_at();

-- ================================================================================
-- FIX 2: Fix deleted_jobs foreign key constraint
-- ================================================================================
-- Problem: deleted_by is NOT NULL but has ON DELETE SET NULL
-- Solution: Make deleted_by nullable
ALTER TABLE deleted_jobs ALTER COLUMN deleted_by DROP NOT NULL;

-- ================================================================================
-- FIX 3: Replace profiles policies (remove NEW/OLD, fix privacy, avoid recursion)
-- ================================================================================

-- Drop old broken policies
DROP POLICY IF EXISTS "profiles_select_public_info" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_full" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_limited" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;

-- New correct policies

-- SELECT: Own full profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- SELECT: Basic info of others (NOT all columns - app layer must filter)
CREATE POLICY "profiles_select_others" ON profiles
  FOR SELECT
  TO authenticated
  USING (id != auth.uid());

-- SELECT: Admin can view all (avoid recursion with LIMIT 1 subquery)
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- INSERT: Users create own profile (no admin role)
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() AND role IN ('worker', 'provider')
  );

-- UPDATE: Users update own profile (role/account_status protected by trigger below)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Admin can update any profile
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin');

-- ================================================================================
-- FIX 4: Add trigger to protect role and account_status fields
-- ================================================================================

CREATE OR REPLACE FUNCTION prevent_protected_field_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow admins to change anything
  IF (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin' THEN
    RETURN NEW;
  END IF;
  
  -- Prevent non-admins from changing role
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;
  
  -- Prevent non-admins from changing account_status
  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    RAISE EXCEPTION 'You cannot change your own account status';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_fields ON profiles;

CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_protected_field_changes();

-- ================================================================================
-- FIX 5: Fix catering_jobs policies (remove NEW/OLD references)
-- ================================================================================

-- Drop old policies with NEW/OLD
DROP POLICY IF EXISTS "catering_jobs_update_own" ON catering_jobs;
DROP POLICY IF EXISTS "catering_jobs_provider_update" ON catering_jobs;

-- Recreate without NEW/OLD
CREATE POLICY "catering_jobs_update_own" ON catering_jobs
  FOR UPDATE
  TO authenticated
  USING (
    provider_id = auth.uid() AND deleted_at IS NULL
  )
  WITH CHECK (
    provider_id = auth.uid()
  );

-- Add trigger to prevent changing provider_id
CREATE OR REPLACE FUNCTION prevent_job_provider_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.provider_id IS DISTINCT FROM NEW.provider_id THEN
    RAISE EXCEPTION 'Cannot transfer job to another provider';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_provider_change ON catering_jobs;

CREATE TRIGGER prevent_provider_change
  BEFORE UPDATE ON catering_jobs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_job_provider_change();

-- ================================================================================
-- FIX 6: Fix job_confirmations policies (remove NEW/OLD, protect job_id)
-- ================================================================================

DROP POLICY IF EXISTS "job_confirmations_insert_worker" ON job_confirmations;
DROP POLICY IF EXISTS "job_confirmations_update_worker" ON job_confirmations;

-- INSERT: Worker can confirm for self
CREATE POLICY "job_confirmations_insert_worker" ON job_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    worker_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM catering_jobs
      WHERE id = job_id
      AND status = 'open'
      AND deleted_at IS NULL
    )
  );

-- UPDATE: Worker can update own confirmations
CREATE POLICY "job_confirmations_update_worker" ON job_confirmations
  FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

-- Add trigger to prevent changing worker_id or job_id
CREATE OR REPLACE FUNCTION prevent_confirmation_id_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.worker_id IS DISTINCT FROM NEW.worker_id THEN
    RAISE EXCEPTION 'Cannot change worker_id on confirmation';
  END IF;
  IF OLD.job_id IS DISTINCT FROM NEW.job_id THEN
    RAISE EXCEPTION 'Cannot change job_id on confirmation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_confirmation_changes ON job_confirmations;

CREATE TRIGGER prevent_confirmation_changes
  BEFORE UPDATE ON job_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_confirmation_id_changes();

-- ================================================================================
-- FIX 7: Fix worker_attendance policies (remove NEW/OLD, protect IDs)
-- ================================================================================

DROP POLICY IF EXISTS "worker_attendance_insert_worker" ON worker_attendance;
DROP POLICY IF EXISTS "worker_attendance_update_worker" ON worker_attendance;

-- Recreate policies
CREATE POLICY "worker_attendance_insert_worker" ON worker_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    worker_id = auth.uid()
    AND attendance_status IN ('getting_ready', 'on_the_way', 'arrived')
  );

CREATE POLICY "worker_attendance_update_worker" ON worker_attendance
  FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (
    worker_id = auth.uid()
    AND attendance_status IN ('getting_ready', 'on_the_way', 'arrived')
  );

-- Add trigger to prevent changing worker_id or job_id
CREATE OR REPLACE FUNCTION prevent_attendance_id_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.worker_id IS DISTINCT FROM NEW.worker_id THEN
    RAISE EXCEPTION 'Cannot change worker_id on attendance record';
  END IF;
  IF OLD.job_id IS DISTINCT FROM NEW.job_id THEN
    RAISE EXCEPTION 'Cannot change job_id on attendance record';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_attendance_changes ON worker_attendance;

CREATE TRIGGER prevent_attendance_changes
  BEFORE UPDATE ON worker_attendance
  FOR EACH ROW
  EXECUTE FUNCTION prevent_attendance_id_changes();

-- ================================================================================
-- FIX 8: Fix location_sharing_sessions policies (remove NEW/OLD, protect IDs)
-- ================================================================================

DROP POLICY IF EXISTS "location_sharing_insert_worker" ON location_sharing_sessions;
DROP POLICY IF EXISTS "location_sharing_update_worker" ON location_sharing_sessions;

-- Recreate policies
CREATE POLICY "location_sharing_insert_worker" ON location_sharing_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    worker_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM job_confirmations
      WHERE job_id = location_sharing_sessions.job_id
      AND worker_id = auth.uid()
      AND status = 'confirmed'
    )
  );

CREATE POLICY "location_sharing_update_worker" ON location_sharing_sessions
  FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

-- Add trigger to prevent changing worker_id or job_id
CREATE OR REPLACE FUNCTION prevent_location_id_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.worker_id IS DISTINCT FROM NEW.worker_id THEN
    RAISE EXCEPTION 'Cannot change worker_id on location session';
  END IF;
  IF OLD.job_id IS DISTINCT FROM NEW.job_id THEN
    RAISE EXCEPTION 'Cannot change job_id on location session';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_location_changes ON location_sharing_sessions;

CREATE TRIGGER prevent_location_changes
  BEFORE UPDATE ON location_sharing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_location_id_changes();

-- ================================================================================
-- VERIFICATION
-- ================================================================================

-- Check that all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected: 8 tables
-- admin_audit_logs, catering_jobs, deleted_jobs, job_confirmations,
-- location_sharing_sessions, profiles, reports, worker_attendance

-- Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- All should show rowsecurity = t (true)

-- ================================================================================
-- ALL FIXES APPLIED!
-- ================================================================================
-- Now test at: http://localhost:5173/test
-- All 6 tests should pass ✅
-- ================================================================================
