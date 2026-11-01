-- ============================================================================
-- PERMANENT FIX - Correct RLS Policy for Signup
-- ============================================================================
-- The issue: RLS is checking auth.uid() but the user context isn't set properly
-- The fix: Simplify the policy to work with Supabase's auth context
-- ============================================================================

-- Step 1: Enable RLS (if not already)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies completely
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Step 3: Create PERMISSIVE policies (not restrictive)

-- Policy 1: Anyone authenticated can INSERT their own profile during signup
CREATE POLICY "Enable insert for authenticated users during signup"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 2: Users can SELECT their own profile
CREATE POLICY "Enable read access for own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 3: Users can UPDATE their own profile
CREATE POLICY "Enable update for own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Step 4: Grant table permissions to authenticated role
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 5: Verify the setup
SELECT 
  '=== VERIFICATION ===' as info,
  '' as detail
UNION ALL
SELECT 
  'RLS Status' as info,
  CASE WHEN relrowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as detail
FROM pg_class 
WHERE relname = 'profiles'
UNION ALL
SELECT 
  'Policies Created' as info,
  COUNT(*)::text || ' policies' as detail
FROM pg_policies 
WHERE tablename = 'profiles';

-- List all policies
SELECT 
  '=== POLICY DETAILS ===' as section,
  policyname as policy_name,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- ============================================================================
-- This should PERMANENTLY fix the RLS issue
-- The policies are now simplified and match Supabase's auth context
-- ============================================================================
