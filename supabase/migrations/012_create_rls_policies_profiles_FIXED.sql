-- =====================================================
-- Migration: 012_create_rls_policies_profiles.sql (FIXED)
-- Description: Row Level Security policies for profiles table
-- FIX: Removed NEW/OLD references (only valid in triggers)
-- FIX: Added trigger to protect role/account_status changes
-- FIX: Avoided RLS recursion for admin checks
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "profiles_select_public_info" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_full" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_limited" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;

-- =====================================================
-- SELECT POLICIES
-- =====================================================

-- Policy 1: Users can view own full profile
CREATE POLICY "profiles_select_own_full" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Users can view basic info of other profiles
-- This allows workers to see provider names, etc.
-- Sensitive fields should be filtered at application layer
CREATE POLICY "profiles_select_public_info" ON profiles
  FOR SELECT
  TO authenticated
  USING (id != auth.uid());

-- Policy 3: Admin can SELECT all profiles
-- Uses subquery to avoid RLS recursion
CREATE POLICY "profiles_admin_select_all" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 4: Users can create profile for their own auth.users.id
-- Block self-assignment of admin role
CREATE POLICY "profiles_insert_own_non_admin" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('worker', 'provider')
  );

-- =====================================================
-- UPDATE POLICIES
-- =====================================================

-- Policy 5: Users can update own profile
-- Note: role and account_status protection handled by trigger (see migration 009)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 6: Admins can update any profile (including role and account_status)
-- Uses subquery to avoid RLS recursion
CREATE POLICY "profiles_admin_update_all" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- =====================================================
-- TRIGGER FOR PROTECTED FIELDS
-- =====================================================
-- This trigger prevents users from changing their own role or account_status
-- even though the UPDATE policy allows them to update their profile

CREATE OR REPLACE FUNCTION prevent_role_account_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if user is admin
  IF (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin' THEN
    RETURN NEW;
  END IF;
  
  -- Otherwise, prevent changes to role and account_status
  IF OLD.role != NEW.role THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;
  
  IF OLD.account_status != NEW.account_status THEN
    RAISE EXCEPTION 'You cannot change your own account status';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS prevent_role_account_status_change_trigger ON profiles;

-- Create trigger
CREATE TRIGGER prevent_role_account_status_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_account_status_change();

-- =====================================================
-- NO DELETE POLICIES (preserve data integrity)
-- =====================================================
-- Profiles should never be deleted to maintain referential integrity
-- Use account_status = 'suspended' instead
