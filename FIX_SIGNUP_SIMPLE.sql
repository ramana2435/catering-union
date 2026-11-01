-- ============================================================================
-- SIMPLE FIX for 401 Signup Error
-- ============================================================================
-- This is a simplified version without RAISE statements
-- Run this in Supabase SQL Editor to enable signups
-- ============================================================================

-- Create is_admin helper function
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "profiles_insert_signup" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Create SELECT policy
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Create INSERT policy (THIS IS THE KEY ONE FOR SIGNUP)
CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('worker', 'provider')
    AND (account_status IS NULL OR account_status IN ('active', 'pending_verification'))
  );

-- Create UPDATE policy
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Verify (this will show you the results)
SELECT 
  'RLS Status' as check_type,
  CASE WHEN relrowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as status
FROM pg_class 
WHERE relname = 'profiles'
UNION ALL
SELECT 
  'Policy Count' as check_type,
  COUNT(*)::text || ' policies' as status
FROM pg_policies 
WHERE tablename = 'profiles';

-- List all policies
SELECT 
  policyname,
  cmd as policy_type,
  CASE cmd
    WHEN 'SELECT' THEN '✓ Users can view their profile'
    WHEN 'INSERT' THEN '✓ Users can create profile (SIGNUP)'
    WHEN 'UPDATE' THEN '✓ Users can update their profile'
    ELSE 'Other'
  END as description
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;
