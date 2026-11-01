-- ============================================================================
-- FIX PROFILE DEFAULTS - Ensure table accepts the data
-- ============================================================================

-- Step 1: Make account_status truly optional by allowing NULL in CHECK constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_account_status_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_account_status_check 
CHECK (account_status IS NULL OR account_status IN ('active', 'suspended', 'pending_verification'));

-- Step 2: Set default value for account_status
ALTER TABLE profiles 
ALTER COLUMN account_status SET DEFAULT 'active';

-- Step 3: Set default for preferred_language (if not already set)
ALTER TABLE profiles 
ALTER COLUMN preferred_language SET DEFAULT 'en';

-- Step 4: Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
AND column_name IN ('account_status', 'preferred_language', 'role');

-- Step 5: Test insert with minimal data (what the app sends)
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  -- This mimics what your app is sending
  INSERT INTO profiles (
    id,
    full_name,
    phone_number,
    role
  ) VALUES (
    test_id,
    'Test Worker',
    NULL,
    'worker'
  );
  
  -- Check if it was inserted
  IF EXISTS (SELECT 1 FROM profiles WHERE id = test_id) THEN
    RAISE NOTICE '✅ SUCCESS: Profile with minimal data inserted!';
    -- Clean up test data
    DELETE FROM profiles WHERE id = test_id;
  ELSE
    RAISE NOTICE '❌ FAILED: Profile was not inserted';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
END $$;

-- ============================================================================
-- This should fix the 422 error by making the table more lenient
-- ============================================================================
