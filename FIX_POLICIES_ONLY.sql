-- ============================================================================
-- FIX POLICIES ONLY (Table Already Exists)
-- ============================================================================
-- This script only creates the RLS policies
-- Use this when the profiles table already exists
-- ============================================================================

-- Step 1: Create is_admin helper function (safe to re-run)
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

-- Step 2: Enable RLS (safe to re-run)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies (clean slate)
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

-- Step 4: Create fresh policies

-- SELECT: Users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- SELECT: Admins can view all profiles
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- INSERT: Allow signup (worker/provider only) - THIS IS THE KEY ONE!
CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('worker', 'provider')
    AND (account_status IS NULL OR account_status IN ('active', 'pending_verification'))
  );

-- UPDATE: Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Admins can update any profile
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Step 5: Verify
SELECT 
  '✅ Setup Complete!' as status,
  '' as detail
UNION ALL
SELECT 
  'RLS Status' as status,
  CASE WHEN relrowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as detail
FROM pg_class 
WHERE relname = 'profiles'
UNION ALL
SELECT 
  'Policy Count' as status,
  '✅ ' || COUNT(*)::text || ' policies created' as detail
FROM pg_policies 
WHERE tablename = 'profiles'
UNION ALL
SELECT 
  'Function Status' as status,
  '✅ is_admin() function ready' as detail
WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin');

-- List policies
SELECT 
  '📋 Policy List' as info,
  policyname as policy_name,
  cmd as type
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================================================
-- SUCCESS! You can now signup.
-- Go to your app and try: http://localhost:5174/signup
-- ============================================================================
