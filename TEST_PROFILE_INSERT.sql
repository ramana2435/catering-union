-- ============================================================================
-- TEST PROFILE INSERT - Find out why it's failing
-- ============================================================================

-- TEST 1: Check table structure
SELECT 
  '1. TABLE STRUCTURE' as test,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- TEST 2: Check constraints
SELECT 
  '2. CONSTRAINTS' as test,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'profiles';

-- TEST 3: Check CHECK constraints specifically
SELECT 
  '3. CHECK CONSTRAINTS' as test,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c';

-- TEST 4: Try to insert a test profile (will fail if there's an issue)
-- First, create a test auth user manually
DO $$
DECLARE
  test_user_id UUID := 'b45cf966-a5c6-45ed-a896-b656ed07882e'::UUID;
BEGIN
  -- Try to insert a profile
  INSERT INTO profiles (
    id,
    full_name,
    phone_number,
    role,
    preferred_language,
    account_status
  ) VALUES (
    test_user_id,
    'Test User',
    NULL,
    'worker',
    'en',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = 'Test User Updated';
  
  RAISE NOTICE 'SUCCESS: Profile insert worked!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Profile insert failed: %', SQLERRM;
END $$;

-- TEST 5: Check if the test profile exists
SELECT 
  '5. TEST PROFILE EXISTS?' as test,
  COUNT(*) as profile_count
FROM profiles 
WHERE id = 'b45cf966-a5c6-45ed-a896-b656ed07882e'::UUID;

-- TEST 6: Check RLS policies
SELECT 
  '6. RLS POLICIES' as test,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' THEN 'INSERT policy - allows signup'
    WHEN cmd = 'SELECT' THEN 'SELECT policy - allows viewing profile'
    ELSE 'Other'
  END as description
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- TEST 7: Check INSERT policy specifically
SELECT 
  '7. INSERT POLICY DETAILS' as test,
  policyname,
  with_check::text as policy_rule
FROM pg_policies 
WHERE tablename = 'profiles' 
AND cmd = 'INSERT';

-- ============================================================================
-- ANALYSIS
-- ============================================================================
-- Look at the results:
-- - TEST 1: Check if all columns match what the app is sending
-- - TEST 3: Check if CHECK constraints are blocking the insert
-- - TEST 4: Check if manual insert works
-- - TEST 7: Check if the INSERT policy is correct
-- ============================================================================
