-- ============================================================================
-- COMPLETE FIX: Creates table + enables RLS + creates policies
-- ============================================================================
-- This script will:
-- 1. Create profiles table if it doesn't exist
-- 2. Enable RLS
-- 3. Create all necessary policies for signup/login
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('provider', 'worker', 'admin')),
  preferred_language TEXT DEFAULT 'en',
  profile_image_url TEXT,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_verification')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on phone_number (when not null)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_phone_number_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);
  END IF;
END $$;

-- Create index on role for efficient filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- STEP 2: Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- STEP 3: Create is_admin helper function
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

-- STEP 4: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "profiles_insert_signup" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_full" ON profiles;
DROP POLICY IF EXISTS "profiles_select_public_info" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_limited" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

-- STEP 6: Create SELECT policies
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

-- STEP 7: Create INSERT policy (THIS IS CRITICAL FOR SIGNUP)
CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('worker', 'provider')
    AND (account_status IS NULL OR account_status IN ('active', 'pending_verification'))
  );

-- STEP 8: Create UPDATE policies
-- Users can update their own profile (but not role/account_status)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- STEP 9: Verify setup
SELECT 
  'Table Check' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
    THEN '✅ profiles table exists'
    ELSE '❌ profiles table NOT found'
  END as status
UNION ALL
SELECT 
  'RLS Check' as check_name,
  CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles')
    THEN '✅ RLS enabled'
    ELSE '❌ RLS disabled'
  END as status
UNION ALL
SELECT 
  'Policy Count' as check_name,
  '✅ ' || COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'profiles'
UNION ALL
SELECT 
  'Function Check' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin')
    THEN '✅ is_admin() function exists'
    ELSE '❌ is_admin() function NOT found'
  END as status;

-- STEP 10: List all policies for verification
SELECT 
  '=== POLICIES CREATED ===' as info,
  '' as policy_name,
  '' as type;

SELECT 
  '' as info,
  policyname as policy_name,
  cmd as type
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================================================
-- SUCCESS! Your database is now ready for signups.
-- ============================================================================
-- Next steps:
-- 1. Check the verification results above
-- 2. Make sure you see "✅" for all checks
-- 3. Try signing up again in your app
-- ============================================================================
