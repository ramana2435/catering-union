-- Migration 021: Fix RLS policies using helper function to avoid recursion
-- This solves the 500 errors during signup and login

-- Create a helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_signup" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_full" ON profiles;
DROP POLICY IF EXISTS "profiles_select_public_info" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Admins can view all profiles
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Policy 3: Allow profile creation during signup (worker/provider only)
CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('worker', 'provider')
    AND account_status IN ('active', 'pending_verification')
  );

-- Policy 4: Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 5: Admins can update any profile
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Add comment
COMMENT ON FUNCTION is_admin(UUID) IS 'Helper function to check if a user is an admin. Used by RLS policies to avoid recursion.';
