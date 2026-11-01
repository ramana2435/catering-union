-- ============================================================================
-- DEBUG SIGNUP - Find the exact problem
-- ============================================================================

-- TEST 1: Can we insert a profile manually?
DO $$
DECLARE
  test_user_id UUID := 'b45cf966-a5c6-45ed-a896-b656ed07882e'::UUID;
BEGIN
  -- Delete if exists
  DELETE FROM profiles WHERE id = test_user_id;
  
  -- Try exact insert that app would do
  INSERT INTO profiles (
    id,
    full_name,
    phone_number,
    role
  ) VALUES (
    test_user_id,
    'Test User',
    NULL,
    'worker'
  );
  
  RAISE NOTICE '✅ Manual insert SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Manual insert FAILED: %', SQLERRM;
END $$;

-- TEST 2: Check if INSERT policy exists
SELECT 
  'INSERT Policy Check' as test,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'INSERT';

-- TEST 3: Check the INSERT policy rule
SELECT 
  'INSERT Policy Rule' as test,
  with_check::text as rule
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'INSERT';

-- TEST 4: Check if RLS is enabled
SELECT 
  'RLS Status' as test,
  CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_class 
WHERE relname = 'profiles';

-- TEST 5: Test as if we're the authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "b45cf966-a5c6-45ed-a896-b656ed07882e", "role": "authenticated"}';

-- Try to insert with RLS
DO $$
BEGIN
  INSERT INTO profiles (
    id,
    full_name,
    role
  ) VALUES (
    'b45cf966-a5c6-45ed-a896-b656ed07882e'::UUID,
    'Test As Authenticated',
    'worker'
  )
  ON CONFLICT (id) DO UPDATE SET full_name = 'Updated';
  
  RAISE NOTICE '✅ INSERT as authenticated user SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ INSERT as authenticated user FAILED: %', SQLERRM;
END $$;

-- Reset role
RESET ROLE;

-- TEST 6: Check what data exists
SELECT 
  'Existing Profiles' as test,
  COUNT(*) as total_profiles
FROM profiles;

-- TEST 7: List all profiles (if any)
SELECT 
  id,
  full_name,
  role,
  account_status,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- Based on the results above, we'll know:
-- - If manual insert works (bypass RLS)
-- - If INSERT policy exists
-- - If RLS is the problem
-- - If inserting as authenticated user works
-- ============================================================================
