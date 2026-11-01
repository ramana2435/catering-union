-- ============================================================================
-- QUICK FIX for 401 Signup Error
-- ============================================================================
-- Run this SQL script in your Supabase SQL Editor to fix signup issues
-- This script enables RLS and creates the necessary INSERT policy
-- ============================================================================

-- Step 1: Ensure profiles table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
    RAISE EXCEPTION 'profiles table does not exist! Please run migration 001 first.';
  END IF;
  RAISE NOTICE '✓ profiles table exists';
END $$;

-- Step 2: Create is_admin helper function (if not exists)
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

-- Step 3: Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop conflicting INSERT policies (clean slate)
DROP POLICY IF EXISTS "profiles_insert_signup" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

-- Step 5: Create SELECT policy (required for users to see their own profile)
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Step 6: Create INSERT policy for signup
CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only insert their own profile
    id = auth.uid()
    -- Only worker or provider roles allowed (admin must be assigned via SQL)
    AND role IN ('worker', 'provider')
    -- Only allowed account statuses
    AND (account_status IS NULL OR account_status IN ('active', 'pending_verification'))
  );

-- Step 7: Create UPDATE policy (users can update their own profile)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Step 8: Verify everything is set up correctly
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check RLS is enabled
  SELECT relrowsecurity INTO rls_enabled 
  FROM pg_class 
  WHERE relname = 'profiles';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'profiles';
  
  -- Report results
  IF rls_enabled THEN
    RAISE NOTICE '✓ RLS is ENABLED on profiles table';
  ELSE
    RAISE EXCEPTION '✗ RLS is NOT enabled on profiles table!';
  END IF;
  
  RAISE NOTICE '✓ Total policies on profiles: %', policy_count;
  
  IF policy_count < 3 THEN
    RAISE WARNING 'Expected at least 3 policies, found %', policy_count;
  ELSE
    RAISE NOTICE '✓ All basic policies are in place';
  END IF;
END $$;

-- Step 9: List all policies for verification
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Allows users to view profiles'
    WHEN cmd = 'INSERT' THEN 'Allows signup (profile creation)'
    WHEN cmd = 'UPDATE' THEN 'Allows profile updates'
    ELSE 'Other'
  END as description
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- If you see all the ✓ marks above, your database is ready for signups.
-- 
-- Next step: Try signing up again in your app!
-- ============================================================================

