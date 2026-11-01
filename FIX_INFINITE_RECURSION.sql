-- ============================================================================
-- FIX INFINITE RECURSION ERROR IN RLS POLICIES
-- ============================================================================
-- Error: "infinite recursion detected in policy for relation profiles"
-- This happens when policies check the profiles table while querying profiles
-- ============================================================================

-- Step 1: Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Step 2: Disable RLS on profiles (safest for now)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
SELECT 
  tablename, 
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '🔒 ENABLED'
    ELSE '🔓 DISABLED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- ============================================================================
-- EXPLANATION OF THE PROBLEM
-- ============================================================================
-- The "Admins can view all profiles" policy was:
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles  <-- This queries profiles while inside a profiles query!
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   )
-- 
-- This creates infinite recursion:
--   1. User tries to read from profiles
--   2. Policy checks: "Is this user an admin?"
--   3. To check admin, it queries profiles table
--   4. That query triggers the policy again
--   5. Which checks profiles again
--   6. INFINITE LOOP!
-- ============================================================================

-- ============================================================================
-- SOLUTION: Keep RLS DISABLED for local testing
-- ============================================================================
-- The profiles table is special - it can't reference itself in policies
-- For production, we need more complex solutions:
--   1. Use a separate admin_roles table
--   2. Use Supabase custom claims
--   3. Use database functions with SECURITY DEFINER
--   4. Cache role in auth.jwt() claims
-- 
-- For now: Keep RLS disabled as we were doing before
-- ============================================================================
