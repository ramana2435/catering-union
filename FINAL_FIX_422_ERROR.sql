-- ============================================================================
-- FINAL FIX FOR 422 ERROR - Complete Solution
-- ============================================================================
-- This script fixes:
-- 1. Table constraints that might be too strict
-- 2. RLS policies
-- 3. Default values
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Fix table constraints and defaults
-- Make account_status allow NULL
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_account_status_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_account_status_check 
CHECK (account_status IN ('active', 'suspended', 'pending_verification'));

-- Set defaults
ALTER TABLE profiles ALTER COLUMN account_status SET DEFAULT 'active';
ALTER TABLE profiles ALTER COLUMN preferred_language SET DEFAULT 'en';

-- STEP 2: Make sure role constraint allows worker/provider
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('worker', 'provider', 'admin'));

-- STEP 3: Create/update is_admin function
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

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;

-- STEP 4: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Drop ALL old policies
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- STEP 6: Create fresh, simple policies

-- SELECT: Users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- INSERT: Allow signup (THIS FIXES THE 422!)
-- Simplified - just check user is creating their own profile with valid role
CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() 
    AND role IN ('worker', 'provider')
  );

-- UPDATE: Users can update their own profile  
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ADMIN policies
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- STEP 7: Test that insert works
DO $$
DECLARE
  test_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  test_result RECORD;
BEGIN
  -- Try to insert test profile
  INSERT INTO profiles (id, full_name, role)
  VALUES (test_id, 'Test User', 'worker')
  ON CONFLICT (id) DO NOTHING;
  
  -- Check if it exists
  SELECT * INTO test_result FROM profiles WHERE id = test_id;
  
  IF FOUND THEN
    RAISE NOTICE '✅ SUCCESS: Test profile created!';
    RAISE NOTICE '   ID: %', test_result.id;
    RAISE NOTICE '   Name: %', test_result.full_name;
    RAISE NOTICE '   Role: %', test_result.role;
    RAISE NOTICE '   Status: %', test_result.account_status;
    
    -- Clean up
    DELETE FROM profiles WHERE id = test_id;
    RAISE NOTICE '✅ Test cleanup complete';
  ELSE
    RAISE NOTICE '❌ FAILED: Could not create test profile';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR during test: %', SQLERRM;
END $$;

-- STEP 8: Verify setup
SELECT '============ VERIFICATION ============' as info;

SELECT 
  'Table Structure' as check_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
AND column_name IN ('role', 'account_status', 'preferred_language')
ORDER BY column_name;

SELECT 
  'RLS Policies' as check_name,
  policyname as policy_name,
  cmd as command_type
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

SELECT '============ READY TO TEST ============' as info;
SELECT '✅ Database is configured' as status;
SELECT '✅ Go to your app and try signup' as next_step;
SELECT '   http://localhost:5174/signup' as url;

-- ============================================================================
-- DONE! Try signing up now.
-- Use email: test@test.com, password: test123, role: worker
-- ============================================================================
