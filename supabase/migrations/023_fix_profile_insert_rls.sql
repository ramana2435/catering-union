-- Migration 023: Fix profile INSERT RLS policy for signup
-- Issue: 401 error when creating profile during signup
-- Root cause: RLS policy may be overly restrictive or is_admin() function causing issues

-- First, ensure the is_admin function is properly set up
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id LIMIT 1;
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;

-- Temporarily disable RLS to update policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "profiles_insert_signup" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create a simple INSERT policy for signup
-- This policy allows authenticated users to create their own profile
CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only insert their own profile
    id = auth.uid()
    -- Only worker or provider roles allowed
    AND role IN ('worker', 'provider')
    -- Only allowed account statuses
    AND (account_status IS NULL OR account_status IN ('active', 'pending_verification'))
  );

-- Add a comment
COMMENT ON POLICY "profiles_insert_signup" ON profiles IS 
  'Allows authenticated users to create their own profile during signup with worker or provider role only';

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles') THEN
    RAISE NOTICE 'WARNING: RLS is not enabled on profiles table!';
  ELSE
    RAISE NOTICE 'SUCCESS: RLS is enabled on profiles table';
  END IF;
END $$;

